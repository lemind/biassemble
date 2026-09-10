import { NextResponse, type NextRequest } from "next/server";

/**
 * CORS for /api/* — a strict allowlist, never `*` and never a reflected origin.
 *
 * What this does: stops another website's JavaScript from calling this API with a visitor's
 * browser. What it does NOT do: stop `curl`, or any non-browser client. CORS is enforced by the
 * browser, not here, so it is not an access control — the ceiling on abuse is the per-IP rate
 * limit in core plus the cloud budget cap (site spec 004, T017).
 */
const DEV_ORIGINS = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"].flatMap((host) =>
  [5173, 4173].map((port) => `http://${host}:${port}`)
);

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean)
  .concat([
    "https://grounnel.vercel.app",
    "https://frontend-topaz-eight-10.vercel.app",
    // Dev only. In production this would let any page a visitor happens to have on Vite's default
    // port read this API cross-origin. Every loopback spelling the app itself accepts as a dev
    // host (frontend/src/lib/brand.ts DEV_HOSTS), on both vite's dev and preview ports.
    ...(process.env.NODE_ENV === "production" ? [] : DEV_ORIGINS),
  ]);

// Vercel previews are 403'd here deliberately (site spec 004, T037) — no fixed allowlist matches
// a per-deployment hostname, and previews must not spend production budget. CORS_ORIGINS admits one.

function isAllowed(origin: string | null): boolean {
  return origin !== null && ALLOWED_ORIGINS.includes(origin);
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");

  // A browser sends Origin on every cross-origin request and on same-origin POSTs. Present but
  // not allowlisted is a site we do not serve — refuse before the route runs, so a disallowed
  // origin cannot spend anything even if it ignores the missing CORS header on the way back.
  // Absent is NOT rejected: same-origin GETs omit it, and so may the frontend's own proxy hop.
  if (origin !== null && !isAllowed(origin)) {
    return new NextResponse(null, { status: 403 });
  }

  // The remaining hole is a client that sends no Origin at all — `curl` — which is what actually
  // spends money. A browser always sends Origin on a POST, same-origin included, so requiring it
  // on writes blocks naive scripts (a forged header still passes; only the budget cap is a real
  // ceiling). Behind a flag because it is unverified whether Vercel forwards Origin across the
  // frontend's /api rewrite: if it does not, turning this on refuses every real submission.
  // Enable with REQUIRE_ORIGIN_ON_WRITES=1 once production traffic shows Origin arriving.
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
  // Blanket, not per-route: /api/* is now proxied through the site's Vercel edge, so EVERY route
  // under it is behind a shared CDN — including /api/result and /api/session, which return one
  // person's story and answers. Next's default there is `public`.
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
