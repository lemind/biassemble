import { NextResponse } from "next/server";
import { handleGetSharedAssessment } from "@/services/grounnel.service";
import { AppException } from "@/lib/errors";
import { clientIpFrom, NO_STORE } from "@/lib/http";

// Core answers unknown, malformed and deleted tokens identically (019 FR-010) and rate-limits
// reads (T014). Both statuses must pass through: aiError would report a mistyped link as 502.
const PASS_THROUGH = new Set([404, 429]);

function coreStatus(error: AppException): number {
  const status = (error.details as { status?: unknown } | undefined)?.status;
  return typeof status === "number" && PASS_THROUGH.has(status) ? status : error.statusCode;
}

// Required, not optional (site spec 004, T022): core is key-gated and sends no CORS headers,
// so the browser cannot call it directly. Mirrors the status proxy.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const assessment = await handleGetSharedAssessment(token, clientIpFrom(request));
    // These documents often name private individuals — link-only, never indexed. Core sets the
    // same header; repeated here because this response is what the browser actually receives.
    return NextResponse.json(assessment, {
      status: 200,
      headers: { "X-Robots-Tag": "noindex", ...NO_STORE },
    });
  } catch (error) {
    if (error instanceof AppException) {
      return NextResponse.json({ error: error.message }, { status: coreStatus(error), headers: NO_STORE });
    }
    const message = error instanceof Error ? error.message : "Failed to load assessment";
    return NextResponse.json({ error: message }, { status: 502, headers: NO_STORE });
  }
}
