import { numberCitations } from '../../lib/numberCitations';
import { buildTextFragmentUrl } from '../../lib/textFragment';
import { citedSources } from '../../lib/citedSources';
import SourceLink from './SourceLink';
import type { Claim } from '../../types/grounnel';

interface ClaimSourceListProps {
  articleText: string;
  claims: Claim[];
}

// The real source's title/domain (same fields SourceLink already uses) — falls back to the bare
// hostname when no matching ClaimSource carries a title (e.g. a source status: SourceLink never
// got the chance to render it, but the citation still resolved a real url).
function referenceLabel(url: string, claims: Claim[]): string {
  for (const claim of claims) {
    for (const source of claim.sources) {
      if (source.kind === 'web' && source.url === url) {
        return source.title || source.domain;
      }
    }
  }
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function ClaimSourceList({ articleText, claims }: ClaimSourceListProps) {
  if (claims.length === 0) {
    return null;
  }

  // Wikipedia-style: one numbered entry per unique SOURCE, not per claim — a source cited by two
  // different claims (or twice by the same one) reuses its number instead of appearing twice.
  const { references, claimNumbers } = numberCitations(articleText, claims);
  const uncited = claims.filter((claim) => (claimNumbers.get(claim.id) ?? []).length === 0);

  return (
    <div className="flex flex-col gap-4">
      {references.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-base-content/70">References</h2>
          <ol className="flex flex-col gap-1">
            {references.map((ref) => (
              <li
                key={ref.number}
                id={`ref-${ref.number}`}
                className="flex gap-1.5 text-sm scroll-mt-4 target:animate-pulse"
              >
                <span className="shrink-0 font-mono text-base-content/50">[{ref.number}]</span>
                {/* Real footnote style: the source's name, not a repeated quote — hover/click
                    still lands on the exact cited sentence via the text-fragment link. */}
                <a
                  href={buildTextFragmentUrl(ref.url, ref.citations[0]!.text)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Opens the source at this exact sentence"
                  className="text-info hover:underline"
                >
                  {referenceLabel(ref.url, claims)}
                </a>
              </li>
            ))}
          </ol>
        </div>
      )}
      {uncited.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-base-content/70">Not independently sourced</h2>
          <ul className="flex flex-col gap-1">
            {uncited.map((claim) => (
              <li key={claim.id} id={`claim-source-${claim.id}`} className="text-sm scroll-mt-4 target:animate-pulse">
                <p className="italic text-base-content/50">{claim.text}</p>
                {/* No resolvable citation doesn't mean no attempt — a claim can still have real
                    (if unquotable) attempted sources; dropping them here would make a claim with
                    2 real attempted sources indistinguishable from one that was never searched. */}
                {claim.sources.length > 0 && (
                  <ul className="flex flex-col gap-0.5 pl-4">
                    {citedSources(claim, 2).map((source) => (
                      <li key={source.kind === 'web' ? source.url : source.documentId}>
                        <SourceLink source={source} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
