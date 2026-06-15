export type JobType = "generate-questions" | "generate-assessment";

export interface GenerateQuestionsPayload {
  inngestRunId: string;
}
export interface GenerateAssessmentPayload {
  inngestRunId: string;
}
export type JobPayloadMap = {
  "generate-questions": GenerateQuestionsPayload;
  "generate-assessment": GenerateAssessmentPayload;
};

/**
 * Validates and extracts the typed payload for a given job type.
 * Throws if inngestRunId is missing or invalid.
 */
export function parseJobPayload<T extends JobType>(
  jobType: T,
  data: unknown
): JobPayloadMap[T] {
  const payload = data as Record<string, unknown>;

  if (typeof payload.inngestRunId !== "string" || !payload.inngestRunId) {
    throw new Error(`Job ${jobType} requires inngestRunId`);
  }

  return { ...payload, inngestRunId: payload.inngestRunId } as JobPayloadMap[T];
}
