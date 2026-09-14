import { NextResponse } from "next/server";
import { buildStatsSnapshot } from "@/services/stats.service";

// Public aggregate, identical for every visitor — the one /api/* route that is cacheable, so
// middleware exempts it from the blanket no-store. Two headers, because Vercel strips s-maxage
// from Cache-Control when no CDN-Cache-Control is present: the CDN gets an hour, browsers 5 min.
const CACHE_HEADERS = {
  "CDN-Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
  "Cache-Control": "public, max-age=300",
} as const;

export async function GET() {
  try {
    const snapshot = await buildStatsSnapshot();
    return NextResponse.json(snapshot, { status: 200, headers: CACHE_HEADERS });
  } catch (error) {
    // No cache header on the failure path, or one blip is served for an hour.
    const message = error instanceof Error ? error.message : "Failed to load stats";
    console.error("[grounnel:stats]", message);
    return NextResponse.json(
      { error: "Failed to load stats" },
      { status: 502, headers: { "Cache-Control": "no-store", "CDN-Cache-Control": "no-store" } }
    );
  }
}
