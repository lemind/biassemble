/**
 * Question generation prompt.
 * AI generates follow-up questions based on the user's story + previous answers.
 * Full implementation in Phase 3 (T025).
 */
export function buildQuestionPrompt(story: string): string {
  return `
You are a reflective dialogue assistant. Based on the user's story below, generate a single contextual follow-up question that helps them reflect on their reasoning, assumptions, and perspective.

Story:
"""
${story}
"""

Rules:
- The question must reference specific details from the story.
- Be curious, not judgmental.
- Do NOT diagnose or use therapeutic language.
- Return ONLY a JSON object: { "question": "..." }

JSON:
`.trim();
}

export function buildFollowUpQuestionPrompt(
  story: string,
  previousQuestions: string[],
  previousAnswers: string[]
): string {
  const history = previousQuestions
    .map(
      (q, i) => `Q: ${q}\nA: ${previousAnswers[i] ?? "(not answered yet)"}`
    )
    .join("\n\n");

  return `
You are a reflective dialogue assistant. Based on the user's story and their previous answers, generate the next follow-up question.

Story:
"""
${story}
"""

Previous Q&A:
"""
${history}
"""

Rules:
- Reference both the story AND the user's previous answers.
- If enough context has been gathered, indicate the session is complete.
- Return ONLY a JSON object: { "question": "...", "isComplete": false }

JSON:
`.trim();
}