// ADR-002 §3 ("no router for one extra path") expires here: three paths across two hosts is a
// different problem and a boolean can't express it. A path table is enough — no router dependency.
import type { BrandId } from './brand';

export type PageId = 'tool' | 'reflection' | 'about' | 'stats' | 'check' | 'not-found';

export interface Route {
  page: PageId;
  /** Set only for `check` — the share token from `/check/:token`. */
  token?: string;
  /** Set when the path exists but belongs elsewhere on this host; the caller navigates. */
  redirectTo?: string;
}

const CHECK_PREFIX = '/check/';

// Trailing slashes are not meaningful; query and hash never reach here (pathname only). Case is
// NOT folded — the share token is base64url and case-sensitive, so only fixed paths compare loosely.
export function normalizePath(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.replace(/\/+$/, '') : pathname;
}

/**
 * The whole host x path matrix. `/grounnel` stays the tool on the Biassemble host because those
 * links already exist and we promised not to break them (FR-002/SC-002).
 */
export function resolveRoute(pathname: string, brand: BrandId): Route {
  const path = normalizePath(pathname);
  const fixed = path.toLowerCase();

  if (fixed === '/') return { page: brand === 'grounnel' ? 'tool' : 'reflection' };
  if (fixed === '/grounnel') {
    return brand === 'grounnel' ? { page: 'tool', redirectTo: '/' } : { page: 'tool' };
  }
  if (fixed === '/about') return { page: 'about' };
  if (fixed === '/stats') return { page: 'stats' };

  if (fixed.startsWith(CHECK_PREFIX)) {
    const token = path.slice(CHECK_PREFIX.length);
    // A token with a further slash is not a token — treat it as unrouted rather than guessing.
    if (token.length > 0 && !token.includes('/')) return { page: 'check', token };
  }

  return { page: 'not-found' };
}

export function currentRoute(brand: BrandId): Route {
  return resolveRoute(window.location.pathname, brand);
}
