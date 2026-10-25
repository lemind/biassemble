import type { OwnKeyTokenCounts } from "../types/grounnel";

/** One line, or null when there is nothing to show. The tilde marks a provider-reported approximation. */
export function ownKeyTokenLine(tokens: OwnKeyTokenCounts | null | undefined): string | null {
  if (!tokens) return null;
  const input = Math.trunc(tokens.input).toLocaleString("en-US");
  const output = Math.trunc(tokens.output).toLocaleString("en-US");
  return `This check used ~${input} input / ${output} output tokens on your key.`;
}
