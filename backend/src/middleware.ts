import { NextResponse, type NextRequest } from "next/server";

// CORS for /api/* — a strict allowlist, never `*` and never reflected. Browser-enforced, so it
// stops other sites' JS, not curl; the real ceiling is core's rate limit plus the budget cap.
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean)
  .concat([
    "https://grounnel.vercel.app",
    "https://frontend-topaz-eight-10.vercel.app",
  ]);

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "[::1]"]);

/** Any http loopback origin, on any port. Dev only — vite walks the port forward when one is
 *  taken, and `<brand>.localhost` is how the two brands are told apart locally (brand.ts). */
function isDevOrigin(origin: string): boolean {
  // VERCEL_ENV, not NODE_ENV: `next build` only DEFAULTS NODE_ENV to production, so one env var
  // would open this on a real deploy. Vercel sets VERCEL_ENV itself and it cannot be faked locally.
  if (process.env.VERCEL_ENV || process.env.NODE_ENV === "production") return false;
  try {
    const { protocol, hostname } = new URL(origin);
    return protocol === "http:" && (LOOPBACK_HOSTS.has(hostname) || hostname.endsWith(".localhost"));
  } catch {
    return false;
  }
}

// Vercel previews are 403'd here deliberately (site spec 004, T037) — no fixed allowlist matches
// a per-deployment hostname, and previews must not spend production budget. CORS_ORIGINS admits one.

function isAllowed(origin: string | null): boolean {
  return origin !== null && (ALLOWED_ORIGINS.includes(origin) || isDevOrigin(origin));
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");

  // Present but not allowlisted is a site we do not serve — refuse before the route spends
  // anything. Absent is NOT rejected: same-origin GETs omit it, and so may our own proxy hop.
  if (origin !== null && !isAllowed(origin)) {
    return new NextResponse(null, { status: 403 });
  }

  // A client sending no Origin at all (curl) is the remaining hole; only the budget cap is a real
  // ceiling. Flagged off because it is unverified that Vercel forwards Origin across the rewrite.
  if (
    process.env.REQUIRE_ORIGIN_ON_WRITES === "1" &&
    request.method !== "GET" &&
    request.method !== "OPTIONS" &&
    origin === null
  ) {
    return new NextResponse(null, { status: 403 });
  }

  // Preflight: answered here, never reaching a route handler.
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
  }

  const response = NextResponse.next();
  for (const [k, v] of Object.entries(corsHeaders(origin))) response.headers.set(k, v);
  // Blanket, not per-route: /api/* is proxied through the site's edge, so every route under it
  // sits behind a shared CDN — including /api/result and /api/session. Next's default is `public`.
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    // Vary is required whenever the value depends on the request's Origin, or a shared cache can
    // hand one origin's response to another.
    Vary: "Origin",
    ...(isAllowed(origin) ? { "Access-Control-Allow-Origin": origin! } : {}),
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export const config = { matcher: "/api/:path*" };
