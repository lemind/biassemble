import type { ClaimSource } from '../types/grounnel';

// The real source's title/domain — falls back to the bare hostname when no matching ClaimSource
// carries a title (e.g. a source status SourceLink never got the chance to render, but the
// citation still resolved a real url). Shared by the tooltip and the References list so both
// surfaces label the same source the same way.
export function sourceLabel(url: string, sources: ClaimSource[]): string {
  const match = sources.find((s) => s.kind === 'web' && s.url === url);
  if (match && match.kind === 'web') return match.title || match.domain;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
