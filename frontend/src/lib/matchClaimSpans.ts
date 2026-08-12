import type { Claim } from '../types/grounnel';

/**
 * Character offsets into the original articleText string (not lowercased — case-folding is
 * length-preserving for the ASCII/Latin text this deals with, so offsets computed against a
 * lowercased copy still index correctly into the original).
 */
export interface Span {
  start: number;
  end: number;
}

// Starting point, not tuned by measurement yet — see plan.md's Design Decisions. Revisit as this
// one named constant if real usage shows it's wrong.
const JACCARD_THRESHOLD = 0.5;

const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'of',
  'to',
  'in',
  'on',
  'at',
  'for',
  'with',
  'by',
  'from',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'it',
  'its',
  'this',
  'that',
  'these',
  'those',
  'as',
  'has',
  'have',
  'had',
  'not',
  'no',
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 0 && !STOPWORDS.has(word)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection++;
  }
  const unionSize = a.size + b.size - intersection;
  return unionSize === 0 ? 0 : intersection / unionSize;
}

interface Sentence extends Span {
  text: string;
}

// Naive splitter — known failure modes (abbreviations, decimal-adjacent punctuation, ellipses)
// are accepted for v1: a bad split can only ever cause a *missed* highlight, never a wrong color.
function splitSentences(articleText: string): Sentence[] {
  const sentences: Sentence[] = [];
  const boundary = /[.?!]+\s+/g;
  let start = 0;
  let match: RegExpExecArray | null;
  while ((match = boundary.exec(articleText)) !== null) {
    const end = match.index + match[0].length;
    sentences.push({ start, end, text: articleText.slice(start, end) });
    start = end;
  }
  if (start < articleText.length) {
    sentences.push({ start, end: articleText.length, text: articleText.slice(start) });
  }
  return sentences;
}

// Confidence tier, lowest wins an overlap conflict — a real, threshold-clearing match must never
// lose its highlight to a lower-confidence claim's desperate best-effort guess just because the
// guess's span happens to start a few characters earlier (e.g. a whole-sentence fallback always
// starts at or before any of its own clauses, which would otherwise let it evict an already-solid
// clause-level match purely on position).
const MatchTier = {
  Exact: 0,
  Sentence: 1,
  Clause: 2,
  Fallback: 3,
} as const;
type MatchTier = (typeof MatchTier)[keyof typeof MatchTier];

interface TieredSpan {
  span: Span;
  tier: MatchTier;
  // Only populated for MatchTier.Fallback — every sentence ranked by score, best first, so
  // matchClaimSpans can walk past an already-occupied top choice instead of going straight to
  // null. Exact/Sentence/Clause tiers don't need this: a real match earns its own span outright.
  rankedFallbacks?: Span[];
}

function findExactMatch(articleText: string, claimText: string): TieredSpan | null {
  const index = articleText.toLowerCase().indexOf(claimText.toLowerCase());
  if (index === -1) return null;
  return { span: { start: index, end: index + claimText.length }, tier: MatchTier.Exact };
}

// A compound sentence bundling several atomic facts ("He wrote thousands of poems, hundreds of
// short stories and six novels...") dilutes Jaccard when scored whole — a claim extracted for
// just one of those facts shares few tokens against the sentence's combined token set. Splitting
// on commas and "and"/"but" gives each fact its own, much smaller candidate span to match against.
function splitClauses(sentence: Sentence): Span[] {
  const clauses: Span[] = [];
  const boundary = /,\s+|\s+(?:and|but)\s+/gi;
  let start = sentence.start;
  let match: RegExpExecArray | null;
  while ((match = boundary.exec(sentence.text)) !== null) {
    const end = sentence.start + match.index;
    if (end > start) clauses.push({ start, end });
    start = sentence.start + match.index + match[0].length;
  }
  if (start < sentence.end) clauses.push({ start, end: sentence.end });
  return clauses;
}

function bestScoring(candidates: Array<{ span: Span; score: number }>): { span: Span; score: number } | null {
  let best: { span: Span; score: number } | null = null;
  for (const candidate of candidates) {
    if (candidate.score >= JACCARD_THRESHOLD && (!best || candidate.score > best.score)) best = candidate;
  }
  return best;
}

