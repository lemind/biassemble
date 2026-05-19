import { Inngest } from "inngest";
import type { JobType, WorkflowAdapter } from "./adapter";

export const inngest = new Inngest({
  id: "biassemble",
  eventKey: process.env.INNGEST_EVENT_KEY,
});

export const workflow: WorkflowAdapter = {
  async enqueue(jobType: JobType, payload: unknown) {
    const eventName = `biassemble/${jobType}`;
    const event = await inngest.send({
      name: eventName,
      data: payload,
    });

    return { jobId: event.ids?.[0] ?? "unknown" };
  },
};