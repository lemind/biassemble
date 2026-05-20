import { and, asc, count, eq } from "drizzle-orm";
import { getDb } from "@/drizzle/config";
import {
  answers,
  assessments,
  questions,
  sessions,
  stories,
  type NewAssessment,
  type NewQuestion,
} from "@/drizzle/schema";

function db() {
  return getDb();
}

// ── Sessions ──

export type SessionStatus =
  | "created"
  | "questioning"
  | "assessing"
  | "completed"
  | "error";

export async function createSession() {
  const [row] = await db()
    .insert(sessions)
    .values({ status: "created" })
    .returning();
  return row;
}

export async function getSession(sessionId: string) {
  const [row] = await db()
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId));
  return row ?? null;
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

// ── Stories ──

export async function createStory(sessionId: string, text: string) {
  const [row] = await db()
    .insert(stories)
    .values({ sessionId, text })
    .returning();
  return row;
}

// ── Questions ──

/** Persist a batch of 2–5 questions, ordered by position. */
export async function createQuestions(
  batch: Omit<NewQuestion, "id" | "createdAt">[]
) {
  return db().insert(questions).values(batch).returning();
}

/** Get the next unanswered question for a session (by position ASC). */
export async function getNextQuestion(sessionId: string) {
  const [row] = await db()
    .select()
    .from(questions)
    .where(
      and(
        eq(questions.sessionId, sessionId),
      )
    )
    .orderBy(asc(questions.position));
  return row ?? null;
}

/** Count how many answers exist for a session. */
export async function getAnswerCount(sessionId: string) {
  const [row] = await db()
    .select({ count: count() })
    .from(answers)
    .where(eq(answers.sessionId, sessionId));
  return row?.count ?? 0;
}

/** Count total questions for a session. */
export async function getQuestionCount(sessionId: string) {
  const [row] = await db()
    .select({ count: count() })
    .from(questions)
    .where(eq(questions.sessionId, sessionId));
  return row?.count ?? 0;
}

/** Check if all questions in the batch have been answered. */
export async function isLastAnswer(sessionId: string) {
  const answered = await getAnswerCount(sessionId);
  const total = await getQuestionCount(sessionId);
  return total > 0 && answered >= total;
}

// ── Answers ──

export async function createAnswer(
  sessionId: string,
  questionId: string,
  text: string
) {
  const [row] = await db()
    .insert(answers)
    .values({ sessionId, questionId, text })
    .returning();
  return row;
}

/** Load all Q&A for a session (for assessment generation). */
export async function getSessionAnswers(sessionId: string) {
  return db()
    .select({
      questionText: questions.questionText,
      answerText: answers.text,
    })
    .from(answers)
    .innerJoin(questions, eq(answers.questionId, questions.id))
    .where(eq(answers.sessionId, sessionId))
    .orderBy(asc(questions.position));
}

// ── Assessments ──

export async function createAssessment(data: {
  sessionId: string;
  biases: Array<{
    name: string;
    explanation: string;
    storyConnection: string;
    alternativePerspective: string;
  }>;
  reflectionPrompt: string;
}) {
  const insert: NewAssessment = {
    sessionId: data.sessionId,
    biases: data.biases,
    reflectionPrompt: data.reflectionPrompt,
  };
  const [row] = await db()
    .insert(assessments)
    .values(insert)
    .returning();
  return row;
}

export async function getAssessment(sessionId: string) {
  const [row] = await db()
    .select()
    .from(assessments)
    .where(eq(assessments.sessionId, sessionId));
  return row ?? null;
}