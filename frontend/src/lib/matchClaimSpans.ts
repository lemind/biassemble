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

function findSentenceMatch(articleText: string, claimText: string): Span | null {
  const claimTokens = tokenize(claimText);
  let best: { score: number; span: Span } | null = null;
  for (const sentence of splitSentences(articleText)) {
    const score = jaccard(claimTokens, tokenize(sentence.text));
    if (score >= JACCARD_THRESHOLD && (!best || score > best.score)) {
      best = { score, span: { start: sentence.start, end: sentence.end } };
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
