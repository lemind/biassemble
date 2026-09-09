// Generic request-header helpers — no Grounnel/reflection-specific logic here.

// Real end-user IP, not this server's own egress IP (ADR-001 §4).
//
// x-forwarded-for is a chain the CALLER can prepend to, so its first value is only the real client
// when every hop in front of us is trusted. Vercel's edge sets x-vercel-forwarded-for and x-real-ip
// itself and overwrites whatever arrived, so those are preferred; x-forwarded-for stays as the last
// resort for non-Vercel environments (local dev). Which header actually carries the end user
// through the frontend's /api rewrite is logged at the call site until it is confirmed deployed.
const IP_HEADERS = ["x-vercel-forwarded-for", "x-real-ip", "x-forwarded-for"] as const;

export function clientIpFrom(request: Request): string | undefined {
  for (const header of IP_HEADERS) {
    const value = request.headers.get(header);
    const first = value?.split(",")[0]?.trim();
    if (first) return first;
  }
  return undefined;
}

/** Every candidate header and its value, for confirming which one carries the end user. */
export function clientIpCandidates(request: Request): Record<string, string> {
  const seen: Record<string, string> = {};
  for (const header of IP_HEADERS) {
    const value = request.headers.get(header);
    if (value) seen[header] = value;
  }
  return seen;
}

// Every API response here is dynamic and often per-person. Next's default on a route handler is
// `public, max-age=0, must-revalidate`, and Vercel's CDN respects upstream Cache-Control on
// rewrites — so once the frontend proxies /api/*, `public` would let a shared cache hold someone's
// assessment or run status. `no-store` is the only correct answer for all of them.
export const NO_STORE = { "Cache-Control": "no-store" } as const;
