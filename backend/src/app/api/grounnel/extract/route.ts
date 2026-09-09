import { NextResponse } from "next/server";
import { handleCreateGrounnelExtract } from "@/services/grounnel.service";
import { AppException } from "@/lib/errors";
import { clientIpCandidates, clientIpFrom, NO_STORE } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    // No inline validation here — handleCreateGrounnelExtract's own grounnelTextSchema check
    // (Zod, via validationError()) is the single source of truth for text validation, mapped
    // to a proper 400 by the catch block below. A duplicate route-level check previously made
    // that service-level validation unreachable in practice (2026-08-11 fix, T015).
    const clientIp = clientIpFrom(request);
    // Which header carries the end user through the frontend's /api rewrite is a property of the
    // deployed edge, not something to assume — one real run's log settles it. Remove after that.
    console.log(`[grounnel:extract] ip=${clientIp} candidates=${JSON.stringify(clientIpCandidates(request))}`);
    const result = await handleCreateGrounnelExtract(text, clientIp);
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
