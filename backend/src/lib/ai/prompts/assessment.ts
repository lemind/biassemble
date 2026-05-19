/**
 * Bias assessment prompt.
 * AI analyzes the full conversation (story + Q&A) and outputs structured bias assessment.
 * Full implementation in Phase 3 (T026).
 */
export function buildAssessmentPrompt(
  story: string,
  questions: string[],
  answers: string[]
): string {
  const conversation = questions
    .map((q, i) => `Q: ${q}\nA: ${answers[i] ?? "(not answered)"}`)
    .join("\n\n");

  return `
You are a cognitive bias analyst. Based on the user's story and their responses to your questions, identify exactly 2 cognitive biases that may be influencing their reasoning.

Story:
"""
${story}
"""

Conversation:
"""
${conversation}
"""

For each bias, provide:
1. Bias name (standard psychological term)
2. Explanation of what this bias is
3. How it specifically connects to the user's story (reference details)
4. An alternative perspective that accounts for this bias

Then provide a brief reflection prompt encouraging the user to think further.

Rules:
- Reference specific details from the user's story — no generic textbook output.
- Be educational, not clinical. Do NOT diagnose.
- Return ONLY a JSON object:
{
  "biases": [
    {
      "name": "string",
      "explanation": "string",
      "storyConnection": "string",
      "alternativePerspective": "string"
    }
  ],
  "reflectionPrompt": "string"
}

JSON:
`.trim();
}