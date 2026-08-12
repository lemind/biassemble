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
        {source.title || source.domain}
      </a>
    );
  }

  // Attached-document sources carry no retrievable URL yet (not produced in this phase, per
  // backend contract) — render the title as plain text rather than risk a broken link.
  return <span className="text-base-content/60">{source.title}</span>;
}
