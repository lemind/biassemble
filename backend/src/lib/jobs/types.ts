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

/**
 * Validates and extracts the typed payload for a given job type.
 * Throws if sessionId is missing or invalid.
 */
export function parseJobPayload<T extends JobType>(
  jobType: T,
  data: unknown
): JobPayloadMap[T] {
  const payload = data as Record<string, unknown>;

  if (typeof payload.sessionId !== "string" || !payload.sessionId) {
    throw new Error(`Job ${jobType} requires sessionId`);
  }

  return { sessionId: payload.sessionId } as JobPayloadMap[T];
}