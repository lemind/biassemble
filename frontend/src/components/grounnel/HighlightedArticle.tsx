import { matchClaimSpans, MatchTier, type Span } from '../../lib/matchClaimSpans';
import { numberCitations } from '../../lib/numberCitations';
import { VERDICT_HIGHLIGHT_CLASS, type StyledVerdict } from '../../lib/verdictStyle';
import { citedSources, CITATION_TOOLTIP_MAX } from '../../lib/citedSources';
import { sourceNote, SOURCE_NOTE_TEXT } from '../../lib/sourceNote';
import SourceLink from './SourceLink';
import CitationQuote from './CitationQuote';
import type { Claim } from '../../types/grounnel';

interface HighlightedArticleProps {
  articleText: string;
  claims: Claim[];
}

// Non-color icon per verdict (FR-007) — color is never the only cue.
const VERDICT_STYLE: Record<StyledVerdict, { className: string; icon: string; label: string }> = {
  supported: { className: VERDICT_HIGHLIGHT_CLASS.supported, icon: '✓', label: 'Supported' },
  contradicted: { className: VERDICT_HIGHLIGHT_CLASS.contradicted, icon: '✗', label: 'Contradicted' },
  partially_supported: {
    className: VERDICT_HIGHLIGHT_CLASS.partially_supported,
    icon: '≈',
    label: 'Partially supported',
  },
  unsupported: { className: VERDICT_HIGHLIGHT_CLASS.unsupported, icon: '?', label: 'No evidence found' },
  unverifiable: { className: VERDICT_HIGHLIGHT_CLASS.unverifiable, icon: '?', label: 'Unverifiable' },
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
  isFallback: boolean;
}

function buildSegments(articleText: string, claims: Claim[], spans: Map<string, Span | null>): Segment[] {
  const matched = claims
    .map((claim) => ({ claim, span: spans.get(claim.id) ?? null }))
    .filter(
      (entry): entry is { claim: Claim; span: Span } =>
        entry.span !== null,
    )
    .sort((a, b) => a.span.start - b.span.start);

  const segments: Segment[] = [];
  let cursor = 0;
  for (const { claim, span } of matched) {
    if (span.start > cursor) {
      segments.push({ text: articleText.slice(cursor, span.start), claim: null, isFallback: false });
    }
    segments.push({
      text: articleText.slice(span.start, span.end),
      claim,
      isFallback: span.tier === MatchTier.Sentence,
    });
    cursor = span.end;
  }
  if (cursor < articleText.length) {
    segments.push({ text: articleText.slice(cursor), claim: null, isFallback: false });
  }
  return segments;
}

