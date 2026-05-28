import { runJob } from "@/lib/jobs";
import { runSmokeE2e } from "@/lib/jobs/smoke-e2e";
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
    { id: "smoke-e2e" },
    { event: "biassemble/smoke-e2e" },
    async ({ step }) => {
      const result = await runSmokeE2e();
      if (!result.passed) {
        const failures = result.steps.filter((s) => !s.ok).map((s) => `  ✗ ${s.name}: ${s.detail}`).join("\n");
        throw new Error(`Smoke E2E FAILED:\n${failures}`);
      }
      return result;
    }
  ),
];
