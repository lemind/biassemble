import type { Claim } from '../types/grounnel';

/**
 * Character offsets into the original articleText string (not lowercased — case-folding is
 * length-preserving for the ASCII/Latin text this deals with, so offsets computed against a
 * lowercased copy still index correctly into the original).
 */
export interface Span {
  start: number;
  end: number;
  // Only set on spans returned by matchClaimSpans() itself — plain internal spans (sentence
  // candidates before overlap resolution) don't carry one. MatchTier.Sentence here is the signal
  // a renderer needs to visually flag "best-effort guess, not the verified source excerpt" — it
  // only fires when biassemble-core's own source_excerpt is missing or couldn't be located.
  tier?: MatchTier;
}

// D028 (biassemble-core) — every claim now carries a verified, verbatim source_excerpt from
// EXTRACT. That's the primary locator (findSourceExcerptSpan below); this file's job shrank from
// "guess where a paraphrased claim came from" to "find one already-known exact quote, and fall
// back to a simple whole-sentence guess when it's missing or can't be located." The old
// clause-splitting machinery is deleted (it existed only to patch dilution in a compound sentence,
// moot now that a real excerpt is the primary path) — see D028 and the biassemble plan history.
// Heading exclusion (isHeadingLike below) is KEPT for the fallback tier: review finding, 2026-08-13
// — splitSentences() alone still isolates a short heading as its own sentence (via the newline
// boundary), independent of clause-splitting, and Jaccard's small-denominator bias lets a short
// heading that happens to lexically echo the claim's wording outscore the real, longer sentence.

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
// are accepted: a bad split can only ever cause a *missed* fallback highlight, never a wrong
// color, and the fallback tier is now a rare last resort (only reached when source_excerpt is
// missing or unlocatable), not the primary matching mechanism it used to be.
function splitSentences(articleText: string): Sentence[] {
  const sentences: Sentence[] = [];
  const boundary = /[.?!]+\s+|\r?\n+/g;
  let start = 0;
  let match: RegExpExecArray | null;
  while ((match = boundary.exec(articleText)) !== null) {
    const end = match.index + match[0].length;
    const text = articleText.slice(start, end);
    if (text.trim().length > 0) sentences.push({ start, end, text });
    start = end;
  }
  if (start < articleText.length) {
    sentences.push({ start, end: articleText.length, text: articleText.slice(start) });
  }
  return sentences;
}

// Starting point, not tuned by measurement — same caveat as JACCARD_THRESHOLD's old usage.
const HEADING_MAX_CONTENT_WORDS = 6;

// A heading has no sentence-ending punctuation and is short — "Family and early years", not
// "He wrote thousands of poems." Only relevant to the fallback tier (findFallbackSentenceSpan/
// assignHomeSentence) — a verified source_excerpt (Exact tier) is correct by construction
// regardless of what kind of text it lands in.
function isHeadingLike(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0 || /[.?!]/.test(trimmed)) return false;
  return tokenize(trimmed).size <= HEADING_MAX_CONTENT_WORDS;
}

// Two tiers only: Exact (a verified source_excerpt, located either verbatim or via a
// whitespace-normalized secondary lookup) beats Sentence (the no-threshold whole-sentence
// fallback, used only when source_excerpt is null or can't be found at all).
export const MatchTier = {
  Exact: 0,
  Sentence: 1,
} as const;
export type MatchTier = (typeof MatchTier)[keyof typeof MatchTier];

interface TieredSpan {
  span: Span;
  tier: MatchTier;
  // Only populated for MatchTier.Sentence — every sentence ranked by score, best first, so
  // matchClaimSpans can walk past an already-occupied top choice instead of going straight to
  // null. Exact doesn't need this: a real located excerpt earns its own span outright.
  rankedFallbacks?: Span[];
}

