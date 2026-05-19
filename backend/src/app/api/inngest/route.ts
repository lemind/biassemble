import { serve } from "inngest/next";
import { inngest } from "@/lib/workflow/inngest-adapter";

// Placeholder handlers — full workflow functions defined in Phase 3 (T041, T042)
const generateQuestions = inngest.createFunction(
  { id: "generate-questions" },
  { event: "biassemble/generate-questions" },
  async ({ event }) => {
    const { sessionId } = event.data as { sessionId: string };
    // TODO: Phase 3 — call Gemini → parse → store questions
    console.log(`[Inngest] generate-questions for session ${sessionId}`);
  }
);

const generateAssessment = inngest.createFunction(
  { id: "generate-assessment" },
  { event: "biassemble/generate-assessment" },
  async ({ event }) => {
    const { sessionId } = event.data as { sessionId: string };
    // TODO: Phase 3 — call Gemini → parse → store assessment
    console.log(`[Inngest] generate-assessment for session ${sessionId}`);
  }
);

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateQuestions, generateAssessment],
});