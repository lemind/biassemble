import type { AiClient } from "./client";
import type {
  AssessmentOutput,
  ExtractClaimsOutput,
  ExtractClaimsRequest,
  GenerateAssessmentRequest,
  GenerateQuestionRequest,
  GrounnelStatusOutput,
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
        questions: [
          "[dev-mock] What assumption are you making about how others will react?",
          "[dev-mock] Have you considered alternative explanations for their behavior?",
          "[dev-mock] What would change if you viewed this from their perspective?",
        ],
        isComplete: true,
        prompt_version: "1.0.0",
        schema_version: "1.0.0",
      };
    },
    async generateAssessment(
      _input: GenerateAssessmentRequest
    ): Promise<AssessmentOutput> {
      return {
        biases: [
          {
            name: "Confirmation Bias",
            explanation:
              "[dev-mock] Seeking information that confirms existing beliefs.",
            storyConnection:
              "[dev-mock] Connects to details in your story.",
            alternativePerspective:
              "[dev-mock] What evidence might contradict your current view?",
          },
          {
            name: "Anchoring",
            explanation:
              "[dev-mock] Over-relying on the first piece of information.",
            storyConnection:
              "[dev-mock] Connects to how you framed the situation.",
            alternativePerspective:
              "[dev-mock] How might the situation look without that first anchor?",
          },
          {
            name: "Fundamental Attribution Error",
            explanation:
              "[dev-mock] Over-emphasizing personality and under-emphasizing situational factors.",
            storyConnection:
              "[dev-mock] Connects to how you described others' actions.",
            alternativePerspective:
              "[dev-mock] What situational pressures might have influenced their behavior?",
          },
        ],
        reflectionPrompt:
          "[dev-mock] What would you do differently if you assumed the opposite?",
        prompt_version: "1.0.0",
        schema_version: "1.0.0",
      };
    },
    async extractClaims(
      _input: ExtractClaimsRequest
    ): Promise<ExtractClaimsOutput> {
      return { id: "00000000-0000-4000-8000-000000000000" };
    },
    async getGrounnelStatus(id: string): Promise<GrounnelStatusOutput> {
      return {
        id,
        status: "done",
        progress: { checked: 1, total: 1 },
        claims: [
          {
            id: "00000000-0000-4000-8000-000000000001",
            text: "[dev-mock] The Eiffel Tower was completed in 1889.",
            status: "done",
            verdict: "supported",
            evidence: "[dev-mock] The tower was finished in 1889 for the World's Fair.",
            confidence: 0.95,
            reason: "[dev-mock] Confirmed by the mocked source.",
            sources: [
              { kind: "web", title: "[dev-mock] Source", domain: "example.com", url: "https://example.com", status: "ok" },
            ],
          },
        ],
        score: { grounded_pct: 100, grounded_n: 1, unclear_n: 0, no_evidence_n: 0, contradicted_n: 0, not_checked_n: 0, eligible: 1 },
        caps_hit: false,
      };
    },
  };
}