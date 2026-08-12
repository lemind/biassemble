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
  // Real observed gap, 2026-08-12: getGrounnelStatus used to return "done" on the very first
  // poll, unconditionally — a real run takes several seconds, so there was no way to actually
  // see (or test) the frontend's "run in flight" UI (disabled Run button, progress indicator)
  // against dev-mock at all. Tracked per-id so overlapping/sequential runs (each gets the same
  // hardcoded id below) don't inherit a stale count from a previous run.
  const pollCounts = new Map<string, number>();

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
      const id = "00000000-0000-4000-8000-000000000000";
      pollCounts.set(id, 0);
      return { id };
    },
    async getGrounnelStatus(id: string): Promise<GrounnelStatusOutput> {
      // ~10s of "in flight" (2 polls at usePollGrounnelStatus's 5s interval) before "done", so
      // the frontend's run-in-progress UI is actually observable/testable against this mock,
      // not just against a real (slow, rate-limited) core-mode run.
      const count = (pollCounts.get(id) ?? 2) + 1;
      pollCounts.set(id, count);
      const status = count === 1 ? "extracting" : count === 2 ? "verifying" : "done";
      return {
        id,
        status,
        progress: { checked: status === "done" ? 1 : 0, total: 1 },
        claims: status === "done" ? [
          {
            id: "00000000-0000-4000-8000-000000000001",
            text: "[dev-mock] The Eiffel Tower was completed in 1889.",
            status: "done",
            verdict: "supported",
            evidence: "[dev-mock] The tower was finished in 1889 for the World's Fair.",
            confidence: 0.95,
            reason: "[dev-mock] Confirmed by the mocked source.",
            sources: [
              { kind: "web", title: "[dev-mock] Source", domain: "example.com", url: "https://example.com", status: "ok", retrievalMethod: "diy_fetch" },
            ],
            citations: [
              { source: "A", sentence: 1, url: "https://example.com", text: "[dev-mock] The tower was finished in 1889 for the World's Fair." },
            ],
          },
        ] : [],
        score: { grounded_pct: status === "done" ? 100 : 0, grounded_n: status === "done" ? 1 : 0, unclear_n: 0, no_evidence_n: 0, contradicted_n: 0, not_checked_n: status === "done" ? 0 : 1, eligible: 1 },
        caps_hit: false,
        started_at: new Date().toISOString(),
        elapsed_seconds: 3,
      };
    },
  };
}