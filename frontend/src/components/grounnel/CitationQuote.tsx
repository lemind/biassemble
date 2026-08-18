import { buildTextFragmentUrl, normalizePunctuationSpacing } from '../../lib/textFragment';
import { sourceLabel } from '../../lib/sourceLabel';
import type { ClaimCitation, ClaimSource } from '../../types/grounnel';

interface CitationQuoteProps {
  citation: ClaimCitation;
  sources: ClaimSource[];
}

// Used in the hover tooltip only. One link, not two — source name and quoted text together
// ("wikipedia.org — 'quoted text'"), rather than a separate SourceLink next to it; two clickable
// targets pointing at the same underlying claim read as redundant. The References list below the
// article shows just the source name (real Wikipedia footnote style, no repeated blockquote);
// this component isn't used there.
export default function CitationQuote({ citation, sources }: CitationQuoteProps) {
  return (
    <a
      href={buildTextFragmentUrl(citation.url, citation.text)}
      target="_blank"
      rel="noopener noreferrer"
      title="Opens the source at this exact sentence"
      className="block text-left text-base-content/70 hover:text-info hover:underline"
    >
      <span className="text-info">{sourceLabel(citation.url, sources)}</span>
      {' — '}
      {/* Same normalization the link itself uses (textFragment.ts) — passage extraction upstream
          leaves stray spaces before punctuation; showing the raw artifact here while the link
          quietly fixes it for matching purposes would make the two visibly disagree. */}
      “{normalizePunctuationSpacing(citation.text)}”
    </a>
  );
}
