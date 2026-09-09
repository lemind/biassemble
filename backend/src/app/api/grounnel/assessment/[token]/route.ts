import { NextResponse } from "next/server";
import { handleGetSharedAssessment } from "@/services/grounnel.service";
import { AppException } from "@/lib/errors";

// Core answers an unknown token, a malformed one and a deleted run identically (019 FR-010) — and
// rate-limits reads (019 T014). Both statuses must reach the browser as themselves: aiError wraps
// every core failure as a 502 AppException, so without this the page would report an outage for a
// mistyped link.
const PASS_THROUGH = new Set([404, 429]);

function coreStatus(error: AppException): number {
  const status = (error.details as { status?: unknown } | undefined)?.status;
  return typeof status === "number" && PASS_THROUGH.has(status) ? status : error.statusCode;
}

/**
 * Required, not optional (site spec 004, T022): biassemble-core is key-gated for every other route
 * and sends no CORS headers, so the browser cannot call it directly. Mirrors the status proxy.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const assessment = await handleGetSharedAssessment(token);
    // These documents often name private individuals — link-only, never indexed. Core sets the
    // same header; repeated here because this response is what the browser actually receives.
    return NextResponse.json(assessment, {
      status: 200,
      headers: { "X-Robots-Tag": "noindex" },
    });
  } catch (error) {
    if (error instanceof AppException) {
      return NextResponse.json({ error: error.message }, { status: coreStatus(error) });
    }
    const message = error instanceof Error ? error.message : "Failed to load assessment";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
