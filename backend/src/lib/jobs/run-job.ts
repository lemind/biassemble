import { runGenerateAssessment } from "./generate-assessment";
import { runGenerateQuestions } from "./generate-questions";
import { type JobType, parseJobPayload } from "./types";

/**
 * Single entry point for all background jobs.
 * Queue transport (Inngest today) must only forward the payload and call this.
 */
export async function runJob(jobType: JobType, data: unknown): Promise<void> {
  switch (jobType) {
    case "generate-questions": {
      const payload = parseJobPayload(jobType, data);
      await runGenerateQuestions(payload);
      return;
    }
    case "generate-assessment": {
      const payload = parseJobPayload(jobType, data);
      await runGenerateAssessment(payload);
      return;
    }
    default: {
      const _exhaustive: never = jobType;
      throw new Error(`Unknown job type: ${_exhaustive}`);
    }
  }
}