function findSentenceMatch(articleText: string, claimText: string): TieredSpan | null {
  const claimTokens = tokenize(claimText);
  const sentences = splitSentences(articleText);
  if (sentences.length === 0) return null;

  // Score every sentence and every clause within it exactly once, up front — the three tiers
  // below (whole-sentence, clause, no-threshold fallback) all read from these same two lists
  // instead of each re-tokenizing and re-scoring the identical spans (review finding, 2026-08-12:
  // the fallback tier used to redo this work a third time after the two tiers above it already
  // did it, discarding the scores each time because they only checked against JACCARD_THRESHOLD).
  const sentenceCandidates: Array<{ span: Span; score: number }> = [];
  const clauseCandidates: Array<{ span: Span; score: number }> = [];
  for (const sentence of sentences) {
    sentenceCandidates.push({
      span: { start: sentence.start, end: sentence.end },
      score: jaccard(claimTokens, tokenize(sentence.text)),
    });
    for (const clause of splitClauses(sentence)) {
      clauseCandidates.push({
        span: clause,
        score: jaccard(claimTokens, tokenize(articleText.slice(clause.start, clause.end))),
      });
    }
  }

  // Whole-sentence pass first, exactly as before (matchClaimSpans.test.ts's appositive/pronoun/
  // ellipsis cases all clear the threshold at this stage already — a compound sentence bundling
  // multiple facts is the only case where nothing here reaches JACCARD_THRESHOLD).
  const bestSentence = bestScoring(sentenceCandidates);
  if (bestSentence) return { span: bestSentence.span, tier: MatchTier.Sentence };

  // Clause fallback, only reached when no whole sentence matched anything — splitting on commas
  // and "and"/"but" gives each fact in a compound sentence its own smaller candidate to match
  // against, instead of always being diluted by its siblings' tokens.
  const bestClause = bestScoring(clauseCandidates);
  if (bestClause) return { span: bestClause.span, tier: MatchTier.Clause };

  // Last resort, no threshold — every claim gets located SOMEWHERE rather than left out of the
  // article body entirely (user-requested tradeoff, 2026-08-12: "I want all claims highlighted
  // anyhow"). Candidates include both whole sentences AND their individual clauses, not just
  // sentences — a short article with many claims densely packs multiple real clause-level matches
  // into one sentence, so a whole-sentence-only fallback would conflict with virtually every
  // sentence that already has any real match in it at all, even where most of its characters are
  // still free. Ranked by score, best first, so matchClaimSpans can walk down to the next-best
  // candidate when a higher one is already occupied, instead of colliding and losing outright.
  const ranked = [...sentenceCandidates, ...clauseCandidates].sort((a, b) => b.score - a.score).map((c) => c.span);
  return { span: ranked[0]!, tier: MatchTier.Fallback, rankedFallbacks: ranked };
}

/**
 * Locates each claim's span in the pasted article, best-effort. Presentation-only — never
 * affects verdict computation (see plan.md's Design Decisions). Runs over every claim regardless
 * of status (pending included, per FR-005). Every claim gets a real span as long as the article
 * has at least one sentence — see findSentenceMatch's no-threshold last resort tier.
 *
 * Overlap resolution: higher-confidence tiers win first (MatchTier — exact beats sentence beats
 * clause beats the no-threshold fallback), so a real match is never evicted by a lower-confidence
 * claim's span merely because that guess happens to start a few characters earlier (a whole-
 * sentence fallback always starts at or before any clause within it). Within the same tier, the
 * claim whose span starts earliest wins; on an exact tie, the lower claim.id wins. This is
 * independent of claims[] array order on purpose (biassemble-core gives no ordering guarantee
 * across polls) — logs a dev-only console.warn per discarded overlap so collision frequency is
 * observable.
 */
