import { NextResponse } from "next/server";
import { getSessionData } from "@/lib/db/queries";
import { AppException } from "@/lib/errors";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const data = await getSessionData(id);
    if (!data) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (!data.biases || !data.reflectionPrompt) {
      return NextResponse.json(
        { error: "Assessment not ready" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      story: data.story,
      questions: data.questions,
      answers: data.answers,
      biases: data.biases,
      reflectionPrompt: data.reflectionPrompt,
    });
  } catch (error) {
    if (error instanceof AppException) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to get result";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
