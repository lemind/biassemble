import { NextResponse } from "next/server";
import { handleGetGrounnelStatus } from "@/services/grounnel.service";
import { AppException } from "@/lib/errors";
import { NO_STORE } from "@/lib/http";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const status = await handleGetGrounnelStatus(id);
    return NextResponse.json(status, { status: 200, headers: NO_STORE });
  } catch (error) {
    if (error instanceof AppException) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode, headers: NO_STORE });
    }
    const message =
      error instanceof Error ? error.message : "Failed to get status";
    return NextResponse.json({ error: message }, { status: 500, headers: NO_STORE });
  }
}
