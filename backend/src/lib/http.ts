// Generic request-header helpers — no Grounnel/reflection-specific logic here.

// Real end-user IP, not this server's own egress IP (ADR-001 §4). Order is deliberate and
// UNVERIFIED against the deployed edge — see docs note in AGENTS.md.
//
// x-forwarded-for stays first. This deployment sits behind a SECOND Vercel edge (the frontend's
// /api rewrite proxies here), so x-real-ip and x-vercel-forwarded-for describe that proxy hop and
// would key every visitor to one bucket — the exact bug the forwarding was added to fix. A wrong
// chain position costs an attacker their own bucket; a wrong header costs every real user theirs.
const IP_HEADERS = ["x-forwarded-for", "x-vercel-forwarded-for", "x-real-ip"] as const;

/** The chosen IP and the header it came from — one traversal, so the probe needs no second one. */
export function clientIpWithSource(request: Request): { ip?: string; header?: string } {
  for (const header of IP_HEADERS) {
    const first = request.headers.get(header)?.split(",")[0]?.trim();
    if (first) return { ip: first, header };
  }
  return {};
}

export function clientIpFrom(request: Request): string | undefined {
  return clientIpWithSource(request).ip;
}

// Names only, never values: which header carries the end user is the open question, and answering
// it must not write a visitor identifier into the platform log. Off unless explicitly enabled.
export function logIpHeaderProbe(request: Request, chosen: { header?: string }): void {
  if (process.env.LOG_IP_HEADER_PROBE !== "1") return;
  const present = IP_HEADERS.filter((h) => request.headers.get(h));
  console.log(`[grounnel:ip-probe] chose=${chosen.header ?? "none"} present=${present.join(",") || "none"}`);
}

// Every API response here is dynamic and often per-person. Next's default on a route handler is
// `public, max-age=0, must-revalidate`, and Vercel's CDN respects upstream Cache-Control on
// rewrites — so once the frontend proxies /api/*, `public` would let a shared cache hold someone's
// assessment or run status. `no-store` is the only correct answer for all of them.
export const NO_STORE = { "Cache-Control": "no-store" } as const;
