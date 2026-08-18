import type { ClaimSource } from '../types/grounnel';

// "domain - title" (2026-08-12, revised again — the prior domain-only version dropped the title
// entirely, which was never the actual ask: the complaint was that domain-only and title-only
// entries were inconsistently mixed within one list, not that the title shouldn't be there at
// all; real Wikipedia footnotes name both the site and the specific page). Falls back to just
// the bare hostname when no matching ClaimSource carries a title (or no match at all). Shared by
// the tooltip and the References list so both surfaces label the same source the same way.
// Real observed pattern, 2026-08-12: upstream title extraction very often fails to find a real
// `<title>` and falls back to something domain-derived instead — "wikipedia.org" for
// en.wikipedia.org, "blogspot.com" for bibliosity.blogspot.com, "sobrief.com" for sobrief.com.
// That's not a title, it's the domain restated, and showing "domain - domain" is worse than
// showing nothing. Catches an exact match and the "title is the site's bare registrable domain,
// url has a subdomain" case (en.wikipedia.org / wikipedia.org) without needing a public-suffix
// list — good enough for the domains actually seen in practice; a false negative here just means
// an occasional redundant-looking title slips through, not a crash or a lost citation.
function isBareDomainRestated(title: string, domain: string): boolean {
  if (title.includes(' ')) return false; // real titles have spaces; bare domains don't
  return title === domain || domain.endsWith(`.${title}`);
}

export function sourceLabel(url: string, sources: ClaimSource[]): string {
  // Two different claims can independently re-fetch the same URL and get different results — one
  // claim's fetch may have failed to extract a title (empty string) while another's succeeded.
  // ClaimSourceList passes ALL claims' sources flattened together, so a plain first-match `.find`
  // could land on the title-less duplicate purely by array order and silently drop a real title
  // that exists elsewhere in the same array. Prefer any duplicate that actually has one.
  const withTitle = sources.find((s) => s.kind === 'web' && s.url === url && s.title);
  const match = withTitle ?? sources.find((s) => s.kind === 'web' && s.url === url);
  if (match && match.kind === 'web') {
    const hasRealTitle = match.title && !isBareDomainRestated(match.title, match.domain);
    return hasRealTitle ? `${match.domain} - ${match.title}` : match.domain;
  }
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
