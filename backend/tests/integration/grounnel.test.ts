/**
 * Integration test — Grounnel extract/status flow via the public API.
 *
 * Run: pnpm test:integration:grounnel
 * Requires: backend running on http://127.0.0.1:3000 with AI_CLIENT_MODE=dev-mock
 *
 * Mirrors tests/integration/reflection-flow.test.ts's shape for this feature.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { runGrounnelFlow } from "@/lib/tests/grounnel-flow";

const BASE_URL = process.env.SELF_BASE_URL || "http://127.0.0.1:3000";

describe("Grounnel extract/status flow", () => {
  beforeAll(async () => {
    const res = await fetch(`${BASE_URL}/api`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Backend not reachable at ${BASE_URL}/api`);
  });

  it("rejects empty text, accepts valid text, and returns a pollable status", async () => {
    const result = await runGrounnelFlow(BASE_URL);

    for (const step of result.steps) {
      if (!step.ok) {
        console.error(`  ✗ ${step.name}: ${step.detail}`);
      }
    }

    expect(result.passed).toBe(true);
    expect(result.steps.length).toBe(3);
  });
});
