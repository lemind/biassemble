import { NextResponse } from "next/server";
import { handleCreateGrounnelExtract } from "@/services/grounnel.service";
import { AppException } from "@/lib/errors";

// Real end-user IP, not this server's own egress IP (ADR-001 §4) — x-forwarded-for's first
// value is the original client per the standard proxy-chain convention; Vercel sets this header.
function clientIpFrom(request: Request): string | undefined {
  const xff = request.headers.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || undefined;
}

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    const result = await handleCreateGrounnelExtract(text, clientIpFrom(request));
    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    if (error instanceof AppException) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to submit text";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
