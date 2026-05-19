// Workflow Adapter Interface
// Abstracted so we can swap Inngest → BullMQ/RabbitMQ with zero service changes.
// Services import { workflow } from "@/lib/workflow/adapter" — never import Inngest directly.

export type JobType = "generate-questions" | "generate-assessment";

export interface WorkflowAdapter {
  enqueue(jobType: JobType, payload: unknown): Promise<{ jobId: string }>;
}

// Default export is the InngestAdapter (set up during T010)
// When switching to BullMQ, update this one import:
export { workflow } from "./inngest-adapter";