import { NextResponse } from "next/server";
import { handleCreateGrounnelExtract } from "@/services/grounnel.service";
import { AppException } from "@/lib/errors";
import { clientIpFrom, NO_STORE } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    // No inline validation here — handleCreateGrounnelExtract's own grounnelTextSchema check
    // (Zod, via validationError()) is the single source of truth for text validation, mapped
    // to a proper 400 by the catch block below. A duplicate route-level check previously made
    // that service-level validation unreachable in practice (2026-08-11 fix, T015).
    const result = await handleCreateGrounnelExtract(text, clientIpFrom(request));
    return NextResponse.json(result, { status: 202, headers: NO_STORE });
  } catch (error) {
    if (error instanceof AppException) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode, headers: NO_STORE });
    }
    const message =
      error instanceof Error ? error.message : "Failed to submit text";
    return NextResponse.json({ error: message }, { status: 500, headers: NO_STORE });
  }
}
