import type { Claim, ClaimCitation, ClaimSource } from '../types/grounnel';
import { matchClaimSpans, numberClaims, type Span } from './matchClaimSpans';
import { isStyledClaim } from './verdictStyle';

export interface NumberedReference {
  number: number;
  url: string;
  citations: ClaimCitation[];
}

export interface CitationNumbering {
  claimNumbers: Map<string, number[]>;
  references: NumberedReference[];
}

// Real observed bug, 2026-08-12: a 14-entry References list for an article that visibly cites
// far fewer distinct sources — each claim's evidence search runs independently, so the "same"
// real page (e.g. the Charles Bukowski Wikipedia article) can come back with a different query
// string, fragment, or trailing slash depending on which claim's search surfaced it, and exact
// string equality on citation.url treated each variant as a separate source. Normalizing to
// origin+pathname before using it as the dedup key collapses those back into one entry. Falls
// back to the raw url unchanged if it doesn't parse (dedup key just degrades to old behavior).
function normalizeForDedup(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`.replace(/\/$/, '');
  } catch {
    return url;
  }
}

// Real observed bug, 2026-09-13: a References list ending at [2] for an article whose text showed
// only [1] — the second entry belonged to a claim HighlightedArticle never draws a <mark> for, so
// nothing on the page pointed at it. Numbering must see exactly the claims the reader can click
// from: a matched span (buildSegments drops the rest) and a styleable verdict (isStyledClaim).
function markedInReadingOrder(
  articleText: string,
  claims: Claim[],
  precomputedSpans?: Map<string, Span | null>
): Claim[] {
  const spans = precomputedSpans ?? matchClaimSpans(articleText, claims);
  const marked = claims.filter((claim) => spans.get(claim.id) != null && isStyledClaim(claim));
  const claimOrder = numberClaims(articleText, marked, spans);
  return marked.sort((a, b) => claimOrder.get(a.id)! - claimOrder.get(b.id)!);
}

// Wikipedia-style: one number per unique SOURCE (by url), not per claim and not per citation
// instance — the same source cited twice (from one claim or from two different claims) reuses
// its number instead of getting a second entry. Numbers assigned in reading order (numberClaims'
// own claim ordering, then citation order within each claim), so [1] is always the first citation
// a reader actually encounters scanning top to bottom.
export function numberCitations(
  articleText: string,
  claims: Claim[],
  precomputedSpans?: Map<string, Span | null>
): CitationNumbering {
  const ordered = markedInReadingOrder(articleText, claims, precomputedSpans);

  const urlToNumber = new Map<string, number>();
  const references: NumberedReference[] = [];
  const claimNumbers = new Map<string, number[]>();

  for (const claim of ordered) {
    const numbersForClaim: number[] = [];
    for (const citation of claim.citations) {
      const dedupKey = normalizeForDedup(citation.url);
      let number = urlToNumber.get(dedupKey);
      if (number === undefined) {
        number = references.length + 1;
        urlToNumber.set(dedupKey, number);
        references.push({ number, url: citation.url, citations: [] });
      }
      references[number - 1].citations.push(citation);
      if (!numbersForClaim.includes(number)) numbersForClaim.push(number);
    }
    claimNumbers.set(claim.id, numbersForClaim);
  }

  return { claimNumbers, references };
}

// A shared assessment carries sources but no citations — core never persisted them (spec 019) —
// so the citation-keyed list above renders nothing there. Numbers the SOURCES the same way.
export function numberSources(
  articleText: string,
  claims: Claim[],
  precomputedSpans?: Map<string, Span | null>
): { number: number; url: string; sources: ClaimSource[] }[] {
  const ordered = markedInReadingOrder(articleText, claims, precomputedSpans);

  const urlToNumber = new Map<string, number>();
  const references: { number: number; url: string; sources: ClaimSource[] }[] = [];
  for (const claim of ordered) {
    for (const source of claim.sources) {
      // Only what a reader can actually open: an unreachable or blocked fetch is not a reference.
      if (source.kind !== 'web' || source.status !== 'ok') continue;
      const dedupKey = normalizeForDedup(source.url);
      let number = urlToNumber.get(dedupKey);
      if (number === undefined) {
        number = references.length + 1;
        urlToNumber.set(dedupKey, number);
        references.push({ number, url: source.url, sources: [] });
      }
      references[number - 1].sources.push(source);
    }
  }
  return references;
}