interface NormalizedIndexMap {
  normalized: string;
  // origIndex[i] = the index into the ORIGINAL string where normalized[i] begins. A run of
  // whitespace collapses to one normalized space but still only contributes ONE entry (the run's
  // start), so mapping a normalized index back never depends on an intermediate string's own
  // offsets — only ever on the original string passed in.
  origIndex: number[];
}

function buildNormalizedIndexMap(original: string): NormalizedIndexMap {
  let normalized = '';
  const origIndex: number[] = [];
  let i = 0;
  while (i < original.length) {
    const ch = original[i]!;
    if (/\s/.test(ch)) {
      const runStart = i;
      while (i < original.length && /\s/.test(original[i]!)) i++;
      normalized += ' ';
      origIndex.push(runStart);
    } else {
      normalized += ch;
      origIndex.push(i);
      i++;
    }
  }
  return { normalized, origIndex };
}

// Secondary, rare path — only reached when a plain indexOf on the raw strings misses (e.g. a
// line-ending or whitespace-collapsing difference introduced somewhere between EXTRACT verifying
// the excerpt server-side and this exact string reaching the browser). Review finding: the naive
// version of this (normalize both strings, indexOf in the normalized copy, reuse that index
// directly against the original) is wrong whenever normalization changes anything BEFORE the
// match point — every later offset shifts, silently pointing the returned span at the wrong
// characters. This instead walks the original string's own index map, so start/end are always
// real offsets into articleText as given, never offsets into an intermediate normalized copy.
function findNormalizedSpan(articleText: string, sourceExcerpt: string): Span | null {
  const trimmedExcerpt = sourceExcerpt.trim();
  if (trimmedExcerpt.length === 0) return null;
  const articleMap = buildNormalizedIndexMap(articleText);
  const excerptMap = buildNormalizedIndexMap(trimmedExcerpt);
  const idx = articleMap.normalized.indexOf(excerptMap.normalized);
  if (idx === -1) return null;
  const start = articleMap.origIndex[idx]!;
  const lastNormalizedIdx = idx + excerptMap.normalized.length - 1;
  // +1: the last normalized char of a trimmed excerpt is never a collapsed whitespace run (those
  // only ever produce an INTERNAL single space), so it maps 1:1 to exactly one original char.
  const end = articleMap.origIndex[lastNormalizedIdx]! + 1;
  return { start, end };
}

// Primary locator (D028) — source_excerpt is a verified verbatim substring of the article text
// (biassemble-core's extract.service.ts already checked text.includes(source_excerpt) before
// ever setting it, strict and un-normalized), so the common case is a plain, un-normalized
// indexOf — no coordinate-mapping problem at all. First occurrence wins if the excerpt happens to
// appear more than once (core doesn't guarantee uniqueness, only asks for it as prompt guidance).
// Review finding, 2026-08-13: a degenerate excerpt (whitespace/punctuation only) would otherwise
// trivially indexOf-match almost any paragraph and win Exact tier — the tier the UI treats as
// fully confirmed, with no "approximate location" disclaimer — so require ≥1 real content word.
function findSourceExcerptSpan(articleText: string, sourceExcerpt: string | null): TieredSpan | null {
  if (!sourceExcerpt || tokenize(sourceExcerpt).size === 0) return null;
  const exact = articleText.indexOf(sourceExcerpt);
  if (exact !== -1) {
    return { span: { start: exact, end: exact + sourceExcerpt.length }, tier: MatchTier.Exact };
  }
  const normalized = findNormalizedSpan(articleText, sourceExcerpt);
  return normalized ? { span: normalized, tier: MatchTier.Exact } : null;
}

