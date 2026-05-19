import { z } from "zod";

/**
 * Parses raw AI output (markdown-fenced JSON or plain JSON) using a Zod schema.
 * Extracts JSON from ```json ... ``` blocks if present.
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
    throw new ParseError("Failed to parse AI output as JSON", raw);
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new ParseError(
      "AI output failed Zod validation",
      raw,
      result.error.flatten()
    );
  }

  return result.data;
}

export class ParseError extends Error {
  public readonly raw: string;
  public readonly zodErrors?: unknown;

  constructor(message: string, raw: string, zodErrors?: unknown) {
    super(message);
    this.name = "ParseError";
    this.raw = raw;
    this.zodErrors = zodErrors;
  }
}