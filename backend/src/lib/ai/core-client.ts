import { z } from "zod";
import { aiError } from "@/lib/errors";
import type { AiClient } from "./client";
import {
  assessmentOutputSchema,
  type AssessmentOutput,
  extractClaimsOutputSchema,
  type ExtractClaimsOutput,
  type ExtractClaimsRequest,
  type GenerateAssessmentRequest,
  type GenerateQuestionRequest,
  grounnelStatusResponseSchema,
  type GrounnelStatusOutput,
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
  schema: z.ZodSchema<T>,
  extraHeaders?: Record<string, string>
): Promise<T> {
  const { baseUrl, apiKey } = getCoreConfig();
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
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

// GET-equivalent of postCore (ADR-001 §2 — no such helper existed before Grounnel's
// GET /status/:id needed one). Same auth/error-handling shape, no body.
async function getCore<T>(path: string, schema: z.ZodSchema<T>): Promise<T> {
  const { baseUrl, apiKey } = getCoreConfig();
  const res = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
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
    async extractClaims(
      input: ExtractClaimsRequest
    ): Promise<ExtractClaimsOutput> {
      // No /v1/ prefix — Grounnel's routes are their own top-level surface in Core, not under
      // reflection's versioned path (biassemble-core/src/routes/grounnel.ts).
      return postCore(
        "/extract",
        { text: input.text, sessionId: input.sessionId },
        extractClaimsOutputSchema,
        input.clientIp ? { "X-Grounnel-Client-IP": input.clientIp } : undefined
      );
    },
    async getGrounnelStatus(id: string): Promise<GrounnelStatusOutput> {
      return getCore(`/status/${id}`, grounnelStatusResponseSchema);
    },
  };
}
