import { matchClaimSpans } from '../../lib/matchClaimSpans';
import SourceLink from './SourceLink';
import type { Claim } from '../../types/grounnel';

interface ClaimSourceListProps {
  articleText: string;
  claims: Claim[];
}

// Matched claims first, ordered by their span's start position; unmatched claims (FR-010) are
// appended at the end in claims[] order — no span position to sort them by (plan.md § ordering).
function orderClaims(articleText: string, claims: Claim[]): Claim[] {
  const spans = matchClaimSpans(articleText, claims);
  const matched: { claim: Claim; start: number }[] = [];
  const unmatched: Claim[] = [];
  for (const claim of claims) {
    const span = spans.get(claim.id);
    if (span) {
      matched.push({ claim, start: span.start });
    } else {
      unmatched.push(claim);
    }
  }
  matched.sort((a, b) => a.start - b.start);
  return [...matched.map((entry) => entry.claim), ...unmatched];
}

export default function ClaimSourceList({ articleText, claims }: ClaimSourceListProps) {
  if (claims.length === 0) {
    return null;
  }

  const ordered = orderClaims(articleText, claims);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-base-content/70">Sources</h2>
      <ul className="flex flex-col gap-3">
        {ordered.map((claim) => (
          <li key={claim.id} className="text-sm">
            <p className="text-base-content/80">{claim.text}</p>
            {claim.sources.length > 0 ? (
              <ul className="flex flex-col gap-0.5 pl-4">
                {claim.sources.slice(0, 2).map((source, index) => (
                  <li key={index}>
                    <SourceLink source={source} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="pl-4 italic text-base-content/50">No sources found</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
