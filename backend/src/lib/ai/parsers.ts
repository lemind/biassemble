import { z } from "zod";
import { aiParseError } from "@/lib/errors";

/**
 * Parses raw AI output (markdown-fenced JSON or plain JSON) using a Zod schema.
 * Extracts JSON from ```json ... ``` blocks if present.
 *
 * Throws `AppException` (AI_PARSE_ERROR, 502) on failure — not a plain Error — so callers'
 * `error instanceof AppException` checks map this to a typed, correctly-coded response instead
 * of falling through to a generic 500 (2026-08-11 fix, T015: this was silently not the case).
 */
export async function parseJsonFromAi<T>(
  raw: string,
  schema: z.ZodSchema<T>
): Promise<T> {
  // Strip markdown code fences if present
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw aiParseError("Failed to parse AI output as JSON", { raw });
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw aiParseError("AI output failed Zod validation", {
      raw,
      zodErrors: result.error.flatten(),
    });
  }

  return result.data;
}