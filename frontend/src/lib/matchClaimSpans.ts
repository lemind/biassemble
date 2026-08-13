import type { Claim } from '../types/grounnel';

/**
 * Character offsets into the original articleText string (not lowercased — case-folding is
 * length-preserving for the ASCII/Latin text this deals with, so offsets computed against a
 * lowercased copy still index correctly into the original).
 */
export interface Span {
  start: number;
  end: number;
  // Only set on spans returned by matchClaimSpans() itself — plain internal spans (sentence/
  // clause candidates before overlap resolution) don't carry one. MatchTier.Fallback here is the
  // signal a renderer needs to visually flag "best-effort guess, not a confirmed match to this
  // exact text" (real observed confusion, 2026-08-12: a claim about an unrelated fact fell back
  // onto a date-heavy sentence purely because it was the least-bad available slot, and rendered
  // indistinguishably from a real match — the user read its verdict label as being about the date).
  tier?: MatchTier;
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
// Also breaks on a bare newline run, not just punctuation+whitespace — real observed bug,
// 2026-08-13: a plain-text section heading with no ending punctuation ("Family and early years")
// was merging straight into the next real sentence, and splitClauses' "and"/"but" boundary then
// isolated the heading's own "and" as a fake clause break, producing a nonsense 1-word "Family"
// candidate that won a fallback match for an unrelated claim.
function splitSentences(articleText: string): Sentence[] {
  const sentences: Sentence[] = [];
  // \r? before \n+ — code-review finding, 2026-08-13: without it, a CRLF-ended line left a
  // stray trailing \r attached to the end of the preceding sentence's text (harmless today
  // since trim() runs before classification/comparison, but a latent landmine otherwise).
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

// Starting point, not tuned by measurement yet — same caveat as JACCARD_THRESHOLD above.
// Revisit if real usage shows it's wrong (code-review finding, 2026-08-13).
const HEADING_MAX_CONTENT_WORDS = 6;

// A heading has no sentence-ending punctuation and is short — "Family and early years", not
// "He wrote thousands of poems." Excluded from every non-exact match tier (Sentence/Clause/
// Fallback) so a section heading can never win a highlight for a claim it has nothing to do
// with; exact-substring matches are untouched since those are correct by construction regardless
// of what kind of text they land in. Counts CONTENT words via tokenize() (code-review finding,
// 2026-08-13), not a raw whitespace split — a raw split disagreed with this file's own word-
// significance definition elsewhere, e.g. misjudging a stopword-heavy title like "The Rise And
// Fall Of The Empire" (7 raw words, so NOT flagged as a heading) even though its content-word
// count ("rise", "fall", "empire") is clearly heading-length by every other measure in this file.
function isHeadingLike(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0 || /[.?!]/.test(trimmed)) return false;
  return tokenize(trimmed).size <= HEADING_MAX_CONTENT_WORDS;
}

// Confidence tier, lowest wins an overlap conflict — a real, threshold-clearing match must never
// lose its highlight to a lower-confidence claim's desperate best-effort guess just because the
// guess's span happens to start a few characters earlier (e.g. a whole-sentence fallback always
// starts at or before any of its own clauses, which would otherwise let it evict an already-solid
// clause-level match purely on position).
export const MatchTier = {
  Exact: 0,
  Sentence: 1,
  Clause: 2,
  Fallback: 3,
} as const;
export type MatchTier = (typeof MatchTier)[keyof typeof MatchTier];

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
// The comma in "August 16, 1920" is NOT a clause boundary — it's part of one date. Real observed
// bug: without the lookahead below, a date got chopped at every internal comma (day/year AND
// year/year in a birth-death range), so "August 16, 1920" and "March 9, 1984" each got split into
// two separately-colored highlight fragments across two different claims instead of staying whole.
// The comma is only spared when it sits between a 1-2 digit day and a 4-digit year specifically
// (both the lookbehind AND lookahead must hold) — code-review finding, 2026-08-12: an earlier
// version of this fix keyed off the lookahead alone (any comma before a bare 4-digit number), which
// wrongly merged non-date clauses too, e.g. "He owns three cars, 1500 books, and a boat." stopped
// splitting at the comma before "1500" even though it's an ordinary list, not a date.
function splitClauses(sentence: Sentence): Span[] {
  const clauses: Span[] = [];
  const boundary = /(?<!\b\d{1,2}),\s+(?=\d{4}\b)|,\s+(?!\d{4}\b)|\s+(?:and|but)\s+/gi;
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
  // Unfiltered twins of the two lists above — code-review fix, 2026-08-13 (CONFIRMED crash,
  // reproduced): if isHeadingLike() excludes EVERY sentence in the article (a short heading-only
  // stub, or any article where nothing survives the filter), sentenceCandidates/clauseCandidates
  // both end up empty and the fallback tier below had nothing to rank, making `ranked[0]!` an
  // unchecked `undefined` that crashed matchClaimSpans' overlap-sort comparator. Kept as the true
  // last resort: the fallback ranking prefers non-heading candidates, but degrades to these when
  // the filtered lists are empty, so the "every claim gets a real span" guarantee still holds.
  const allSentenceCandidates: Array<{ span: Span; score: number }> = [];
  const allClauseCandidates: Array<{ span: Span; score: number }> = [];
  for (const sentence of sentences) {
    const sentenceEntry = {
      span: { start: sentence.start, end: sentence.end },
      score: jaccard(claimTokens, tokenize(sentence.text)),
    };
    allSentenceCandidates.push(sentenceEntry);
    const clauseEntries = splitClauses(sentence).map((clause) => ({
      span: clause,
      score: jaccard(claimTokens, tokenize(articleText.slice(clause.start, clause.end))),
    }));
    allClauseCandidates.push(...clauseEntries);
    if (isHeadingLike(sentence.text)) continue;
    sentenceCandidates.push(sentenceEntry);
    clauseCandidates.push(...clauseEntries);
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
  const rankedFiltered = [...sentenceCandidates, ...clauseCandidates].sort((a, b) => b.score - a.score).map((c) => c.span);
  const ranked =
    rankedFiltered.length > 0
      ? rankedFiltered
      : [...allSentenceCandidates, ...allClauseCandidates].sort((a, b) => b.score - a.score).map((c) => c.span);
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
 *
 * Every returned span carries its MatchTier so a renderer can visually distinguish a confirmed
 * match (Exact/Sentence/Clause, all threshold-gated) from a Fallback guess, which by definition
 * never cleared JACCARD_THRESHOLD and can land on text the claim isn't actually about.
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
 * that claim actually cleared JACCARD_THRESHOLD and got a rendered highlight. Every claim gets
 * an answer (closest sentence by raw score, no threshold), including ones matchClaimSpans
 * couldn't place at all, so the progress row can still group an unmatched claim with its matched
 * siblings from the same sentence instead of losing track of it entirely.
 */
export function assignHomeSentence(articleText: string, claims: Claim[]): Map<string, number> {
  const sentences = splitSentences(articleText);
  const sentenceTokens = sentences.map((s) => tokenize(s.text));
  // Consistency with matchClaimSpans (code-review finding, 2026-08-13): a heading can win here
  // only if literally nothing else is available. Without this, a claim's progress-dot grouping
  // could point at a heading (now its own low-token-count sentence since splitSentences also
  // breaks on bare newlines) that matchClaimSpans itself guarantees can never actually be
  // highlighted — the dot and the real highlight would visibly disagree about the claim's home.
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
