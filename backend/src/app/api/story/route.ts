import { NextResponse } from "next/server";
import { handleCreateSession } from "@/services/session.service";

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Story text is required" },
        { status: 400 }
      );
    }

    const result = await handleCreateSession(text);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}