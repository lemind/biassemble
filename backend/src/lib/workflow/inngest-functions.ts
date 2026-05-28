import { runJob } from "@/lib/jobs";
import type { JobType } from "@/lib/jobs/types";
import { inngest, jobEventName } from "./inngest-client";
import { QUESTIONS_MIN, QUESTIONS_MAX } from "@/lib/constants";
import { assessmentOutputSchema } from "@/lib/ai/contracts";

function createJobFunction(jobType: JobType) {
  return inngest.createFunction(
    { id: jobType },
    { event: jobEventName(jobType) },
    async ({ event }) => {
      await runJob(jobType, event.data);
    }
  );
}

/** Registered with serve() in app/api/inngest/route.ts only. */
export const inngestFunctions = [
  createJobFunction("generate-questions"),
  createJobFunction("generate-assessment"),
  inngest.createFunction(
    { id: "integration-test" },
    { event: "biassemble/integration-test" },
    async ({ step }) => {
      // Inline integration test — validates API contract shapes end-to-end.
      // Also available as vitest via `pnpm test:integration` (see tests/integration/reflection-flow.test.ts).

      const BASE_URL = process.env.SELF_BASE_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://127.0.0.1:3000";

      const TEST_STORY = [
        "I recently had a disagreement with my colleague at work about project priorities.",
        "Looking back, I wonder if I was too focused on my own perspective.",
      ].join(" ");

      const steps: Array<{ name: string; ok: boolean; detail?: string }> = [];

      // Submit story
      const storyRes = await fetch(`${BASE_URL}/api/story`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: TEST_STORY }),
      });
      if (!storyRes.ok) throw new Error(`POST /api/story failed: ${storyRes.status}`);
      const { sessionId } = await storyRes.json();
      steps.push({ name: "POST /api/story", ok: true, detail: `sessionId=${sessionId}` });

      // Poll questions
      let questionCount = 0;
      const deadline = Date.now() + 30_000;
      while (Date.now() < deadline) {
        const sRes = await fetch(`${BASE_URL}/api/session/${sessionId}`);
        if (sRes.ok) {
          const body = await sRes.json();
          if (body.status === "questions_ready" || body.assessmentReady) {
            questionCount = body.questionCount;
            break;
          }
        }
        await step.sleep("poll-questions", 1000);
      }
      if (questionCount < QUESTIONS_MIN || questionCount > QUESTIONS_MAX) {
        throw new Error(`Expected ${QUESTIONS_MIN}-${QUESTIONS_MAX} questions, got ${questionCount}`);
      }
      steps.push({ name: "Questions generation", ok: true, detail: `${questionCount} questions` });

      // Submit answers
      const answers = Array.from({ length: questionCount }, (_, i) =>
        `Answer ${i + 1}: reflecting on this aspect of my story.`
      );
      const ansRes = await fetch(`${BASE_URL}/api/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, answers }),
      });
      if (!ansRes.ok) throw new Error(`POST /api/answers failed: ${ansRes.status}`);
      steps.push({ name: "POST /api/answers", ok: true, detail: `${questionCount} answers` });

      // Poll result
      let resultBody: any = null;
      const resultDeadline = Date.now() + 30_000;
      while (Date.now() < resultDeadline) {
        const rRes = await fetch(`${BASE_URL}/api/result/${sessionId}`);
        if (rRes.ok) {
          const body = await rRes.json();
          if (body.biases && body.reflectionPrompt) { resultBody = body; break; }
        }
        await step.sleep("poll-assessment", 2000);
      }
      if (!resultBody) throw new Error("Assessment timed out");

      // Validate schema
      const parsed = assessmentOutputSchema.safeParse(resultBody);
      if (!parsed.success) throw new Error(`Schema validation failed: ${parsed.error.message}`);
      steps.push({ name: "Assessment + schema check", ok: true, detail: `${parsed.data.biases.length} biases` });

      return { passed: true, steps };
    }
  ),
];
