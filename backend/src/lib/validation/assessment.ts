import { z } from "zod";
import { biasItemSchema } from "@/lib/ai/contracts";

/**
 * DB/API shape for a persisted assessment.
 * Bias fields validated via contracts.ts (single source of truth).
 * At least 1 bias, no upper limit — AI decides.
 */
export const assessmentRecordSchema = z.object({
  sessionId: z.string().uuid(),
  biases: z.array(biasItemSchema).min(1),
  reflectionPrompt: z.string().min(10),
});

export type AssessmentRecord = z.infer<typeof assessmentRecordSchema>;

export { biasItemSchema };