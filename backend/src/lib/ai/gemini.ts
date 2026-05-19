import { GoogleGenerativeAI } from "@google/generative-ai";

// Lazy init — doesn't throw at import time, only on first use.
// This prevents Next.js build/start crashes when .env.local isn't set up yet.

let _model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]> | null = null;

function getModel() {
  if (!_model) {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set"
      );
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    _model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });
  }
  return _model;
}

export interface GeminiResponse {
  text: string;
  finishReason: string | null;
}

export async function generateContent(
  prompt: string
): Promise<GeminiResponse> {
  const model = getModel();
  const result = await model.generateContent(prompt);
  const response = result.response;

  return {
    text: response.text(),
    finishReason: response.candidates?.[0]?.finishReason ?? null,
  };
}
