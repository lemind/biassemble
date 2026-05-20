import { handleAssessmentGeneration } from "@/services/assessment.service";
import type { GenerateAssessmentPayload } from "./types";

/**
 * Generate bias assessment for a completed session.
 * Transport-agnostic — called from the queue worker (Inngest) or tests.
 */
export async function runGenerateAssessment(
  payload: GenerateAssessmentPayload
): Promise<void> {
  const { sessionId } = payload;
  await handleAssessmentGeneration(sessionId);
}