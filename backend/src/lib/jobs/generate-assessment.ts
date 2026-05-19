import { getAiClient } from "@/lib/ai";
import type { GenerateAssessmentPayload } from "./types";

/**
 * Generate bias assessment for a completed session.
 * Transport-agnostic — called from the queue worker (Inngest) or tests.
 */
export async function runGenerateAssessment(
  payload: GenerateAssessmentPayload
): Promise<void> {
  const { sessionId } = payload;
  const ai = getAiClient();

  // Phase 3: load story + Q&A from DB, then call AI Core
  // const result = await ai.generateAssessment({ sessionId, story, questions, answers });

  console.log(
    `[job:generate-assessment] session=${sessionId} aiClient=${ai.mode}`
  );
}
