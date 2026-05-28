import { z } from "zod";
import { aiError } from "@/lib/errors";
import type { AiClient } from "./client";
import {
  assessmentOutputSchema,
  type AssessmentOutput,
  type GenerateAssessmentRequest,
  type GenerateQuestionRequest,
  questionOutputSchema,
  type QuestionOutput,
} from "./contracts";
import { parseJsonFromAi } from "./parsers";

export function getCoreConfig() {
  const baseUrl = process.env.AI_CORE_BASE_URL?.replace(/\/$/, "");
  const apiKey = process.env.AI_CORE_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error(
      "AI_CORE_BASE_URL and AI_CORE_API_KEY are required when AI_CLIENT_MODE=core"
    );
  }
  return { baseUrl, apiKey };
}

async function postCore<T>(
  path: string,
  body: unknown,
  schema: z.ZodSchema<T>
): Promise<T> {
  const { baseUrl, apiKey } = getCoreConfig();
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // Try to extract the actual error message from Core's JSON response
    let message = `AI Core request failed: ${res.status}`;
    try {
      const parsed = JSON.parse(text);
      if (parsed?.error) {
        message = parsed.error;
      }
    } catch {
      // text is not JSON — use the generic message
    }
    throw aiError(message, { path, body: text, status: res.status });
  }

  const raw = await res.text();
  return parseJsonFromAi(raw, schema);
}

export function createCoreClient(): AiClient {
  return {
    mode: "core",
    async generateQuestion(
      input: GenerateQuestionRequest
    ): Promise<QuestionOutput> {
      return postCore(
        "/v1/reflection/question",
        input,
        questionOutputSchema
      );
    },
    async generateAssessment(
      input: GenerateAssessmentRequest
    ): Promise<AssessmentOutput> {
      return postCore(
        "/v1/reflection/assessment",
        input,
        assessmentOutputSchema
      );
    },
  };
}
