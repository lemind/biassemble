/** Job types — transport-agnostic; invoked via runJob() from any queue worker. */

export type JobType = "generate-questions" | "generate-assessment";

export interface GenerateQuestionsPayload {
  sessionId: string;
}

export interface GenerateAssessmentPayload {
  sessionId: string;
}

export type JobPayloadMap = {
  "generate-questions": GenerateQuestionsPayload;
  "generate-assessment": GenerateAssessmentPayload;
};

export function parseJobPayload<T extends JobType>(
  jobType: T,
  data: unknown
): JobPayloadMap[T] {
  if (!data || typeof data !== "object") {
    throw new Error(`Invalid payload for job ${jobType}`);
  }
  const payload = data as Record<string, unknown>;
  if (typeof payload.sessionId !== "string" || !payload.sessionId) {
    throw new Error(`Job ${jobType} requires sessionId`);
  }
  return { sessionId: payload.sessionId } as JobPayloadMap[T];
}
