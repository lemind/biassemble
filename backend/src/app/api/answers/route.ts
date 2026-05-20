import { NextResponse } from "next/server";
import { handleAnswer } from "@/services/question.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, text } = body;

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Answer text is required" },
        { status: 400 }
      );
    }

    const result = await handleAnswer(sessionId, text);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to submit answer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}