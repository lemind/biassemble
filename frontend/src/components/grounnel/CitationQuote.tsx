import { buildTextFragmentUrl, normalizePunctuationSpacing } from '../../lib/textFragment';
import type { ClaimCitation } from '../../types/grounnel';

interface CitationQuoteProps {
  citation: ClaimCitation;
}

// Used in the hover tooltip only — a short preview of the actual cited sentence. The References
// list below the article shows the source's name instead (real Wikipedia footnote style, not a
// repeated blockquote); this component is not used there.
export default function CitationQuote({ citation }: CitationQuoteProps) {
  return (
    <a
      href={buildTextFragmentUrl(citation.url, citation.text)}
      target="_blank"
      rel="noopener noreferrer"
      title="Opens the source at this exact sentence"
      className="block text-left text-base-content/70 hover:text-info hover:underline"
    >
      {/* Same normalization the link itself uses (textFragment.ts) — passage extraction upstream
          leaves stray spaces before punctuation; showing the raw artifact here while the link
          quietly fixes it for matching purposes would make the two visibly disagree. */}
      “{normalizePunctuationSpacing(citation.text)}”
    </a>
  );
}
