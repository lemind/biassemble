import { matchClaimSpans } from '../../lib/matchClaimSpans';
import type { Claim, ClaimVerdict } from '../../types/grounnel';

interface HighlightedArticleProps {
  articleText: string;
  claims: Claim[];
}

// Non-color icon per verdict (FR-007) — color is never the only cue. pending/failed claim
// styling lands in a later phase (plan.md § Verdict → color mapping).
const VERDICT_STYLE: Record<ClaimVerdict, { className: string; icon: string; label: string }> = {
  supported: { className: 'bg-success/30', icon: '✓', label: 'Supported' },
  contradicted: { className: 'bg-error/30', icon: '✗', label: 'Contradicted' },
  partially_supported: { className: 'bg-warning/30', icon: '≈', label: 'Partially supported' },
  unsupported: { className: 'bg-neutral/20', icon: '?', label: 'No evidence found' },
  unverifiable: { className: 'bg-info/30', icon: '?', label: 'Unverifiable' },
};

interface Segment {
  text: string;
  claim: Claim | null;
}

function buildSegments(articleText: string, claims: Claim[]): Segment[] {
  const spans = matchClaimSpans(articleText, claims);
  const matched = claims
    .map((claim) => ({ claim, span: spans.get(claim.id) ?? null }))
    .filter(
      (entry): entry is { claim: Claim; span: { start: number; end: number } } =>
        entry.span !== null,
    )
    .sort((a, b) => a.span.start - b.span.start);

  const segments: Segment[] = [];
  let cursor = 0;
  for (const { claim, span } of matched) {
    if (span.start > cursor) {
      segments.push({ text: articleText.slice(cursor, span.start), claim: null });
    }
    segments.push({ text: articleText.slice(span.start, span.end), claim });
    cursor = span.end;
  }
  if (cursor < articleText.length) {
    segments.push({ text: articleText.slice(cursor), claim: null });
  }
  return segments;
}

export default function HighlightedArticle({ articleText, claims }: HighlightedArticleProps) {
  const segments = buildSegments(articleText, claims);

  return (
    <div className="whitespace-pre-wrap leading-relaxed">
      {segments.map((segment, index) => {
        if (!segment.claim?.verdict) {
          return <span key={index}>{segment.text}</span>;
        }
        const style = VERDICT_STYLE[segment.claim.verdict];
        return (
          <mark key={index} className={`rounded px-0.5 ${style.className}`}>
            {segment.text}
            <span aria-hidden="true" className="ml-0.5 align-super text-xs">
              {style.icon}
            </span>
            <span className="sr-only">{` (${style.label})`}</span>
          </mark>
        );
      })}
    </div>
  );
}
