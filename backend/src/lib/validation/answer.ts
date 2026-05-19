import { z } from "zod";

export const answerSchema = z.object({
  sessionId: z.string().uuid(),
  questionId: z.string().uuid(),
  text: z
    .string()
    .min(1, "Answer cannot be empty")
    .max(2000, "Answer must be at most 2000 characters"),
});

export type AnswerInput = z.infer<typeof answerSchema>;