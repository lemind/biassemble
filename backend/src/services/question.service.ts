import { workflow } from "@/lib/workflow/adapter";
import {
  getSessionData,
  submitAnswer,
  updateSessionStatus,
} from "@/lib/db/queries";

export async function handleAnswer(sessionId: string, answers: string[]) {
  const data = await getSessionData(sessionId);
  if (!data) throw new Error("Session not found");

  // Save all answers at once
  await submitAnswer(sessionId, answers);

  // Enqueue async assessment
  await updateSessionStatus(sessionId, "assessing");
  await workflow.enqueue("generate-assessment", { sessionId });

  return { done: true as const, total: data.questions.length, assessmentPending: true as const };
}