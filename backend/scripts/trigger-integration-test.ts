/**
 * Trigger the Inngest integration test by sending an event to Inngest Cloud.
 *
 * Usage: pnpm test:integration:trigger
 *
 * Requires: INNGEST_EVENT_KEY env var (set via Vercel env or .env.local)
 *
 * The actual test logic is in src/lib/workflow/inngest-functions.ts
 * as the "integration-test" Inngest function.
 */

import { inngest, jobEventName } from "../src/lib/workflow/inngest-client";

async function main() {
  const eventName = "biassemble/integration-test";

  console.log(`Sending ${eventName} event...`);

  const result = await inngest.send({
    name: eventName,
    data: { triggeredAt: new Date().toISOString() },
  });

  console.log(`✓ Integration test triggered: ${result.ids.join(", ")}`);
}

main().catch((err) => {
  console.error("Failed to trigger integration test:", err.message || err);
  process.exit(1);
});