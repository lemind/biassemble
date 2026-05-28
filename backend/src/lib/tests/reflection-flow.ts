/**
 * Shared integration test logic — runs the full reflection flow via the public API
 * and validates all output shapes.
 *
 * Used by:
 *   - tests/integration/reflection-flow.test.ts (vitest, local dev)
 *   - src/lib/workflow/inngest-functions.ts (Inngest, post-deploy)
 */

import { QUESTIONS_MIN, QUESTIONS_MAX } from "@/lib/constants";
import { assessmentOutputSchema } from "@/lib/ai/contracts";

export const TEST_STORY = [
  "I recently had a disagreement with my colleague at work about project priorities.",
  "I felt that my approach was more efficient, but they kept pushing for their own method.",
  "Looking back, I wonder if I was too focused on my own perspective and ignored valid points.",
  "This situation made me realize I might have a blind spot when it comes to collaboration.",
  "I want to understand what biases might have been at play in this interaction.",
].join(" ");

export const POLL_TIMEOUT_MS = 30_000;
export const POLL_INTERVAL_MS = 1_000;

export interface StepResult {
  name: string;
  ok: boolean;
  detail?: string;
}

export interface FlowResult {
  passed: boolean;
  steps: StepResult[];
  sessionId?: string;
  questionCount?: number;
}

export function poll<T>(
  fn: () => Promise<T | null>,
  intervalMs = POLL_INTERVAL_MS,
  timeoutMs = POLL_TIMEOUT_MS,
): Promise<T | null> {
  const deadline = Date.now() + timeoutMs;
  return (async function loop(): Promise<T | null> {
    const result = await fn();
    if (result !== null) return result;
    if (Date.now() >= deadline) return null;
    await new Promise((r) => setTimeout(r, intervalMs));
    return loop();
  })();
}

export async function runReflectionFlow(baseUrl: string): Promise<FlowResult> {
  const steps: StepResult[] = [];

  function ok(name: string, detail?: string) {
    steps.push({ name, ok: true, detail });
  }

  function fail(name: string, detail?: string): FlowResult {
    steps.push({ name, ok: false, detail });
    return { passed: false, steps };
  }

  try {
    // ─── Step 1: Submit story ─────────────────────────────
    const storyRes = await fetch(`${baseUrl}/api/story`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: TEST_STORY }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!storyRes.ok) {
      const text = await storyRes.text().catch(() => "");
      return fail("POST /api/story", `HTTP ${storyRes.status}: ${text}`);
    }

    const storyBody = await storyRes.json();
    const sessionId: string = storyBody.sessionId;

    if (!sessionId || typeof sessionId !== "string") {
      return fail("POST /api/story response", "Missing sessionId");
    }
    ok("POST /api/story", `sessionId=${sessionId}`);

    // ─── Step 2: Poll for questions ───────────────────────
    const count = await poll(async () => {
      const sRes = await fetch(`${baseUrl}/api/session/${sessionId}`);
      if (!sRes.ok) return null;
      const body = await sRes.json();
      if (body.status === "questions_ready" || body.status === "completed" || body.assessmentReady) {
        return body.questionCount as number;
      }
      return null;
    });

    if (count == null || count < QUESTIONS_MIN || count > QUESTIONS_MAX) {
      return fail("Questions generation", `Expected ${QUESTIONS_MIN}-${QUESTIONS_MAX}, got ${count ?? 0}`);
    }
    ok("Questions generation", `${count} questions`);

    // ─── Step 3: Submit answers ───────────────────────────
    const answers = Array.from({ length: count }, (_, i) =>
      `Answer to question ${i + 1}: reflecting on this aspect of my story...`
    );

    const answersRes = await fetch(`${baseUrl}/api/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, answers }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!answersRes.ok) {
      const text = await answersRes.text().catch(() => "");
      return fail("POST /api/answers", `HTTP ${answersRes.status}: ${text}`);
    }
    ok("POST /api/answers", `${count} answers submitted`);

    // ─── Step 4: Poll for assessment ──────────────────────
    const resultBody = await poll(
      async () => {
        const rRes = await fetch(`${baseUrl}/api/result/${sessionId}`);
        if (!rRes.ok) return null;
        const body = await rRes.json();
        if (body.biases && body.reflectionPrompt) return body;
        return null;
      },
      POLL_INTERVAL_MS * 2,
    );

    if (!resultBody) {
      return fail("Assessment result", `Timed out after ${POLL_TIMEOUT_MS}ms`);
    }

    // ─── Step 5: Validate schema ──────────────────────────
    const parsed = assessmentOutputSchema.safeParse({
      biases: resultBody.biases,
      reflectionPrompt: resultBody.reflectionPrompt,
    });

    if (!parsed.success) {
      return fail("Assessment schema", parsed.error.message);
    }

    ok("Assessment biases", `${parsed.data.biases.length} biases, all fields valid`);
    ok("reflectionPrompt", `${parsed.data.reflectionPrompt.length} chars`);

    return { passed: true, steps, sessionId, questionCount: count };
  } catch (err) {
    const message = err instanceof Error ? `${err.message} — cause: ${String(err.cause ?? "")}` : String(err);
    return fail("Unexpected error", message);
  }
}