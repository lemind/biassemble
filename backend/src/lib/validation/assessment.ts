import { z } from "zod";
import { biasItemSchema } from "@/lib/ai/contracts";

/**
 * DB/API shape for a persisted assessment.
 * Bias fields validated via contracts.ts (single source of truth).
 * Empty biases allowed when noBiasDetected is true.
 */
export const assessmentRecordSchema = z.object({
  sessionId: z.string().uuid(),
  biases: z.array(biasItemSchema),
  reflectionPrompt: z.string().min(10),
});

export type AssessmentRecord = z.infer<typeof assessmentRecordSchema>;

export { biasItemSchema };