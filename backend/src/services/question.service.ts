import { workflow } from "@/lib/workflow/adapter";
import {
  getSessionData,
  submitAnswer,
  updateSessionStatus,
} from "@/lib/db/queries";

export async function handleAnswer(sessionId: string, answerText: string) {
  // Get current session data
  const data = await getSessionData(sessionId);
  if (!data) throw new Error("Session not found");

  // Append answer
  const newAnswers = [...data.answers, answerText];
  await submitAnswer(sessionId, newAnswers);

  // Check if all questions answered
  const isDone = newAnswers.length >= data.questions.length;

  if (isDone) {
    // Trigger async assessment
    await updateSessionStatus(sessionId, "assessing");
    await workflow.enqueue("generate-assessment", { sessionId });
    return { assessmentPending: true };
  }

  // Return next unanswered question
  const nextIndex = newAnswers.length;
  return {
    nextQuestion: data.questions[nextIndex],
    done: newAnswers.length,
    total: data.questions.length,
  };
}