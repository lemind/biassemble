import { runJob } from "@/lib/jobs";
import { runIntegrationTest } from "@/lib/jobs/reflection-integration-test";
import type { JobType } from "@/lib/jobs/types";
import { inngest, jobEventName } from "./inngest-client";

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
      const result = await runIntegrationTest();
      if (!result.passed) {
        const failures = result.steps.filter((s) => !s.ok).map((s) => `  ✗ ${s.name}: ${s.detail}`).join("\n");
        throw new Error(`Integration test FAILED:\n${failures}`);
      }
      return result;
    }
  ),
];
