import { getAiClient } from "@/lib/ai";
import type { GenerateQuestionsPayload } from "./types";

/**
 * Generate follow-up question(s) for a session.
 * Transport-agnostic — called from the queue worker (Inngest) or tests.
 */
export async function runGenerateQuestions(
  payload: GenerateQuestionsPayload
): Promise<void> {
  const { sessionId } = payload;
  const ai = getAiClient();

  // Phase 3: load story + history from DB, then call AI Core
  // const session = await queries.getSession(sessionId);
  // const result = await ai.generateQuestion({ sessionId, story, ... });

  console.log(
    `[job:generate-questions] session=${sessionId} aiClient=${ai.mode}`
  );
}
