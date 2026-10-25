import { afterEach, describe, expect, it, vi } from "vitest";
import { createCoreClient } from "@/lib/ai/core-client";
import { AppException } from "@/lib/errors";
import { CORS_ALLOW_HEADERS, ownKeyForwardHeaders, safeProviderMessage } from "@/lib/ai/own-key";

const KEY = "sk-pasted-into-provider-slot";

describe("own-key forwarding (T2014)", () => {
  it("allows the provider headers on CORS and forwards them beside an article body", () => {
    expect(CORS_ALLOW_HEADERS).toContain("X-Grounnel-Provider");
    expect(CORS_ALLOW_HEADERS).toContain("X-Grounnel-Provider-Key");
    const headers = ownKeyForwardHeaders("qwen", `  ${KEY}  `);
    const body = { text: "Some pasted article text.", sessionId: "11111111-1111-4111-8111-111111111111" };
    expect(headers).toEqual({
      "X-Grounnel-Provider": "qwen",
      "X-Grounnel-Provider-Key": KEY,
    });
    expect(JSON.stringify(body)).not.toContain(KEY);
  });

  it("omits the headers when there is no key, so the check stays on site Gemini", () => {
    expect(ownKeyForwardHeaders("deepseek", "   ")).toEqual({});
    expect(ownKeyForwardHeaders(null, null)).toEqual({});
  });

  it("shows a rejected Gemini key as an authentication error and drops the raw body", () => {
    const body = JSON.stringify({
      error: "invalid_key",
      message: `API key not valid. ${KEY}`,
    });
    expect(safeProviderMessage(body)).toBe("The API key was rejected.");
    expect(safeProviderMessage(body)).not.toContain(KEY);
  });

  it("keeps a short rate-limit sentence and replaces one that contains a key", () => {
    expect(safeProviderMessage(JSON.stringify({
      error: "rate_limited",
      message: "Too many requests. Please try again later.",
    }))).toBe("Too many requests. Please try again later.");
    expect(safeProviderMessage(JSON.stringify({
      error: "no_balance",
      message: `balance ${KEY}`,
    }))).toBe("The account has no balance for this model.");
  });
});

describe("core error forwarding", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.AI_CORE_BASE_URL;
    delete process.env.AI_CORE_API_KEY;
  });

  function coreClient(): ReturnType<typeof createCoreClient> {
    process.env.AI_CORE_BASE_URL = "https://core.test";
    process.env.AI_CORE_API_KEY = "test-core-key";
    return createCoreClient();
  }

  function fail(status: number, body: string): void {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(body, { status })));
  }

  it("scrubs a non-category error so the message and details do not contain the key", async () => {
    const leaked = "sk-ABC123DEF456";
    fail(500, JSON.stringify({ error: `API key ${leaked} not valid` }));
    const client = coreClient();
    const posted = await client.generateQuestion({ sessionId: "s", story: "text" }).catch((err: unknown) => err);
    const fetched = await client.getGrounnelStatus("11111111-1111-4111-8111-111111111111").catch((err: unknown) => err);
    for (const error of [posted, fetched]) {
      expect(error).toBeInstanceOf(AppException);
      const thrown = error as AppException;
      expect(thrown.statusCode).toBe(502);
      expect(JSON.stringify({ message: thrown.message, details: thrown.details })).not.toContain(leaked);
      expect(JSON.stringify({ message: thrown.message, details: thrown.details })).not.toMatch(/sk-/);
    }
  });

  it("keeps core's own rate_limited body on the 502 path unless a visitor key was sent", async () => {
    const body = JSON.stringify({ error: "rate_limited" });
    const client = coreClient();
    fail(429, body);
    const reflection = await client.generateQuestion({ sessionId: "s", story: "text" }).catch((err: unknown) => err);
    expect(reflection).toBeInstanceOf(AppException);
    expect((reflection as AppException).statusCode).toBe(502);
    expect((reflection as AppException).message).toBe("rate_limited");

    fail(429, body);
    const siteExtract = await client.extractClaims({ sessionId: "s", text: "article" }).catch((err: unknown) => err);
    expect((siteExtract as AppException).statusCode).toBe(502);
    expect((siteExtract as AppException).message).toBe("rate_limited");

    fail(429, body);
    const ownKey = await client.extractClaims({
      sessionId: "s",
      text: "article",
      provider: "deepseek",
      providerKey: "sk-visitor-key-value",
    }).catch((err: unknown) => err);
    expect(ownKey).toBeInstanceOf(AppException);
    expect((ownKey as AppException).statusCode).toBe(429);
    expect((ownKey as AppException).message).toBe("The provider rate limit stopped this check.");
    expect((ownKey as AppException).details).toBeUndefined();
  });
});
