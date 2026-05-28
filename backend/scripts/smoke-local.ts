/**
 * smoke-local — runs the smoke E2E flow directly (no Inngest).
 *
 * Usage: pnpm smoke:local
 * Requires local backend + Core running on http://localhost:3000
 */

import { runSmokeE2e } from "../src/lib/jobs/smoke-e2e";

async function main() {
  console.log("Smoke E2E — local run\n");
  const result = await runSmokeE2e();

  for (const s of result.steps) {
    const icon = s.ok ? "✓" : "✗";
    console.log(`  ${icon} ${s.name}${s.detail ? ` — ${s.detail}` : ""}`);
  }

  console.log(`\n${result.passed ? "✓ SMOKE PASSED" : "✗ SMOKE FAILED"}`);
  process.exit(result.passed ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});