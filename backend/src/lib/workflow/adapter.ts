// Workflow adapter — enqueue only. Job logic lives in lib/jobs/runJob().
// Services import { workflow } from here — never import Inngest directly.
//
// To swap Inngest for another queue later: add a new *-adapter.ts implementing
// WorkflowAdapter, change the export below, and point workers at runJob().

import type { JobType } from "@/lib/jobs/types";
import { workflow as inngestWorkflow } from "./inngest-adapter";

export type { JobType };

export interface WorkflowAdapter {
  enqueue(jobType: JobType, payload: unknown): Promise<{ jobId: string }>;
}

export const workflow: WorkflowAdapter = inngestWorkflow;
