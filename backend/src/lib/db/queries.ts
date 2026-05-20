import { eq } from "drizzle-orm";
import { getDb } from "@/drizzle/config";
import { sessions, sessionData } from "@/drizzle/schema";

function db() {
  return getDb();
}

// ── Session status type ──

export type SessionStatus =
  | "created"
  | "questioning"
  | "assessing"
  | "completed"
  | "error";

// ── Sessions ──

export async function createSession() {
  const [row] = await db()
    .insert(sessions)
    .values({ status: "created" })
    .returning();
  return row;
}

export async function getSession(sessionId: string) {
  const result = await db()
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId));
  return result[0] ?? null;
}

export async function updateSessionStatus(
  sessionId: string,
  status: SessionStatus
) {
  const [row] = await db()
    .update(sessions)
    .set({ status, updatedAt: new Date() })
    .where(eq(sessions.id, sessionId))
    .returning();
  return row;
}

// ── Session Data ──

/** Create session_data row with story + batch of 2-5 questions. */
export async function createSessionData(
  sessionId: string,
  story: string,
  questions: string[]
) {
  const [row] = await db()
    .insert(sessionData)
    .values({ sessionId, story, questions })
    .returning();
  return row;
}

/** Get full session data (story, Q&A batch, assessment). */
export async function getSessionData(sessionId: string) {
  const result = await db()
    .select()
    .from(sessionData)
    .where(eq(sessionData.sessionId, sessionId));
  return result[0] ?? null;
}

/** Record an answer at the given position in the questions array. */
export async function submitAnswer(
  sessionId: string,
  answers: string[]
) {
  const [row] = await db()
    .update(sessionData)
    .set({ answers })
    .where(eq(sessionData.sessionId, sessionId))
    .returning();
  return row;
}

/** Save assessment results. */
export async function saveAssessment(
  sessionId: string,
  biases: Array<{
    name: string;
    explanation: string;
    storyConnection: string;
    alternativePerspective: string;
  }>,
  reflectionPrompt: string
) {
  const [row] = await db()
    .update(sessionData)
    .set({ biases, reflectionPrompt })
    .where(eq(sessionData.sessionId, sessionId))
    .returning();
  return row;
}