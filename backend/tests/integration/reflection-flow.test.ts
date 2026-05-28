/**
 * Integration test — full reflection flow via public API.
 *
 * Run: pnpm test:integration
 * Requires: backend running on http://127.0.0.1:3000 (dev-mock mode is fine)
 *
 * This replaces the old smoke-e2e custom script.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { runReflectionFlow } from "@/lib/tests/reflection-flow";

const BASE_URL = process.env.SELF_BASE_URL || "http://127.0.0.1:3000";

describe("Reflection flow", () => {
  beforeAll(async () => {
    const res = await fetch(`${BASE_URL}/api`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Backend not reachable at ${BASE_URL}/api`);
  });

  it("full flow passes all steps", async () => {
    const result = await runReflectionFlow(BASE_URL);

    for (const step of result.steps) {
      if (!step.ok) {
        console.error(`  ✗ ${step.name}: ${step.detail}`);
      }
    }

    expect(result.passed).toBe(true);
    expect(result.steps.length).toBeGreaterThanOrEqual(5);
  });
});
