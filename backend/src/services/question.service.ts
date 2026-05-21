import { getSessionData, submitAnswer } from "@/lib/db/queries";
import { handleAssessmentGeneration } from "./assessment.service";

export async function handleAnswer(sessionId: string, answers: string[]) {
  const data = await getSessionData(sessionId);
  if (!data) throw new Error("Session not found");

  // Save all answers at once
  await submitAnswer(sessionId, answers);

  // Run assessment synchronously — no Inngest dependency
  setImmediate(() => handleAssessmentGeneration(sessionId));

  return { done: true as const, total: data.questions.length, assessmentPending: true as const };
}
