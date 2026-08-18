import { sourceLabel } from '../../lib/sourceLabel';
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
        {/* Routed through lib/sourceLabel.ts (2026-08-12, code-review finding) instead of an
            inline `title || domain` — this is the same tooltip CitationQuote renders into right
            above this, so both must use the identical "domain - title" formatting or the two
            lines visibly disagree. */}
        {sourceLabel(source.url, [source])}
      </a>
    );
  }

  // Attached-document sources carry no retrievable URL yet (not produced in this phase, per
  // backend contract) — render the title as plain text rather than risk a broken link.
  return <span className="text-base-content/60">{source.title}</span>;
}
