/**
 * Integration test — runs the full reflection flow directly (no Inngest).
 *
 * Usage: pnpm test:integration
 * Requires local backend running on http://localhost:3000
 */

import { runIntegrationTest } from "../src/lib/jobs/reflection-integration-test";

async function main() {
  console.log("Integration Test — reflection flow\n");
  const result = await runIntegrationTest();

  for (const s of result.steps) {
    const icon = s.ok ? "✓" : "✗";
    console.log(`  ${icon} ${s.name}${s.detail ? ` — ${s.detail}` : ""}`);
  }

  console.log(`\n${result.passed ? "✓ INTEGRATION TEST PASSED" : "✗ INTEGRATION TEST FAILED"}`);
  process.exit(result.passed ? 0 : 1);
}

main().catch((err) => {
  const message = err instanceof Error ? `${err.message}\n${err.cause || ""}` : String(err);
  console.error("Fatal error:", message);
  process.exit(1);
});
