import { z } from "zod";

/**
 * Public DTOs — shapes returned by Biassemble AI Core (private repo).
 * No prompts or model IDs in this repository.
 */

export const questionOutputSchema = z.object({
  question: z.string().min(1),
  isComplete: z.boolean().optional(),
});

export type QuestionOutput = z.infer<typeof questionOutputSchema>;

export const biasItemSchema = z.object({
  name: z.string().min(1),
  explanation: z.string().min(10),
  storyConnection: z.string().min(10),
  alternativePerspective: z.string().min(10),
});

export const assessmentOutputSchema = z.object({
  biases: z.array(biasItemSchema).length(2),
  reflectionPrompt: z.string().min(10),
});

export type AssessmentOutput = z.infer<typeof assessmentOutputSchema>;

export interface GenerateQuestionRequest {
  sessionId: string;
  story: string;
  previousQuestions?: string[];
  previousAnswers?: string[];
}

export interface GenerateAssessmentRequest {
  sessionId: string;
  story: string;
  questions: string[];
  answers: string[];
}
