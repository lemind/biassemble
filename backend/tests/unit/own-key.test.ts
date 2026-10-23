import { describe, expect, it } from "vitest";
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
