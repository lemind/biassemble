import type { ClaimSource } from '../../types/grounnel';

interface SourceLinkProps {
  source: ClaimSource;
}

// Shared by HighlightedArticle's tooltip (T014) and ClaimSourceList (T015) — same source shape,
// same rendering rule, one place to keep it correct.
export default function SourceLink({ source }: SourceLinkProps) {
  if (source.kind === 'web') {
    return (
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="link link-hover text-info"
      >
        {/* Domain only, never the title (2026-08-12) — matches lib/sourceLabel.ts's rule, so a
            web source never shows a full article headline in one place and a clean domain in
            another within the same tooltip (CitationQuote, right above this, already used
            sourceLabel()). Attached-document sources below have no domain to fall back to, so
            they're untouched. */}
        {source.domain}
      </a>
    );
  }

  // Attached-document sources carry no retrievable URL yet (not produced in this phase, per
  // backend contract) — render the title as plain text rather than risk a broken link.
  return <span className="text-base-content/60">{source.title}</span>;
}
