import type { GenerateAssessmentPayload } from "./types";

/**
 * Generate bias assessment for a completed session.
 * Real assessment runs via setImmediate in question.service.ts, not Inngest.
 * This handler exists only for Inngest Cloud registration.
 */
export async function runGenerateAssessment(
  payload: GenerateAssessmentPayload
): Promise<void> {
  const { inngestRunId } = payload;
  console.log(`[job:generate-assessment] run=${inngestRunId}`);
}