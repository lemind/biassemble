import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!apiKey) {
  throw new Error(
    "GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set"
  );
}

const genAI = new GoogleGenerativeAI(apiKey);

// Gemini Flash 2.0 — fast, cheap, free tier 60 req/min
export const flashModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

export interface GeminiResponse {
  text: string;
  finishReason: string | null;
}

export async function generateContent(
  prompt: string
): Promise<GeminiResponse> {
  const result = await flashModel.generateContent(prompt);
  const response = result.response;

  return {
    text: response.text(),
    finishReason: response.candidates?.[0]?.finishReason ?? null,
  };
}