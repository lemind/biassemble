import { getAiClient } from "@/lib/ai";
import {
  getSessionData,
  saveAssessment,
  updateSessionStatus,
} from "@/lib/db/queries";

export async function handleAssessmentGeneration(sessionId: string) {
  const data = await getSessionData(sessionId);
  if (!data) throw new Error("Session not found");

  const ai = getAiClient();

  const result = await ai.generateAssessment({
    sessionId,
    story: data.story,
    questions: data.questions,
    answers: data.answers,
  });

  await saveAssessment(sessionId, result.biases, result.reflectionPrompt);
  await updateSessionStatus(sessionId, "completed");

  return result;
}