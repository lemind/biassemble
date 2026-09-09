import { z } from "zod";
import { QUESTIONS_MIN, QUESTIONS_MAX } from "@/lib/constants";

/**
 * Public DTOs — shapes returned by Biassemble AI Core (private repo).
 * No prompts or model IDs in this repository.
 *
 * Zod schemas are the SSOT for runtime validation.
 * `contracts.generated.ts` is auto-generated from Core's `GET /v1/contracts`
 * via `pnpm generate:types` — use it as a reference when updating hand-written types.
 */

export interface GenerateQuestionRequest {
  sessionId: string;
  story: string;
}

export interface GenerateAssessmentRequest {
  sessionId: string;
  story: string;
  questions: string[];
  answers: string[];
}

/** AI returns 2–5 questions as a batch (all at once), plus isComplete flag. */
export const questionOutputSchema = z.object({
  questions: z.array(z.string().min(1)).min(QUESTIONS_MIN).max(QUESTIONS_MAX),
  isComplete: z.boolean(),
  prompt_version: z.string().nullish(),
  schema_version: z.string().nullish(),
});

export type QuestionOutput = z.infer<typeof questionOutputSchema>;

export const biasItemSchema = z.object({
  name: z.string().min(1),
  biasCatalogId: z.string().optional(),
  explanation: z.string().min(10),
  storyConnection: z.string().min(10),
  alternativePerspective: z.string().min(10),
});

/** Empty biases allowed when noBiasDetected is true. */
export const assessmentOutputSchema = z.object({
  biases: z.array(biasItemSchema),
  reflectionPrompt: z.string().min(10),
  prompt_version: z.string().nullish(),
  schema_version: z.string().nullish(),
});

export type AssessmentOutput = z.infer<typeof assessmentOutputSchema>;

// ── Grounnel (ADR-001, ADR-003) — mirrors biassemble-core's own grounnel.schemas.ts field-for-field. ──

export interface ExtractClaimsRequest {
  sessionId: string;
  text: string;
  /** Real end-user IP (ADR-001 §4) — forwarded as X-Grounnel-Client-IP so Core's per-IP rate
   * limiter sees the actual user, not this server's own egress IP. Optional so a caller without
   * one (e.g. a background job) still works; Core falls back to its own request.ip. */
  clientIp?: string;
}

export const extractClaimsOutputSchema = z.object({
  id: z.string(),
  // Core spec 019 — the run's public address, minted at creation so the link can be offered
  // before the result exists. Never the run id: that value is internal (019 FR-003).
  shareToken: z.string(),
});

export type ExtractClaimsOutput = z.infer<typeof extractClaimsOutputSchema>;

const grounnelSourceStatusSchema = z.enum(["ok", "paywalled", "unreachable", "blocked", "rate_limited"]);

// One list, used by both the polled status shape and the shared-assessment shape below.
const grounnelVerdictSchema = z.enum(["supported", "partially_supported", "unsupported", "contradicted", "unverifiable", "excluded"]);

const grounnelClaimSourceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("web"),
    title: z.string(),
    domain: z.string(),
    url: z.string(),
    status: grounnelSourceStatusSchema,
    // Added to biassemble-core's response after this schema was first written — was being
    // silently stripped by Zod's default parse. Optional since "attached" sources never have it.
    retrievalMethod: z.enum(["diy_fetch", "tavily_fallback"]).optional(),
  }),
  z.object({
    kind: z.literal("attached"),
    title: z.string(),
    documentId: z.string(),
  }),
]);

// D027 (biassemble-core) — one entry per VERIFY citation, in citation order, never merged by
// source; `url` is already the real resolved source URL, not the internal `source` label.
const grounnelClaimCitationSchema = z.object({
  source: z.string(),
  sentence: z.number(),
  url: z.string(),
  text: z.string(),
});

const grounnelClaimSchema = z.object({
  id: z.string(),
  text: z.string(),
  status: z.enum(["pending", "done", "failed"]),
  verdict: grounnelVerdictSchema.nullable(),
  evidence: z.string().nullable(),
  confidence: z.number().nullable(),
  reason: z.string().nullable(),
  sources: z.array(grounnelClaimSourceSchema),
  // Additive (D027) — defaulted so a claim from before this field existed still parses instead
  // of being silently stripped, same rationale as retrievalMethod/started_at above.
  citations: z.array(grounnelClaimCitationSchema).default([]),
  // Additive (D028, biassemble-core) — verified verbatim source-text substring, or null;
  // defaulted for the same reason as citations above.
  sourceExcerpt: z.string().nullable().default(null),
});

export const grounnelStatusResponseSchema = z.object({
  id: z.string(),
  status: z.enum(["extracting", "verifying", "done", "failed"]),
  progress: z.object({
    checked: z.number(),
    total: z.number(),
  }),
  claims: z.array(grounnelClaimSchema),
  score: z.object({
    grounded_pct: z.number(),
    grounded_n: z.number(),
    unclear_n: z.number(),
    no_evidence_n: z.number(),
    contradicted_n: z.number(),
    not_checked_n: z.number(),
    eligible: z.number(),
  }),
  caps_hit: z.boolean(),
  // Added to biassemble-core's response after this schema was first written — was being
  // silently stripped by Zod's default parse. Lets a future poller show elapsed time/ETA.
  started_at: z.string().datetime().nullable(),
  elapsed_seconds: z.number().int().nonnegative().nullable(),
});

export type GrounnelStatusOutput = z.infer<typeof grounnelStatusResponseSchema>;

// Core spec 019 — the shared assessment, as GET /assessment/:token returns it. Public shape: no
// run id, no session id, no telemetry, and no claim ids (which is why the page keys claims by
// position). Citations are not persisted in core, so a shared claim has none.
export const sharedClaimSchema = z.object({
  text: z.string(),
  verdict: grounnelVerdictSchema.nullable(),
  evidence: z.string().nullable(),
  confidence: z.number().nullable(),
  reason: z.string().nullable(),
  sources: z.array(grounnelClaimSourceSchema),
  sourceExcerpt: z.string().nullable(),
});

export const sharedAssessmentSchema = z.object({
  status: z.enum(["extracting", "verifying", "done", "failed"]),
  text: z.string(),
  claims: z.array(sharedClaimSchema),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
});

export type SharedAssessment = z.infer<typeof sharedAssessmentSchema>;
