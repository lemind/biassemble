import { z } from "zod";

export const assessmentSchema = z.object({
  sessionId: z.string().uuid(),
  biases: z.array(
    z.object({
      name: z.string().min(1),
      explanation: z.string().min(10),
      storyConnection: z.string().min(10),
      alternativePerspective: z.string().min(10),
    })
  ).length(2, "Assessment must contain exactly 2 biases"),
  reflectionPrompt: z.string().min(10),
});

export type AssessmentOutput = z.infer<typeof assessmentSchema>;