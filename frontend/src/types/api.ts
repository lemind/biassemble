/** Mirror of backend contracts — manual sync until codegen. See plan.md Phase 6. */

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

export interface BiasItem {
  name: string;
  explanation: string;
  storyConnection: string;
  alternativePerspective: string;
}

export interface ResultResponse {
  story: string;
  questions: string[];
  answers: string[];
  biases: BiasItem[];
  reflectionPrompt: string;
}
