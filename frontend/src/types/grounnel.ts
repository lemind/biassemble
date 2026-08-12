/**
 * Grounnel API types — mirrors backend/src/lib/ai/contracts.ts's Grounnel shapes,
 * which themselves mirror biassemble-core/src/contracts/grounnel.schemas.ts field-for-field.
 * Plain interfaces, not Zod, matching this file's existing types/api.ts convention.
 */

export interface ExtractGrounnelResponse {
  id: string;
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
  | 'unverifiable';

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
