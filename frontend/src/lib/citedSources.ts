import type { Claim, ClaimSource } from '../types/grounnel';

// Tooltip is small and lives right next to the highlight — capped so the hover panel stays small.
export const CITATION_TOOLTIP_MAX = 1;

// `claim.sources` is every source the pipeline attempted (paywalled/unreachable/blocked
// included), in original search order — not the same list `claim.citations[].url` resolves
// against (a separately filtered/reranked passage subset, D027 biassemble-core). Slicing
// `sources` directly can show two failed fetches while the actual cited source sits unlisted
// further down. When citations exist, prefer the sources they actually point to, in citation
// order, deduped by url; fall back to the raw list only when there's nothing to cite yet.
export function citedSources(claim: Claim, max: number): ClaimSource[] {
  if (claim.citations.length === 0) {
    return claim.sources.slice(0, max);
  }

  const seen = new Set<string>();
  const ordered: ClaimSource[] = [];
  for (const citation of claim.citations) {
    if (seen.has(citation.url)) continue;
    seen.add(citation.url);
    const source = claim.sources.find((s) => s.kind === 'web' && s.url === citation.url);
    if (source) ordered.push(source);
    if (ordered.length >= max) break;
  }
  return ordered.length > 0 ? ordered : claim.sources.slice(0, max);
}
