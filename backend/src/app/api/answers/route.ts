import { NextResponse } from "next/server";
import { handleAnswer } from "@/services/question.service";
import { AppException } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, answers } = body;

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json(
        { error: "answers array is required" },
        { status: 400 }
      );
    }

    const result = await handleAnswer(sessionId, answers);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof AppException) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to submit answers";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