// Fallback (only reached when source_excerpt is null or unlocatable): whole-sentence Jaccard, no
// threshold — always returns the best-scoring sentence as long as the article has ≥1 sentence.
// Structurally incapable of the old degenerate-fragment bug class (a splitSentences() sentence is
// never a single stray word by construction), but NOT of the heading bug class on its own — a
// short heading is still a full, eligible sentence, and Jaccard's small-denominator bias lets one
// that lexically echoes the claim outscore the real, longer sentence (review finding, 2026-08-13).
// Headings are excluded unless literally nothing else is available, same "degrade only as a last
// resort" pattern as the ranked-fallback walk below. Ranked, not just the single best, so overlap
// resolution can walk to the next-best sentence when the top choice is already occupied.
function findFallbackSentenceSpan(articleText: string, claimText: string): TieredSpan | null {
  const claimTokens = tokenize(claimText);
  const sentences = splitSentences(articleText);
  if (sentences.length === 0) return null;
  const nonHeading = sentences.filter((s) => !isHeadingLike(s.text));
  const candidates = nonHeading.length > 0 ? nonHeading : sentences;
  const ranked = candidates
    .map((sentence) => ({
      span: { start: sentence.start, end: sentence.end },
      score: jaccard(claimTokens, tokenize(sentence.text)),
    }))
    .sort((a, b) => b.score - a.score)
    .map((c) => c.span);
  return { span: ranked[0]!, tier: MatchTier.Sentence, rankedFallbacks: ranked };
}

/**
 * Locates each claim's span in the pasted article, best-effort. Presentation-only — never
 * affects verdict computation. Runs over every claim regardless of status (pending included).
 * Every claim gets a real span as long as the article has at least one sentence — see
 * findFallbackSentenceSpan's no-threshold last resort.
 *
 * Overlap resolution: Exact (a verified source_excerpt) always wins over Sentence (a fallback
 * guess), so a real match is never evicted by a lower-confidence claim's guess merely because the
 * guess's span happens to start a few characters earlier. Within the same tier, the claim whose
 * span starts earliest wins; on an exact tie, the lower claim.id wins. This is independent of
 * claims[] array order on purpose (biassemble-core gives no ordering guarantee across polls) —
 * logs a dev-only console.warn per discarded overlap so collision frequency is observable.
 *
 * Every returned span carries its MatchTier so a renderer can visually distinguish a verified
 * source_excerpt (Exact) from a Sentence-tier guess, which by definition isn't confirmed to be
 * about the same text it landed on.
 */
export function matchClaimSpans(articleText: string, claims: Claim[]): Map<string, Span | null> {
  const candidates = new Map<string, TieredSpan | null>();
  for (const claim of claims) {
    candidates.set(
      claim.id,
      findSourceExcerptSpan(articleText, claim.sourceExcerpt) ?? findFallbackSentenceSpan(articleText, claim.text),
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
    // Sentence tier only: don't stop at the top-ranked sentence if something higher-priority
    // (a real excerpt match, or an earlier-processed fallback claim) already occupies it — walk
    // down the ranked list to the next-best sentence instead of giving up outright.
    const span =
      tiered.tier === MatchTier.Sentence && tiered.rankedFallbacks
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
      const taggedSpan = { ...span, tier: tiered.tier };
      result.set(claim.id, taggedSpan);
      occupied.push({ span: taggedSpan, claimId: claim.id });
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
 * matchClaimSpans actually placed that claim via a verified excerpt. Every claim gets an answer
 * (closest sentence by raw score, no threshold), including ones matchClaimSpans couldn't place at
 * all, so the progress row can still group an unmatched claim with its matched siblings from the
 * same sentence instead of losing track of it entirely.
 */
export function assignHomeSentence(articleText: string, claims: Claim[]): Map<string, number> {
  const sentences = splitSentences(articleText);
  const sentenceTokens = sentences.map((s) => tokenize(s.text));
  // Consistency with findFallbackSentenceSpan (review finding, 2026-08-13): a heading can win here
  // only if literally nothing else is available, so a claim's progress-dot grouping never points
  // at a heading that the article body would never actually highlight it against.
  const isHeading = sentences.map((s) => isHeadingLike(s.text));
  const anyNonHeading = isHeading.some((heading) => !heading);
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
      if (anyNonHeading && isHeading[index]) return;
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
