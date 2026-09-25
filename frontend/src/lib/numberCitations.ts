import type { Claim, ClaimCitation, ClaimSource } from '../types/grounnel';
import { matchClaimSpans, numberClaims, type Span } from './matchClaimSpans';
import { isStyledClaim } from './verdictStyle';
import { citedSources } from './citedSources';

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

// Only claims HighlightedArticle actually marks: a matched span plus a styleable verdict. Numbering
// anything else yields a References entry no inline marker points at (spec 004, 2026-09-13).
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

// Caps the fallback. `sources` is every page the search touched (up to 14); numbering all of them
// buries the text under brackets. Two matches what the claim's own panel lists.
const REFERENCE_SOURCES_MAX = 2;

// What this claim contributes to References. One rule for both pages: citations when it has them,
// otherwise the sources its own panel shows.
function referenceTargets(claim: Claim): Array<{ url: string; citation: ClaimCitation | null }> {
  if (claim.citations.length > 0) {
    return claim.citations.map((citation) => ({ url: citation.url, citation }));
  }
  // D027: evidence null ⇒ no citations, so an unsupported claim lands here and a footnote beside it
  // would assert the opposite of its verdict. Only a grounded claim falls back.
  if (claim.evidence === null) return [];
  // citedSources, not claim.sources, so a number can only ever point at a source the claim's own
  // panel already lists; the ok filter then drops what a reader could not open anyway.
  return citedSources(claim, REFERENCE_SOURCES_MAX)
    .filter(
      (source): source is Extract<ClaimSource, { kind: 'web' }> =>
        source.kind === 'web' && source.status === 'ok'
    )
    .map((source) => ({ url: source.url, citation: null }));
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
    for (const { url, citation } of referenceTargets(claim)) {
      const dedupKey = normalizeForDedup(url);
      let number = urlToNumber.get(dedupKey);
      if (number === undefined) {
        number = references.length + 1;
        urlToNumber.set(dedupKey, number);
        references.push({ number, url, citations: [] });
      }
      // Empty on the shared path: there is no cited sentence to deep-link to, only the page.
      if (citation) references[number - 1].citations.push(citation);
      if (!numbersForClaim.includes(number)) numbersForClaim.push(number);
    }
    claimNumbers.set(claim.id, numbersForClaim);
  }

  return { claimNumbers, references };
}
