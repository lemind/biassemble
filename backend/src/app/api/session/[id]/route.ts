import { NextResponse } from "next/server";
import { getSession, getSessionData } from "@/lib/db/queries";
import { AppException } from "@/lib/errors";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await getSession(id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const data = await getSessionData(id);
    const assessmentReady =
      data?.biases != null && data?.reflectionPrompt != null;

    return NextResponse.json({
      id: session.id,
      status: session.status,
      questionCount: data?.questions.length ?? 0,
      answerCount: data?.answers.length ?? 0,
      assessmentReady,
    });
  } catch (error) {
    if (error instanceof AppException) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to get session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
