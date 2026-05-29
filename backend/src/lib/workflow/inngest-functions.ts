import { runJob } from "@/lib/jobs";
import type { JobType } from "@/lib/jobs/types";
import { inngest, jobEventName } from "./inngest-client";
import { handleCreateSession } from "@/services/session.service";
import { submitAnswer } from "@/lib/db/queries";
import { handleAssessmentGeneration } from "@/services/assessment.service";
import { getSessionData } from "@/lib/db/queries";
import {
  assessmentOutputSchema,
  type AssessmentOutput,
} from "@/lib/ai/contracts";
import { QUESTIONS_MIN, QUESTIONS_MAX } from "@/lib/constants";

function createJobFunction(jobType: JobType) {
  return inngest.createFunction(
    { id: jobType },
    { event: jobEventName(jobType) },
    async ({ event }) => {
      await runJob(jobType, event.data);
    }
  );
}

const TEST_STORY = [
  "I recently had a disagreement with my colleague at work about project priorities.",
  "I felt that my approach was more efficient, but they kept pushing for their own method.",
  "Looking back, I wonder if I was too focused on my own perspective and ignored valid points.",
  "This situation made me realize I might have a blind spot when it comes to collaboration.",
  "I want to understand what biases might have been at play in this interaction.",
].join(" ");

/** Registered with serve() in app/api/inngest/route.ts only. */
export const inngestFunctions = [
  createJobFunction("generate-questions"),
  createJobFunction("generate-assessment"),
  inngest.createFunction(
    { id: "integration-test" },
    { event: "biassemble/integration-test" },
    async ({ step }) => {
      // Integration test using internal service calls (bypasses Vercel auth)
      const steps: Array<{ name: string; ok: boolean; detail?: string }> = [];

      try {
        // ─── Step 1: Create session with story ──────────────
        const { sessionId, questions } = await handleCreateSession(
          TEST_STORY
        );
        steps.push({
          name: "POST /api/story",
          ok: true,
          detail: `sessionId=${sessionId}`,
        });

        // ─── Step 2: Verify question count ────────────────────
        if (
          questions.length < QUESTIONS_MIN ||
          questions.length > QUESTIONS_MAX
        ) {
          throw new Error(
            `Expected ${QUESTIONS_MIN}-${QUESTIONS_MAX} questions, got ${questions.length}`
          );
        }
        steps.push({
          name: "Questions generation",
          ok: true,
          detail: `${questions.length} questions`,
        });

        // ─── Step 3: Submit answers ───────────────────────────
        const answers = Array.from(
          { length: questions.length },
          (_, i) =>
            `Answer to question ${i + 1}: reflecting on this aspect of my story...`
        );
        await submitAnswer(sessionId, answers);
        steps.push({
          name: "POST /api/answers",
          ok: true,
          detail: `${questions.length} answers submitted`,
        });

        // ─── Step 4: Wait for assessment to complete ──────────
        await step.sleep("wait-assessment", 3000);

        // ─── Step 5: Check assessment result ──────────────────
        const sessionData = await getSessionData(sessionId);
        if (!sessionData) {
          throw new Error("Session data not found");
        }

        // Assessment is generated synchronously by handleAssessmentGeneration
        let assessmentData = sessionData;
        if (
          !assessmentData.biases ||
          !assessmentData.reflectionPrompt
        ) {
          // Run assessment if not already done
          await handleAssessmentGeneration(sessionId);
          assessmentData = await getSessionData(sessionId);
          if (!assessmentData) {
            throw new Error("Session data not found after assessment");
          }
        }

        if (
          !assessmentData.biases ||
          !assessmentData.reflectionPrompt
        ) {
          throw new Error("Assessment data missing");
        }

        // Validate against Zod schema
        const parseResult = assessmentOutputSchema.safeParse({
          biases: assessmentData.biases,
          reflectionPrompt: assessmentData.reflectionPrompt,
        });

        if (!parseResult.success) {
          throw new Error(`Schema validation failed: ${parseResult.error.message}`);
        }

        steps.push({
          name: "Assessment + schema check",
          ok: true,
          detail: `${parseResult.data.biases.length} biases`,
        });

        return { passed: true, steps };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        steps.push({ name: "Error", ok: false, detail: message });
        throw new Error(`Integration test FAILED:\n${steps.map((s) => `  ${s.ok ? "✓" : "✗"} ${s.name}${s.detail ? ` — ${s.detail}` : ""}`).join("\n")}`);
      }
    }
  ),
];