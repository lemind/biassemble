import type { AiClient } from "./client";
import type {
  AssessmentOutput,
  GenerateAssessmentRequest,
  GenerateQuestionRequest,
  QuestionOutput,
} from "./contracts";

/**
 * Local mock — no prompts, no LLM keys. For public-repo dev when AI Core is unavailable.
 * Do not use in production.
 */
export function createDevMockClient(): AiClient {
  return {
    mode: "dev-mock",
    async generateQuestion(
      _input: GenerateQuestionRequest
    ): Promise<QuestionOutput> {
      return {
        question:
          "[dev-mock] What assumption are you making about how others will react?",
        isComplete: false,
      };
    },
    async generateAssessment(
      _input: GenerateAssessmentRequest
    ): Promise<AssessmentOutput> {
      return {
        biases: [
          {
            name: "Confirmation Bias",
            explanation: "[dev-mock] Seeking information that confirms existing beliefs.",
            storyConnection: "[dev-mock] Connects to details in your story.",
            alternativePerspective:
              "[dev-mock] What evidence might contradict your current view?",
          },
          {
            name: "Anchoring",
            explanation: "[dev-mock] Over-relying on the first piece of information.",
            storyConnection: "[dev-mock] Connects to how you framed the situation.",
            alternativePerspective:
              "[dev-mock] How might the situation look without that first anchor?",
          },
        ],
        reflectionPrompt:
          "[dev-mock] What would you do differently if you assumed the opposite?",
      };
    },
  };
}
