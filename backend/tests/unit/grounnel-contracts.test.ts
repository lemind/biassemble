import { describe, it, expect } from "vitest";
import { grounnelStatusResponseSchema, sharedAssessmentSchema } from "@/lib/ai/contracts";
import { createDevMockClient } from "@/lib/ai/dev-mock-client";

// parseJsonFromAi THROWS (502) on an unknown verdict, failing the whole poll — not just one claim.

function statusResponseWithVerdict(verdict: string): Record<string, unknown> {
  return {
    id: "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
    status: "done",
    progress: { checked: 1, total: 1 },
    claims: [
      {
        id: "claim-1",
        text: "Yesterday I felt exhausted after gardening.",
        status: "done",
        verdict,
        evidence: null,
        confidence: null,
        reason: "This describes a private, personal circumstance.",
        sources: [],
      },
    ],
    score: {
      grounded_pct: 0,
      grounded_n: 0,
      unclear_n: 0,
      no_evidence_n: 0,
      contradicted_n: 0,
      not_checked_n: 1,
      eligible: 0,
    },
    caps_hit: false,
    started_at: "2026-08-27T05:41:13.420Z",
    elapsed_seconds: 4,
  };
}

describe("grounnelStatusResponseSchema — verdict enum parity with Core", () => {
  it("accepts 'excluded' — Core ships it, and rejecting it 502s the whole poll", () => {
    const result = grounnelStatusResponseSchema.safeParse(statusResponseWithVerdict("excluded"));
    expect(result.success).toBe(true);
  });

  it.each(["supported", "partially_supported", "unsupported", "contradicted", "unverifiable"])(
    "still accepts the pre-existing verdict %s",
    (verdict) => {
      expect(grounnelStatusResponseSchema.safeParse(statusResponseWithVerdict(verdict)).success).toBe(true);
    }
  );

  it("still rejects a verdict Core does not ship — this enum is a real guard, not a passthrough", () => {
    expect(grounnelStatusResponseSchema.safeParse(statusResponseWithVerdict("definitely_true")).success).toBe(false);
  });
});

describe("dev-mock client satisfies the same contract the real client is validated against", () => {
  it("produces a terminal status that parses, including its excluded claim", async () => {
    const client = createDevMockClient();
    const { id } = await client.extractClaims({
      sessionId: "3f2504e0-4f89-11d3-9a0c-0305e82c3302",
      text: "irrelevant — the mock ignores input",
    });

    // The mock reports "extracting"/"verifying" before "done" so in-flight UI is testable; poll to
    // the terminal state, where the claims actually exist.
    let status = await client.getGrounnelStatus(id);
    for (let i = 0; i < 5 && status.status !== "done"; i++) {
      status = await client.getGrounnelStatus(id);
    }
    expect(status.status).toBe("done");

    const result = grounnelStatusResponseSchema.safeParse(status);
    expect(result.success).toBe(true);
    // The point of the mock claim added with T16: without it the "Not checked" UI is unreachable
    // in dev-mock mode, so nobody can verify that rendering path without spending live API quota.
    expect(status.claims.some((claim) => claim.verdict === "excluded")).toBe(true);
    // The point of the mock claim added with T23 (D032 §12 Finding A): a citation-less `supported`
    // claim exercises the sourcesUncited path without spending live API quota.
    expect(status.claims.some((claim) => claim.verdict === "supported" && claim.citations.length === 0 && claim.sources.length > 0)).toBe(true);
  });
});

describe("provider on status and share (T2012)", () => {
  it("keeps a known provider and drops key_source", () => {
    const parsed = grounnelStatusResponseSchema.parse({
      ...statusResponseWithVerdict("supported"),
      provider: "deepseek",
      model: "deepseek-flash",
      key_source: "own",
    });
    expect(parsed.provider).toBe("deepseek");
    expect(parsed.model).toBe("deepseek-flash");
    expect(parsed).not.toHaveProperty("key_source");
  });

  it("still accepts a core response that has no provider yet", () => {
    const parsed = grounnelStatusResponseSchema.parse(statusResponseWithVerdict("supported"));
    expect(parsed.provider).toBeUndefined();
  });

  it("rejects an unknown provider instead of passing the raw string through", () => {
    const parsed = grounnelStatusResponseSchema.safeParse({
      ...statusResponseWithVerdict("supported"),
      provider: "sk-pasted-into-provider-slot",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts the same provider fields on a shared assessment", () => {
    const parsed = sharedAssessmentSchema.parse({
      status: "done",
      text: "A short article.",
      claims: [],
      createdAt: "2026-09-09T00:00:00.000Z",
      completedAt: "2026-09-09T00:03:20.000Z",
      provider: "qwen",
      model: "qwen3.7-flash",
      key_source: "site",
    });
    expect(parsed.provider).toBe("qwen");
    expect(parsed).not.toHaveProperty("key_source");
  });
});

describe("ownKeyTokens (T2018)", () => {
  it("accepts the optional totals, null, and a core that omits the field", () => {
    const withTotals = grounnelStatusResponseSchema.parse({
      ...statusResponseWithVerdict("supported"),
      ownKeyTokens: { input: 58786, output: 1200 },
    });
    expect(withTotals.ownKeyTokens).toEqual({ input: 58786, output: 1200 });

    const sitePaid = grounnelStatusResponseSchema.parse({
      ...statusResponseWithVerdict("supported"),
      ownKeyTokens: null,
      key_source: "site",
    });
    expect(sitePaid.ownKeyTokens).toBeNull();
    expect(sitePaid).not.toHaveProperty("key_source");

    const older = grounnelStatusResponseSchema.parse(statusResponseWithVerdict("supported"));
    expect(older.ownKeyTokens).toBeUndefined();

    expect(grounnelStatusResponseSchema.safeParse({
      ...statusResponseWithVerdict("supported"),
      ownKeyTokens: { input: -1, output: 1 },
    }).success).toBe(false);

    const shared = sharedAssessmentSchema.parse({
      status: "done",
      text: "A short article.",
      claims: [],
      createdAt: "2026-09-09T00:00:00.000Z",
      completedAt: "2026-09-09T00:03:20.000Z",
      ownKeyTokens: { input: 10, output: 2 },
    });
    expect(shared.ownKeyTokens).toEqual({ input: 10, output: 2 });
    expect(sharedAssessmentSchema.parse({
      status: "done",
      text: "A short article.",
      claims: [],
      createdAt: "2026-09-09T00:00:00.000Z",
      completedAt: null,
      ownKeyTokens: null,
    }).ownKeyTokens).toBeNull();
  });
});
