// The two article-level headline numbers (spec 004, T048-T053). Both are policy, not fitted to
// any corpus; the reasoning behind each weight is in tasks.md Phase 7.
import type { Claim, ClaimVerdict } from '../types/grounnel';

export interface ArticleScore {
  /** 0-100, or null when there is no evidence direction to summarise. */
  groundedness: number | null;
  /** 0-100. Always present once anything was extracted — it measures the assessment, not the text. */
  completeness: number;
  /** Why groundedness is null, for the copy that replaces the number. */
  suppressed: 'too-few' | 'no-direction' | null;
  counts: Counts;
}

export interface Counts {
  supported: number;
  partiallySupported: number;
  unsupported: number;
  unverifiable: number;
  contradicted: number;
  /** Never searched — opinion, personal, prediction. Outside N by design. */
  excluded: number;
  /** Our failure, not the article's: outside N, and only ever lowers completeness. */
  noVerdict: number;
  /** supported + partiallySupported + unsupported + unverifiable + contradicted */
  checked: number;
}

const MIN_CHECKED = 5;
/** Above this many checked claims, sample size stops adding to completeness. */
const SAMPLE_SATURATION = 20;

export function countClaims(claims: Claim[]): Counts {
  const c: Counts = {
    supported: 0, partiallySupported: 0, unsupported: 0, unverifiable: 0,
    contradicted: 0, excluded: 0, noVerdict: 0, checked: 0,
  };
  const bucket: Record<Exclude<ClaimVerdict, 'excluded'>, keyof Counts> = {
    supported: 'supported',
    partially_supported: 'partiallySupported',
    unsupported: 'unsupported',
    unverifiable: 'unverifiable',
    contradicted: 'contradicted',
  };

  for (const claim of claims) {
    if (claim.verdict === 'excluded') { c.excluded++; continue; }
    // A claim still pending on a finished run never resolved either — same bucket as a failure.
    if (claim.status !== 'done' || claim.verdict === null) { c.noVerdict++; continue; }
    c[bucket[claim.verdict]]++;
  }
  c.checked = c.supported + c.partiallySupported + c.unsupported + c.unverifiable + c.contradicted;
  return c;
}

export function articleScore(claims: Claim[]): ArticleScore {
  const counts = countClaims(claims);
  const { supported: S, partiallySupported: P, contradicted: C, checked: N, noVerdict, excluded } = counts;

  const attempted = N + noVerdict;
  const coverage = attempted + excluded === 0 ? 0 : attempted / (attempted + excluded);
  const completion = attempted === 0 ? 0 : N / attempted;
  const sample = Math.min(1, N / SAMPLE_SATURATION);
  const completeness = Math.round(100 * (0.4 * coverage + 0.4 * completion + 0.2 * sample));

  // One claim moves a 5-claim score by 20 points; below that the number is noise.
  if (N < MIN_CHECKED) return { groundedness: null, completeness, suppressed: 'too-few', counts };

  // A groundedness score is shown only when the assessment contains at least one decisive
  // verdict. Otherwise the article has no evidence direction to summarise, and a computed 0
  // would read as "refuted" for something merely unfindable. Partial support is not decisive.
  if (S + C === 0) return { groundedness: null, completeness, suppressed: 'no-direction', counts };

  // Contradiction multiplies rather than subtracts, so "a source refutes this" lands materially
  // below "nobody wrote about this" — which a plain S/N scores identically.
  const groundedness = Math.round(100 * ((S + 0.5 * P) / N) * (1 - C / N));
  return { groundedness, completeness, suppressed: null, counts };
}

export function groundednessColor(score: number): string {
  if (score >= 75) return 'text-success';
  if (score >= 50) return 'text-warning';
  if (score >= 25) return 'text-info';
  return 'text-error';
}

export function completenessColor(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 60) return 'text-warning';
  if (score >= 40) return 'text-info';
  return 'text-error';
}
