import { runJob } from "@/lib/jobs";
import type { JobType } from "@/lib/jobs/types";
import { inngest, jobEventName } from "./inngest-client";
import { runReflectionFlow } from "@/lib/tests/reflection-flow";

function createJobFunction(jobType: JobType) {
  return inngest.createFunction(
    { id: jobType },
    { event: jobEventName(jobType) },
    async ({ event }) => {
      await runJob(jobType, event.data);
    }
  );
}

/** Registered with serve() in app/api/inngest/route.ts only. */
export const inngestFunctions = [
  createJobFunction("generate-questions"),
  createJobFunction("generate-assessment"),
  inngest.createFunction(
    { id: "integration-test" },
    { event: "biassemble/integration-test" },
    async ({ step }) => {
      const BASE_URL = process.env.SELF_BASE_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://127.0.0.1:3000";

      const result = await runReflectionFlow(BASE_URL);
      if (!result.passed) {
        const failures = result.steps
          .filter((s) => !s.ok)
          .map((s) => `  ✗ ${s.name}: ${s.detail}`)
          .join("\n");
        throw new Error(`Integration test FAILED:\n${failures}`);
      }
      return result;
    }
  ),
];