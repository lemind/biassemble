import { numberCitations } from '../../lib/numberCitations';
import { buildTextFragmentUrl } from '../../lib/textFragment';
import { sourceLabel } from '../../lib/sourceLabel';
import type { Claim } from '../../types/grounnel';

interface ClaimSourceListProps {
  articleText: string;
  claims: Claim[];
}

export default function ClaimSourceList({ articleText, claims }: ClaimSourceListProps) {
  if (claims.length === 0) {
    return null;
  }

  // Wikipedia-style: one numbered entry per unique SOURCE, not per claim — a source cited by two
  // different claims (or twice by the same one) reuses its number instead of appearing twice.
  // Claims with no resolvable citation aren't listed here at all (deleted "Not independently
  // sourced" section, 2026-08-12) — every claim now gets a highlighted location in the article
  // body itself (matchClaimSpans' no-threshold fallback), which is where they're visible instead.
  const { references } = numberCitations(articleText, claims);
  const allSources = claims.flatMap((c) => c.sources);

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
                    still lands on the exact cited sentence via the text-fragment link. min-w-0
                    because a flex item will not shrink below its content. */}
                <a
                  href={buildTextFragmentUrl(ref.url, ref.citations[0]!.text)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Opens the source at this exact sentence"
                  className="min-w-0 break-words text-info hover:underline"
                >
                  {sourceLabel(ref.url, allSources)}
                </a>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
