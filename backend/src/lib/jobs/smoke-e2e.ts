/**
 * smoke-e2e job — runs the full reflection flow via the public API
 * and asserts all output shapes match the contracts.
 *
 * Triggered by sending event: `biassemble/smoke-e2e`
 * Designed to run after a production deploy.
 *
 * For local use (no Inngest): pnpm smoke:local
 */

import { QUESTIONS_MIN, QUESTIONS_MAX } from "@/lib/constants";
import {
  assessmentOutputSchema,
  biasItemSchema,
} from "@/lib/ai/contracts";

const BASE_URL = process.env.SELF_BASE_URL || "http://localhost:3000";

const POLL_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_QUESTIONS_MS = 1_000;
const POLL_INTERVAL_ASSESSMENT_MS = 2_000;

const BIAS_FIELD_MIN_LENGTH = 10;
const REFLECTION_MIN_LENGTH = 10;

const TEST_STORY = [
  "I recently had a disagreement with my colleague at work about project priorities.",
  "I felt that my approach was more efficient, but they kept pushing for their own method.",
  "Looking back, I wonder if I was too focused on my own perspective and ignored valid points.",
  "This situation made me realize I might have a blind spot when it comes to collaboration.",
  "I want to understand what biases might have been at play in this interaction.",
].join(" ");

interface SmokeResult {
  passed: boolean;
  steps: Array<{ name: string; ok: boolean; detail?: string }>;
}

export async function runSmokeE2e(): Promise<SmokeResult> {
  const steps: SmokeResult["steps"] = [];

  function step(name: string, ok: boolean, detail?: string) {
    steps.push({ name, ok, detail });
  }

  function poll<T>(
    fn: () => Promise<T | null>,
    intervalMs: number
  ): Promise<T | null> {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    return (async function pollLoop(): Promise<T | null> {
      const result = await fn();
      if (result !== null) return result;
      if (Date.now() >= deadline) return null;
      await new Promise((r) => setTimeout(r, intervalMs));
      return pollLoop();
    })();
  }

  try {
    // ─── Step 1: Submit story ─────────────────────────────────
    const storyRes = await fetch(`${BASE_URL}/api/story`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: TEST_STORY }),
    });

    if (!storyRes.ok) {
      const text = await storyRes.text();
      step("POST /api/story", false, `HTTP ${storyRes.status}: ${text}`);
      return { passed: false, steps };
    }

    const storyBody = await storyRes.json();
    const sessionId: string = storyBody.sessionId;

    if (!sessionId || typeof sessionId !== "string") {
      step("POST /api/story response shape", false, "Missing sessionId");
      return { passed: false, steps };
    }
    step("POST /api/story", true, `sessionId=${sessionId}`);

    // ─── Step 2: Poll session until questions are generated ───
    const questionCount = await poll(async () => {
      const sessionRes = await fetch(`${BASE_URL}/api/session/${sessionId}`);
      if (!sessionRes.ok) return null;
      const body = await sessionRes.json();
      // session endpoint returns { status, questionCount, answerCount, assessmentReady }
      if (body.status === "questions_ready" || body.status === "completed" || body.assessmentReady) {
        return body.questionCount as number;
      }
      return null;
    }, POLL_INTERVAL_QUESTIONS_MS);

    if (questionCount == null || questionCount < QUESTIONS_MIN || questionCount > QUESTIONS_MAX) {
      step("Questions generation", false, `Expected ${QUESTIONS_MIN}-${QUESTIONS_MAX} questions, session reports ${questionCount ?? 0}`);
      return { passed: false, steps };
    }
    step("Questions generation", true, `${questionCount} questions available`);

    // ─── Step 3: Generate dynamic answers matching question count ───
    const answers = Array.from({ length: questionCount }, (_, i) =>
      `Answer to question ${i + 1}: reflecting on this aspect of my story...`
    );

    // ─── Step 4: Submit answers ────────────────────────────────
    const answersRes = await fetch(`${BASE_URL}/api/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        answers,
      }),
    });

    if (!answersRes.ok) {
      const text = await answersRes.text();
      step("POST /api/answers", false, `HTTP ${answersRes.status}: ${text}`);
      return { passed: false, steps };
    }
    step("POST /api/answers", true, `${questionCount} answers submitted`);

    // ─── Step 5: Poll for assessment result ────────────────────
    const resultBody = await poll(async () => {
      const resultRes = await fetch(`${BASE_URL}/api/result/${sessionId}`);
      if (!resultRes.ok) return null;
      const body = await resultRes.json();
      if (body.biases && body.reflectionPrompt) return body;
      return null;
    }, POLL_INTERVAL_ASSESSMENT_MS);

    if (!resultBody) {
      step("Assessment result", false, `Timed out after ${POLL_TIMEOUT_MS}ms`);
      return { passed: false, steps };
    }

    // Validate assessment output against Zod schemas
    const parseResult = assessmentOutputSchema.safeParse({
      biases: resultBody.biases,
      reflectionPrompt: resultBody.reflectionPrompt,
    });

    if (!parseResult.success) {
      step("Assessment output schema", false, parseResult.error.message);
      return { passed: false, steps };
    }

    const { biases, reflectionPrompt } = parseResult.data;

    step("Assessment biases", true, `${biases.length} biases, all fields valid`);
    step("reflectionPrompt", true, `${reflectionPrompt.length} chars`);

    return { passed: true, steps };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    step("Unexpected error", false, message);
    return { passed: false, steps };
  }
}