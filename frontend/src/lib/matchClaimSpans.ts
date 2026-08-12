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

function findExactMatch(articleText: string, claimText: string): Span | null {
  const index = articleText.toLowerCase().indexOf(claimText.toLowerCase());
  if (index === -1) return null;
  return { start: index, end: index + claimText.length };
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

function findSentenceMatch(articleText: string, claimText: string): Span | null {
  const claimTokens = tokenize(claimText);
  const sentences = splitSentences(articleText);

  // Whole-sentence pass first, exactly as before (matchClaimSpans.test.ts's appositive/pronoun/
  // ellipsis cases all clear the threshold at this stage already — a compound sentence bundling
  // multiple facts is the only case where nothing here reaches JACCARD_THRESHOLD).
  let best: { score: number; span: Span } | null = null;
  for (const sentence of sentences) {
    const score = jaccard(claimTokens, tokenize(sentence.text));
    if (score >= JACCARD_THRESHOLD && (!best || score > best.score)) {
      best = { score, span: { start: sentence.start, end: sentence.end } };
    }
  }
  if (best) return best.span;

  // Clause fallback, only reached when no whole sentence matched anything — splitting on commas
  // and "and"/"but" gives each fact in a compound sentence its own smaller candidate to match
  // against, instead of always being diluted by its siblings' tokens.
  for (const sentence of sentences) {
    for (const clause of splitClauses(sentence)) {
      const score = jaccard(claimTokens, tokenize(articleText.slice(clause.start, clause.end)));
      if (score >= JACCARD_THRESHOLD && (!best || score > best.score)) {
        best = { score, span: clause };
      }
    }
  }
  return best?.span ?? null;
}

/**
 * Locates each claim's span in the pasted article, best-effort. Presentation-only — never
 * affects verdict computation (see plan.md's Design Decisions). Runs over every claim regardless
 * of status (pending included, per FR-005).
 *
 * Overlap resolution: the claim whose matched span starts earliest wins; on an exact tie, the
 * lower claim.id wins. This is independent of claims[] array order on purpose (biassemble-core
 * gives no ordering guarantee across polls) — logs a dev-only console.warn per discarded overlap
 * so collision frequency is observable.
 */
export function matchClaimSpans(articleText: string, claims: Claim[]): Map<string, Span | null> {
  const candidates = new Map<string, Span | null>();
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
      const spanA = candidates.get(a.id)!;
      const spanB = candidates.get(b.id)!;
      if (spanA.start !== spanB.start) return spanA.start - spanB.start;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });

  const occupied: Array<{ span: Span; claimId: string }> = [];
  for (const claim of matched) {
    const span = candidates.get(claim.id)!;
    const conflict = occupied.find((o) => span.start < o.span.end && o.span.start < span.end);
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
