import type { Claim, ClaimCitation } from '../types/grounnel';
import { numberClaims, type Span } from './matchClaimSpans';

export interface NumberedReference {
  number: number;
  url: string;
  citations: ClaimCitation[];
}

export interface CitationNumbering {
  claimNumbers: Map<string, number[]>;
  references: NumberedReference[];
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
  const claimOrder = numberClaims(articleText, claims, precomputedSpans);
  const ordered = [...claims].sort((a, b) => claimOrder.get(a.id)! - claimOrder.get(b.id)!);

  const urlToNumber = new Map<string, number>();
  const references: NumberedReference[] = [];
  const claimNumbers = new Map<string, number[]>();

  for (const claim of ordered) {
    const numbersForClaim: number[] = [];
    for (const citation of claim.citations) {
      let number = urlToNumber.get(citation.url);
      if (number === undefined) {
        number = references.length + 1;
        urlToNumber.set(citation.url, number);
        references.push({ number, url: citation.url, citations: [] });
      }
      references[number - 1].citations.push(citation);
      if (!numbersForClaim.includes(number)) numbersForClaim.push(number);
    }
    claimNumbers.set(claim.id, numbersForClaim);
  }

  return { claimNumbers, references };
}
