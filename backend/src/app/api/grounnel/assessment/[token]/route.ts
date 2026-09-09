import { NextResponse } from "next/server";
import { handleGetSharedAssessment } from "@/services/grounnel.service";
import { AppException } from "@/lib/errors";

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
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    // Core answers an unknown token, a malformed one and a deleted run identically (019 FR-010);
    // collapsing every non-AppException failure to 404 here would hide a real outage as "missing".
    const message = error instanceof Error ? error.message : "Failed to load assessment";
    const status = message === "not_found" ? 404 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
