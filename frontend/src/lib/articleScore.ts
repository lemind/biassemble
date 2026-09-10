// The two article-level headline numbers (spec 004, T048-T053). Both are policy, not fitted to
// any corpus; the reasoning behind each weight is in tasks.md Phase 7.
import type { Claim, ClaimVerdict } from '../types/grounnel';

export interface ArticleScore {
  /** 0-100, or null when there is no evidence direction to summarise. */
  groundedness: number | null;
  /** 0-100, or null when the assessment's own denominator is unknown. */
  completeness: number | null;
  /** Why groundedness is null, for the copy that replaces the number. */
  suppressed: 'too-few' | 'no-direction' | 'unverified' | null;
  /** Why completeness is null. */
  completenessSuppressed: 'nothing-checkable' | 'capped' | 'unverified' | null;
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
/** ABOVE this share of checked claims contradicted, the score is driven by refutation. Strict:
 *  at N=5 a single contradiction is exactly 0.2, and one claim should not force the red ring. */
const REFUTED_SHARE = 0.2;

const warnedVerdicts = new Set<string>();

// Schema drift is invisible otherwise: the counts stay arithmetically valid, so nothing looks
// wrong. Once per distinct value, so a 100-claim run does not flood the console.
function warnUnknownVerdict(verdict: string): void {
  if (warnedVerdicts.has(verdict)) return;
  warnedVerdicts.add(verdict);
  console.warn(
    `[articleScore] unknown verdict "${verdict}" — counted as unresolved. This build's ClaimVerdict union has drifted from core's schema.`
  );
}

function withChecked(c: Omit<Counts, 'checked'>): Counts {
  return {
    ...c,
    checked: c.supported + c.partiallySupported + c.unsupported + c.unverifiable + c.contradicted,
  };
}

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
    const key = bucket[claim.verdict];
    // Fail safe on a verdict this build has never heard of: core's schema and this hand-mirrored
    // union can drift, and an unknown key would silently erase the claim from every denominator.
    if (key === undefined) {
      warnUnknownVerdict(claim.verdict);
      c.noVerdict++;
      continue;
    }
    c[key]++;
  }
  c.checked = c.supported + c.partiallySupported + c.unsupported + c.unverifiable + c.contradicted;
  return c;
}

/**
 * `authoritative` wins over the claims when given. A shared assessment's claim rows are written
 * best-effort, so a dropped row does not lower a score — it vanishes from every denominator, and
 * the shared link (the one that gets forwarded) would read higher than the run its owner saw.
 */
export function articleScore(
  claims: Claim[],
  capsHit = false,
  authoritative?: Omit<Counts, 'checked'>,
  /** Set for a shared assessment: without the snapshot its denominators cannot be trusted. */
  requireAuthoritative = false
): ArticleScore {
  const counts = authoritative ? withChecked(authoritative) : countClaims(claims);

  // A run finished before core snapshotted its counts. Falling back to the rows here would
  // reinstate exactly the inflated score the snapshot exists to prevent, silently.
  if (requireAuthoritative && !authoritative) {
    return {
      groundedness: null,
      completeness: null,
      suppressed: 'unverified',
      completenessSuppressed: 'unverified',
      counts,
    };
  }
  const { supported: S, partiallySupported: P, contradicted: C, checked: N, noVerdict, excluded } = counts;

  const attempted = N + noVerdict;
  const coverage = attempted + excluded === 0 ? 0 : attempted / (attempted + excluded);
  const completion = attempted === 0 ? 0 : N / attempted;
  // Coverage and completion only — a sample-size term here capped a flawless 5-claim run at 85.
  // Both suppressed cases mean "denominator unknown or meaningless", never a low score.
  const completenessSuppressed: ArticleScore['completenessSuppressed'] =
    capsHit ? 'capped' : attempted === 0 ? 'nothing-checkable' : null;
  const completeness = completenessSuppressed
    ? null
    : Math.round(100 * (0.5 * coverage + 0.5 * completion));
  const base = { completeness, completenessSuppressed, counts };

  // One claim moves a 5-claim score by 20 points; below that the number is noise.
  if (N < MIN_CHECKED) return { ...base, groundedness: null, suppressed: 'too-few' };

  // A groundedness score is shown only when the assessment contains at least one decisive
  // verdict. Otherwise the article has no evidence direction to summarise, and a computed 0
  // would read as "refuted" for something merely unfindable. Partial support is not decisive.
  if (S + C === 0) return { ...base, groundedness: null, suppressed: 'no-direction' };

  // Contradiction multiplies rather than subtracts, so "a source refutes this" lands materially
  // below "nobody wrote about this" — which a plain S/N scores identically.
  const groundedness = Math.round(100 * ((S + 0.5 * P) / N) * (1 - C / N));
  return { ...base, groundedness, suppressed: null };
}

/** Colour follows WHY the score is low: a thin article and a refuted one can share a score, so
 *  red is reserved for actual contradiction — what `error` already means on a claim. */
export function groundednessColor(score: number, counts: Counts): string {
  if (counts.checked > 0 && counts.contradicted / counts.checked > REFUTED_SHARE) return 'text-error';
  if (score >= 75) return 'text-success';
  // Blue is "nothing was refuted", so it must not be reachable while a contradiction exists —
  // below the red threshold a refutation still makes the article mixed, not merely thin.
  if (score >= 45 || counts.contradicted > 0) return 'text-warning';
  return 'text-info';
}

/** Never red: an article we could only partly assess is not wrong, just partly assessed. */
export function completenessColor(score: number): string {
  if (score >= 85) return 'text-success';
  if (score >= 65) return 'text-warning';
  return 'text-info';
}
