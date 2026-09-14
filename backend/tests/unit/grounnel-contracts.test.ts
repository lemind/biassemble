import { describe, it, expect } from "vitest";
import { grounnelStatusResponseSchema } from "@/lib/ai/contracts";
import { createDevMockClient } from "@/lib/ai/dev-mock-client";

// parseJsonFromAi THROWS (502) on an unknown verdict, failing the whole poll — not just one claim.

function statusResponseWithVerdict(verdict: string): unknown {
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
