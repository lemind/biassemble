import { NextResponse } from "next/server";
import { buildStatsSnapshot } from "@/services/stats.service";

// Public aggregate, identical for every visitor — the one /api/* route that is cacheable, so
// middleware exempts it from the blanket no-store. One database read per hour per region.
const STATS_CACHE_CONTROL = "public, s-maxage=3600, stale-while-revalidate=86400";

export async function GET() {
  try {
    const snapshot = await buildStatsSnapshot();
    return NextResponse.json(snapshot, {
      status: 200,
      headers: { "Cache-Control": STATS_CACHE_CONTROL },
    });
  } catch (error) {
    // No cache header on the failure path, or one blip is served for an hour.
    const message = error instanceof Error ? error.message : "Failed to load stats";
    console.error("[grounnel:stats]", message);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
