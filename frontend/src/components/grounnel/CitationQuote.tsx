import type { ClaimCitation } from '../../types/grounnel';

interface CitationQuoteProps {
  citation: ClaimCitation;
}

// The specific sentence VERIFY actually cited, linked to its real source (D027, biassemble-core)
// — SourceLink alone only links to a source's homepage, not the passage that backs the verdict.
export default function CitationQuote({ citation }: CitationQuoteProps) {
  return (
    <a
      href={citation.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block text-left text-base-content/70 hover:text-info hover:underline"
    >
      “{citation.text}”
    </a>
  );
}
