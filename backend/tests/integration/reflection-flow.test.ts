/**
 * Integration test — full reflection flow via public API.
 *
 * Run: pnpm test:integration
 * Requires: backend running on http://127.0.0.1:3000 (dev-mock mode is fine)
 *
 * This replaces the old smoke-e2e custom script.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { QUESTIONS_MIN, QUESTIONS_MAX } from "@/lib/constants";
import { assessmentOutputSchema } from "@/lib/ai/contracts";

const BASE_URL = process.env.SELF_BASE_URL || "http://127.0.0.1:3000";
const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 30000;

const TEST_STORY = [
  "I recently had a disagreement with my colleague at work about project priorities.",
  "I felt that my approach was more efficient, but they kept pushing for their own method.",
  "Looking back, I wonder if I was too focused on my own perspective and ignored valid points.",
  "This situation made me realize I might have a blind spot when it comes to collaboration.",
  "I want to understand what biases might have been at play in this interaction.",
].join(" ");

function poll<T>(
  fn: () => Promise<T | null>,
): Promise<T | null> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  return (async function loop(): Promise<T | null> {
    const result = await fn();
    if (result !== null) return result;
    if (Date.now() >= deadline) return null;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    return loop();
  })();
}

let sessionId: string;
let questionCount: number;

describe("Reflection flow", () => {
  beforeAll(async () => {
    // Verify backend is reachable
    const res = await fetch(`${BASE_URL}/api`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Backend not reachable at ${BASE_URL}/api`);
  });

  it("POST /api/story returns sessionId", async () => {
    const res = await fetch(`${BASE_URL}/api/story`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: TEST_STORY }),
    });

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("sessionId");
    expect(typeof body.sessionId).toBe("string");
    sessionId = body.sessionId;
  });

  it("questions are generated (2-5) within timeout", async () => {
    expect(sessionId).toBeDefined();

    const count = await poll(async () => {
      const res = await fetch(`${BASE_URL}/api/session/${sessionId}`);
      if (!res.ok) return null;
      const body = await res.json();
      if (
        body.status === "questions_ready" ||
        body.status === "completed" ||
        body.assessmentReady
      ) {
        return body.questionCount as number;
      }
      return null;
    });

    expect(count).not.toBeNull();
    expect(count!).toBeGreaterThanOrEqual(QUESTIONS_MIN);
    expect(count!).toBeLessThanOrEqual(QUESTIONS_MAX);
    questionCount = count!;
  });

  it("POST /api/answers submits successfully", async () => {
    expect(sessionId).toBeDefined();
    expect(questionCount).toBeGreaterThan(0);

    const answers = Array.from({ length: questionCount }, (_, i) =>
      `Answer to question ${i + 1}: reflecting on this aspect of my story...`
    );

    const res = await fetch(`${BASE_URL}/api/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, answers }),
    });

    expect(res.status).toBe(200);
  });

  it("assessment result validates against schema", async () => {
    expect(sessionId).toBeDefined();

    const body = await poll(async () => {
      const res = await fetch(`${BASE_URL}/api/result/${sessionId}`);
      if (!res.ok) return null;
      const b = await res.json();
      if (b.biases && b.reflectionPrompt) return b;
      return null;
    });

    expect(body).not.toBeNull();

    const result = assessmentOutputSchema.safeParse({
      biases: body.biases,
      reflectionPrompt: body.reflectionPrompt,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.biases.length).toBeGreaterThanOrEqual(1);
      expect(result.data.reflectionPrompt.length).toBeGreaterThanOrEqual(10);
    }
  });
});