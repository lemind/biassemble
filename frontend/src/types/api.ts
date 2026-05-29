/**
 * Backend-specific API contracts.
 *
 * Core reflection schemas (BiasItem, etc.) are auto-generated in
 * `api.generated.ts` via `pnpm generate:types`.
 */
import type { BiasItem } from "./api.generated";

export type { BiasItem } from "./api.generated";

export interface SubmitStoryResponse {
  sessionId: string;
  questions: string[];
}

export interface SubmitAnswersResponse {
  done: true;
  total: number;
  assessmentPending: true;
}

export interface SessionStatusResponse {
  id: string;
  status: string;
  questionCount: number;
  answerCount: number;
  assessmentReady: boolean;
}

export interface ResultResponse {
  story: string;
  questions: string[];
  answers: string[];
  biases: BiasItem[];
  reflectionPrompt: string;
}
