import type { ClaimSource } from '../types/grounnel';

// Always the domain, never the page title (2026-08-12 — was `title || domain`, which meant some
// References entries showed a clean domain like "latimes.com" and others showed a full article
// headline like "Remembering the Laureate of American Lowlife", inconsistent within one list;
// real Wikipedia-style footnotes read as a consistent site name, not a mix). Falls back to the
// bare hostname when no matching ClaimSource carries a domain at all. Shared by the tooltip and
// the References list so both surfaces label the same source the same way.
export function sourceLabel(url: string, sources: ClaimSource[]): string {
  const match = sources.find((s) => s.kind === 'web' && s.url === url);
  if (match && match.kind === 'web') return match.domain;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
