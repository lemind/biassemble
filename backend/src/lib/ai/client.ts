import type {
  AssessmentOutput,
  GenerateAssessmentRequest,
  GenerateQuestionRequest,
  QuestionOutput,
} from "./contracts";

export type AiClientMode = "core" | "dev-mock";

/**
 * AI boundary for the public backend.
 * Implementations call Biassemble AI Core (private) or a local mock — never embed prompts here.
 */
export interface AiClient {
  readonly mode: AiClientMode;
  generateQuestion(input: GenerateQuestionRequest): Promise<QuestionOutput>;
  generateAssessment(input: GenerateAssessmentRequest): Promise<AssessmentOutput>;
}
