import { matchClaimSpans } from '../../lib/matchClaimSpans';
import type { Claim, ClaimVerdict } from '../../types/grounnel';

interface HighlightedArticleProps {
  articleText: string;
  claims: Claim[];
}

// Non-color icon per verdict (FR-007) — color is never the only cue.
const VERDICT_STYLE: Record<ClaimVerdict, { className: string; icon: string; label: string }> = {
  supported: { className: 'bg-success/30', icon: '✓', label: 'Supported' },
  contradicted: { className: 'bg-error/30', icon: '✗', label: 'Contradicted' },
  partially_supported: { className: 'bg-warning/30', icon: '≈', label: 'Partially supported' },
  unsupported: { className: 'bg-neutral/20', icon: '?', label: 'No evidence found' },
  unverifiable: { className: 'bg-info/30', icon: '?', label: 'Unverifiable' },
};

// Claim-level (not verdict) states — a `pending` claim has no verdict yet, a `failed` claim's
// verification itself errored (distinct from the `unverifiable` verdict, FR-012).
const PENDING_STYLE = {
  className: 'bg-base-300/50 animate-pulse',
  icon: '',
  label: 'Checking…',
};
const FAILED_STYLE = {
  // bg-base-100 overrides the browser UA stylesheet's default `mark { background: yellow }` —
  // without it, the dashed border rendered with a yellow highlight bleeding through underneath.
  className: 'bg-base-100 border border-dashed border-base-content/30 text-base-content/60',
  icon: '⚠',
  label: 'Verification failed',
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
        const { claim } = segment;
        if (!claim) {
          return <span key={index}>{segment.text}</span>;
        }

        const style = claim.verdict
          ? VERDICT_STYLE[claim.verdict]
          : claim.status === 'pending'
            ? PENDING_STYLE
            : claim.status === 'failed'
              ? FAILED_STYLE
              : null;
        if (!style) {
          return <span key={index}>{segment.text}</span>;
        }

        return (
          <mark key={index} className={`rounded px-0.5 ${style.className}`}>
            {segment.text}
            {claim.status === 'pending' ? (
              <span
                aria-hidden="true"
                className="loading loading-spinner loading-xs ml-0.5 align-middle"
              />
            ) : (
              <span aria-hidden="true" className="ml-0.5 align-super text-xs">
                {style.icon}
              </span>
            )}
            <span className="sr-only">{` (${style.label})`}</span>
          </mark>
        );
      })}
    </div>
  );
}