export default function HighlightedArticle({ articleText, claims }: HighlightedArticleProps) {
  const spans = matchClaimSpans(articleText, claims);
  const segments = buildSegments(articleText, claims, spans);
  const { claimNumbers } = numberCitations(articleText, claims, spans);

  // break-words: an unbroken token wider than the container (a 260-digit number, a bare URL) has
  // no break opportunity and overflows the card horizontally without it.
  return (
    <div className="whitespace-pre-wrap break-words leading-relaxed">
      {segments.map((segment, index) => {
        const { claim, isFallback } = segment;
        if (!claim) {
          return <span key={index}>{segment.text}</span>;
        }

        const style = claim.verdict
          ? VERDICT_STYLE[claim.verdict as StyledVerdict]
          : claim.status === 'pending'
            ? PENDING_STYLE
            : claim.status === 'failed'
              ? FAILED_STYLE
              : null;
        if (!style) {
          return <span key={index}>{segment.text}</span>;
        }

        // Tooltip shown whenever there's something to say (FR-008): real sources, citations, an
        // approximate-location disclaimer, or a note — including "no sources found", so a
        // zero-evidence verdict never renders a bare, unexplained "?" icon.
        const sources = citedSources(claim, 2);
        // One exhaustive note per claim (sourceNote.ts) instead of four independent booleans —
        // a claim matching none of them used to render bare, unexplained links (T014/T015).
        const note = sourceNote(claim, sources.length);
        const hasTooltip = sources.length > 0 || claim.citations.length > 0 || isFallback || note !== null;
        const shownCitations = claim.citations.slice(0, CITATION_TOOLTIP_MAX);
        const shownCitationUrls = new Set(shownCitations.map((citation) => citation.url));

        const refNumbers = claimNumbers.get(claim.id) ?? [];

        // Sentence-tier spans (D028: source_excerpt missing or unlocatable) are the least-bad
        // available slot, not a confirmed match to this exact text (real observed bug, 2026-08-12:
        // an unrelated claim's verdict landed on a date-heavy sentence and read as if it were about
        // the date). Dashed underline (code-review finding, 2026-08-12: reuses the same "not a
        // confirmed verdict" dashed idiom as FAILED_STYLE and GrounnelProgress's Unconfirmed/
        // FailedDot, instead of introducing a third, one-off convention) + "approximate location"
        // note keep the coverage guarantee ("every claim highlighted somewhere") without implying
        // precision it doesn't have.
        const fallbackClass = isFallback ? 'border-b-2 border-dashed border-base-content/40' : '';

        return (
          <mark
            key={index}
            id={`claim-mark-${claim.id}`}
            tabIndex={hasTooltip ? 0 : undefined}
            className={`group rounded px-0.5 ${style.className} ${fallbackClass} ${hasTooltip ? 'cursor-help' : ''}`}
          >
            {segment.text}
            {/*
              The tooltip anchors to THIS icon badge, not the <mark> itself. <mark> is inline and
              can wrap across multiple lines (a claim span is often a full sentence) — an
              absolutely-positioned child of a *wrapped* inline box gets positioned relative to
              one of its line fragments (Chrome resolves it against the tail fragment), landing
              the tooltip hundreds of pixels from the visible highlight. The icon badge below is a
              single non-wrapping inline-block, so `relative`/`absolute` on it has an unambiguous,
              predictable containing block right next to what the user is actually pointing at.
            */}
            <span className="relative inline-block">
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
              {/* Wikipedia-style inline reference markers — one per unique cited source (D027's
                  citations, deduped by url via numberCitations), each jumping to that source's
                  numbered entry in the References list below. A claim can carry several. */}
              {refNumbers.map((n) => (
                <a key={n} href={`#ref-${n}`} className="ml-0.5 align-super text-xs text-info hover:underline">
                  [{n}]
                </a>
              ))}
              {hasTooltip && (
                <span
                  // Centred on the badge, not left-anchored: left-anchoring pushed a tooltip on a
                  // right-edge claim ~100px past the viewport, where the layout now clips it.
                  className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 w-max max-w-xs
                    -translate-x-1/2 opacity-0 transition-opacity group-hover:pointer-events-auto
                    group-hover:opacity-100 group-focus-within:pointer-events-auto
                    group-focus-within:opacity-100"
                >
                  <span className="flex flex-col gap-1 break-words rounded border border-base-300 bg-base-100 p-2 text-xs text-base-content shadow-lg">
                    <span className="font-semibold">{style.label}</span>
                    {isFallback && (
                      // A fallback-tier span's own words aren't a reliable stand-in for the claim
                      // (that's the whole reason it's fallback) — telling the user "not confirmed"
                      // with nothing else leaves them unable to tell what was actually checked.
                      // Showing the claim's real extracted text here is the actionable version:
                      // the user can read exactly what was verified, independent of where it landed.
                      <span className="text-base-content/60">
                        Approximate location — the claim actually checked here was: “{claim.text}”
                      </span>
                    )}
                    {/* One combined link (source name + exact cited sentence) per shown citation
                        — a separate SourceLink for that same url would be a second link pointing
                        at essentially the same place. Sources NOT covered by a shown citation
                        (review finding, 2026-08-12: citedSources' own cap of 2 can include a
                        second real source beyond CITATION_TOOLTIP_MAX's single quoted citation —
                        that used to always render, this keeps it visible instead of hiding it
                        the moment any citation exists) still get a plain link below. */}
                    {shownCitations.map((citation) => (
                      <span key={`${citation.source}-${citation.sentence}`} className="line-clamp-2">
                        <CitationQuote citation={citation} sources={claim.sources} />
                      </span>
                    ))}
                    {note && <span className="text-base-content/60">{SOURCE_NOTE_TEXT[note]}</span>}
                    {sources
                      .filter((source) => source.kind !== 'web' || !shownCitationUrls.has(source.url))
                      .map((source) => (
                        <SourceLink key={source.kind === 'web' ? source.url : source.documentId} source={source} />
                      ))}
                  </span>
                </span>
              )}
            </span>
            <span className="sr-only">
              {` (${style.label}${isFallback ? `, approximate location — claim checked: "${claim.text}"` : ''})`}
            </span>
          </mark>
        );
      })}
    </div>
  );
}
