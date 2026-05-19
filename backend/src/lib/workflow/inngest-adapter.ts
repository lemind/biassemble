import type { JobType } from "@/lib/jobs/types";
import type { WorkflowAdapter } from "./adapter";
import { inngest, jobEventName } from "./inngest-client";

export const workflow: WorkflowAdapter = {
  async enqueue(jobType: JobType, payload: unknown) {
    const event = await inngest.send({
      name: jobEventName(jobType),
      data: payload,
    });
    return { jobId: event.ids?.[0] ?? "unknown" };
  },
};
