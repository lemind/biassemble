import { getAiClient } from "@/lib/ai";
import { createSession, createSessionData, updateSessionStatus } from "@/lib/db/queries";
import { storySchema } from "@/lib/validation/story";

export async function handleCreateSession(storyText: string) {
  // Validate story
  const result = storySchema.safeParse({ text: storyText });
  if (!result.success) {
    throw new Error(`Invalid story: ${result.error.issues[0]?.message ?? "too short"}`);
  }

  // Create session
  const session = await createSession();

  // Call AI synchronously (dev-mock or core)
  const ai = getAiClient();
  const aiResult = await ai.generateQuestion({
    sessionId: session.id,
    story: storyText,
  });

  // Persist story + all questions in session_data
  await createSessionData(session.id, storyText, aiResult.questions);

  // Mark session as questioning
  await updateSessionStatus(session.id, "questioning");

  // Return all questions at once — frontend renders them all
  return {
    sessionId: session.id,
    questions: aiResult.questions,
  };
}