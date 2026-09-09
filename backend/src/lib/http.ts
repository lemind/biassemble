// Generic request-header helpers — no Grounnel/reflection-specific logic here.

// Real end-user IP, not this server's own egress IP (ADR-001 §4) — x-forwarded-for's first
// value is the original client per the standard proxy-chain convention; Vercel sets this header.
export function clientIpFrom(request: Request): string | undefined {
  const xff = request.headers.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || undefined;
}

// Every API response here is dynamic and often per-person. Next's default on a route handler is
// `public, max-age=0, must-revalidate`, and Vercel's CDN respects upstream Cache-Control on
// rewrites — so once the frontend proxies /api/*, `public` would let a shared cache hold someone's
// assessment or run status. `no-store` is the only correct answer for all of them.
export const NO_STORE = { "Cache-Control": "no-store" } as const;