export function matchClaimSpans(articleText: string, claims: Claim[]): Map<string, Span | null> {
  const candidates = new Map<string, TieredSpan | null>();
  for (const claim of claims) {
    candidates.set(
      claim.id,
      findExactMatch(articleText, claim.text) ?? findSentenceMatch(articleText, claim.text),
    );
  }

  const result = new Map<string, Span | null>();
  const matched = claims
    .filter((claim) => candidates.get(claim.id) !== null)
    .sort((a, b) => {
      const tieredA = candidates.get(a.id)!;
      const tieredB = candidates.get(b.id)!;
      if (tieredA.tier !== tieredB.tier) return tieredA.tier - tieredB.tier;
      if (tieredA.span.start !== tieredB.span.start) return tieredA.span.start - tieredB.span.start;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });

  const conflicts = (span: Span, occupied: Array<{ span: Span; claimId: string }>) =>
    occupied.find((o) => span.start < o.span.end && o.span.start < span.end);

  const occupied: Array<{ span: Span; claimId: string }> = [];
  for (const claim of matched) {
    const tiered = candidates.get(claim.id)!;
    // Fallback tier only: don't stop at the top-ranked sentence if something higher-priority
    // (a real match, or an earlier-processed fallback claim) already occupies it — walk down the
    // ranked list to the next-best sentence instead of giving up outright (still "some claims
    // highlighted" beats "all-or-nothing on the single best guess").
    const span =
      tiered.tier === MatchTier.Fallback && tiered.rankedFallbacks
        ? (tiered.rankedFallbacks.find((candidate) => !conflicts(candidate, occupied)) ?? tiered.span)
        : tiered.span;
    const conflict = conflicts(span, occupied);
    if (conflict) {
      // import.meta.env is Vite-injected — undefined when this module runs outside Vite's
      // transform (e.g. these tests, via plain tsx), so `.env` itself must be optionally chained.
      if (import.meta.env?.DEV) {
        console.warn(
          `[matchClaimSpans] overlap: claim ${claim.id} discarded in favor of ${conflict.claimId}`,
        );
      }
      result.set(claim.id, null);
    } else {
      result.set(claim.id, span);
      occupied.push({ span, claimId: claim.id });
    }
  }

  for (const claim of claims) {
    if (!result.has(claim.id)) result.set(claim.id, null);
  }

  return result;
}

/**
 * Wikipedia-style reference numbers, 1-based: matched claims first in reading order (by span
 * start — same ordering ClaimSourceList already used before this existed), then unmatched claims
 * appended in claims[] order. A single shared function so HighlightedArticle's inline "[n]"
 * markers and the References list at the bottom can never disagree about which number is whose —
 * both call this with the same (articleText, claims) and get the same answer.
 *
 * `precomputedSpans` is optional — a caller that already ran `matchClaimSpans` for its own
 * purposes (e.g. HighlightedArticle building highlight segments) can pass that result straight
 * through instead of paying for the same O(claims × sentences) scan a second time.
 */
export function numberClaims(
  articleText: string,
  claims: Claim[],
  precomputedSpans?: Map<string, Span | null>
): Map<string, number> {
  const spans = precomputedSpans ?? matchClaimSpans(articleText, claims);
  const matched = claims
    .filter((claim) => spans.get(claim.id) !== null)
    .sort((a, b) => spans.get(a.id)!.start - spans.get(b.id)!.start);
  const unmatched = claims.filter((claim) => spans.get(claim.id) === null);

  const result = new Map<string, number>();
  [...matched, ...unmatched].forEach((claim, index) => result.set(claim.id, index + 1));
  return result;
}

/**
 * Which sentence a claim "belongs to," for progress-dot grouping only — independent of whether
 * that claim actually cleared JACCARD_THRESHOLD and got a rendered highlight. Every claim gets
 * an answer (closest sentence by raw score, no threshold), including ones matchClaimSpans
 * couldn't place at all, so the progress row can still group an unmatched claim with its matched
 * siblings from the same sentence instead of losing track of it entirely.
 */
export function assignHomeSentence(articleText: string, claims: Claim[]): Map<string, number> {
  const sentences = splitSentences(articleText);
  const sentenceTokens = sentences.map((s) => tokenize(s.text));
  const result = new Map<string, number>();
  // Negative, strictly-decreasing counter for claims with zero real overlap against every
  // sentence — each gets its own unique group instead of all silently defaulting to sentence 0,
  // which would falsely bucket unrelated zero-overlap claims together as if they shared a home.
  let nextUngroupedIndex = -1;
  for (const claim of claims) {
    const claimTokens = tokenize(claim.text);
    let bestIndex = -1;
    let bestScore = 0;
    sentenceTokens.forEach((tokens, index) => {
      const score = jaccard(claimTokens, tokens);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    result.set(claim.id, bestIndex === -1 ? nextUngroupedIndex-- : bestIndex);
  }
  return result;
}
