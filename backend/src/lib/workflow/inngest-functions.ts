import { runJob } from "@/lib/jobs";
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
];
