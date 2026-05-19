import type { AiClient } from "./client";
import { createCoreClient } from "./core-client";
import { createDevMockClient } from "./dev-mock-client";

let _client: AiClient | null = null;

/**
 * AI_CLIENT_MODE:
 * - core (default in production): HTTP → Biassemble AI Core private service
 * - dev-mock: fixed responses, no proprietary prompts in this repo
 */
export function getAiClient(): AiClient {
  if (_client) return _client;

  const mode = process.env.AI_CLIENT_MODE ?? "dev-mock";
  _client = mode === "core" ? createCoreClient() : createDevMockClient();
  return _client;
}

export type { AiClient, AiClientMode } from "./client";
export type {
  QuestionOutput,
  AssessmentOutput,
  GenerateQuestionRequest,
  GenerateAssessmentRequest,
} from "./contracts";
