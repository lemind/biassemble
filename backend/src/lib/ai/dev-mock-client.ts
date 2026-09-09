import { aiError } from "../errors";
import type { AiClient } from "./client";
import type {
  AssessmentOutput,
  ExtractClaimsOutput,
  ExtractClaimsRequest,
  GenerateAssessmentRequest,
  GenerateQuestionRequest,
  GrounnelStatusOutput,
  SharedAssessment,
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
      // 32 base64url chars, the shape core's isShareTokenShape accepts.
      return { id, shareToken: "devmockdevmockdevmockdevmockdevm" };
    },
    // Mirrors what a real shared assessment looks like: no ids, no citations, and a claim the
    // pipeline refused to judge — without that last one the "Not checked" UI is unreachable here.
    async getSharedAssessment(token: string, _clientIp?: string): Promise<SharedAssessment> {
      if (token !== "devmockdevmockdevmockdevmockdevm") {
        throw aiError("not_found", { path: `/assessment/${token}`, status: 404 });
      }
      return {
        status: "done",
        text: "[dev-mock] The Eiffel Tower was completed in 1889. I felt exhausted after gardening yesterday.",
        createdAt: "2026-09-09T00:00:00.000Z",
        completedAt: "2026-09-09T00:03:20.000Z",
        claims: [
          {
            text: "[dev-mock] The Eiffel Tower was completed in 1889.",
            verdict: "supported",
            evidence: "[dev-mock] The tower was finished in 1889 for the World's Fair.",
            confidence: 0.95,
            reason: "[dev-mock] Confirmed by the mocked source.",
            sources: [
              { kind: "web", title: "[dev-mock] Source", domain: "example.com", url: "https://example.com", status: "ok" },
            ],
            sourceExcerpt: "[dev-mock] The Eiffel Tower was completed in 1889.",
          },
          {
            text: "[dev-mock] I felt exhausted after gardening yesterday.",
            verdict: "excluded",
            evidence: null,
            confidence: null,
            reason: "[dev-mock] This describes a private, personal circumstance no public record could confirm.",
            sources: [],
            sourceExcerpt: "[dev-mock] I felt exhausted after gardening yesterday.",
          },
        ],
      };
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
        progress: { checked: status === "done" ? 3 : 0, total: 3 },
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
            sourceExcerpt: "[dev-mock] The Eiffel Tower was completed in 1889.",
          },
          // An `excluded` claim — without it the "Not checked" UI is unreachable in dev-mock.
          {
            id: "00000000-0000-4000-8000-000000000002",
            text: "[dev-mock] I felt exhausted after gardening yesterday.",
            status: "done",
            verdict: "excluded",
            evidence: null,
            confidence: null,
            reason: "[dev-mock] This describes a private, personal circumstance no public record could confirm.",
            sources: [],
            citations: [],
            sourceExcerpt: "[dev-mock] I felt exhausted after gardening yesterday.",
          },
          // A citation-less `supported` claim — without it the sourcesUncited "Supporting sources
          // (no exact sentence matched)" UI is unreachable in dev-mock (T23, D032 §12 Finding A).
          {
            id: "00000000-0000-4000-8000-000000000003",
            text: "[dev-mock] Mount Everest is the tallest mountain above sea level.",
            status: "done",
            verdict: "supported",
            evidence: "[dev-mock] Everest's summit is the highest point above sea level on Earth.",
            confidence: 0.95,
            reason: "[dev-mock] Confirmed by the mocked source, but no single sentence was pinpointed to cite.",
            sources: [
              { kind: "web", title: "[dev-mock] Source", domain: "example.com", url: "https://example.com/everest", status: "ok", retrievalMethod: "diy_fetch" },
            ],
            citations: [],
            sourceExcerpt: "[dev-mock] Mount Everest is the tallest mountain above sea level.",
          },
        ] : [],
        // `eligible` stays 2 with 3 claims: excluded claims are deliberately dropped from the
        // denominator (core's grounnel-store), so the mock teaches the same arithmetic as prod.
        score: { grounded_pct: status === "done" ? 100 : 0, grounded_n: status === "done" ? 2 : 0, unclear_n: 0, no_evidence_n: 0, contradicted_n: 0, not_checked_n: 1, eligible: 2 },
        caps_hit: false,
        started_at: new Date().toISOString(),
        elapsed_seconds: 3,
      };
    },
  };
}