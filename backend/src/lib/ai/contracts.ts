import { z } from "zod";
import { QUESTIONS_MIN, QUESTIONS_MAX } from "@/lib/constants";

/**
 * Public DTOs — shapes returned by Biassemble AI Core (private repo).
 * No prompts or model IDs in this repository.
 *
 * Zod schemas are the SSOT for runtime validation.
 * `contracts.generated.ts` is auto-generated from Core's `GET /v1/contracts`
 * via `pnpm generate:types` — use it as a reference when updating hand-written types.
 */

export interface GenerateQuestionRequest {
  sessionId: string;
  story: string;
}

export interface GenerateAssessmentRequest {
  sessionId: string;
  story: string;
  questions: string[];
  answers: string[];
}

/** AI returns 2–5 questions as a batch (all at once), plus isComplete flag. */
export const questionOutputSchema = z.object({
  questions: z.array(z.string().min(1)).min(QUESTIONS_MIN).max(QUESTIONS_MAX),
  isComplete: z.boolean(),
});

export type QuestionOutput = z.infer<typeof questionOutputSchema>;

export const biasItemSchema = z.object({
  name: z.string().min(1),
  explanation: z.string().min(10),
  storyConnection: z.string().min(10),
  alternativePerspective: z.string().min(10),
});

/** At least 1 bias, no upper limit — AI decides how many are found. */
export const assessmentOutputSchema = z.object({
  biases: z.array(biasItemSchema).min(1),
  reflectionPrompt: z.string().min(10),
});

export type AssessmentOutput = z.infer<typeof assessmentOutputSchema>;
