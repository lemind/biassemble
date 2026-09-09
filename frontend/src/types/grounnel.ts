/**
 * Grounnel API types — mirrors backend/src/lib/ai/contracts.ts's Grounnel shapes,
 * which themselves mirror biassemble-core/src/contracts/grounnel.schemas.ts field-for-field.
 * Plain interfaces, not Zod, matching this file's existing types/api.ts convention.
 */

export interface ExtractGrounnelResponse {
  id: string;
  // Required, matching core and backend. The run's PUBLIC address; `id` is internal and must
  // never reach a URL. Callers still guard at runtime — axios does not validate the body.
  shareToken: string;
}

export type GrounnelSourceStatus = 'ok' | 'paywalled' | 'unreachable' | 'blocked' | 'rate_limited';

export type ClaimSource =
  | {
      kind: 'web';
      title: string;
      domain: string;
      url: string;
      status: GrounnelSourceStatus;
      retrievalMethod?: 'diy_fetch' | 'tavily_fallback';
    }
  | {
      kind: 'attached';
      title: string;
      documentId: string;
    };

// D027 (biassemble-core) — one entry per VERIFY citation, in citation order, never merged by
// source; `url` is already the real resolved source URL, not the internal `source` label.
export interface ClaimCitation {
  source: string;
  sentence: number;
  url: string;
  text: string;
}

export type ClaimStatus = 'pending' | 'done' | 'failed';

export type ClaimVerdict =
  | 'supported'
  | 'partially_supported'
  | 'unsupported'
  | 'contradicted'
  | 'unverifiable'
  // D032 — a claim the eligibility filter never searched (opinion, personal, prediction). It has
  // no highlight style on purpose; it renders as ordinary text.
  | 'excluded';

export interface Claim {
  id: string;
  text: string;
  status: ClaimStatus;
  verdict: ClaimVerdict | null;
  evidence: string | null;
  confidence: number | null;
  reason: string | null;
  sources: ClaimSource[];
  citations: ClaimCitation[];
  // D028 (biassemble-core) — verified verbatim substring of the article text, or null when
  // unproduced/unverified; matchClaimSpans.ts uses this as its primary locator.
  sourceExcerpt: string | null;
}

// Core spec 019 — a shared assessment as GET /assessment/:token returns it. Public shape: no run
// id, no session id, and no claim ids, which is why SharedPage keys claims by position. Citations
// are not persisted in core, so a shared claim never has any.
export interface SharedClaim {
  text: string;
  verdict: ClaimVerdict | null;
  evidence: string | null;
  confidence: number | null;
  reason: string | null;
  sources: ClaimSource[];
  sourceExcerpt: string | null;
}

export interface SharedAssessment {
  status: GrounnelRunStatus;
  text: string;
  claims: SharedClaim[];
  createdAt: string;
  completedAt: string | null;
}

/** The subset of a run's state the progress row renders. `GrounnelStatusOutput` satisfies it, and
 *  so does a shared assessment adapted for it — which carries no Score. */
export interface RunProgress {
  status: GrounnelRunStatus;
  progress: { checked: number; total: number };
  claims: Claim[];
  caps_hit: boolean;
  elapsed_seconds: number | null;
}

export interface Score {
  grounded_pct: number;
  grounded_n: number;
  unclear_n: number;
  no_evidence_n: number;
  contradicted_n: number;
  not_checked_n: number;
  eligible: number;
}

export type GrounnelRunStatus = 'extracting' | 'verifying' | 'done' | 'failed';

export interface GrounnelStatusOutput {
  id: string;
  status: GrounnelRunStatus;
  progress: {
    checked: number;
    total: number;
  };
  claims: Claim[];
  score: Score;
  caps_hit: boolean;
  started_at: string | null;
  elapsed_seconds: number | null;
}
