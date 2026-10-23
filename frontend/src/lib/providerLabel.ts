const PROVIDER_NAMES = {
  gemini: "Gemini",
  deepseek: "DeepSeek",
  qwen: "Qwen",
} as const;

export type GrounnelProviderId = keyof typeof PROVIDER_NAMES;

/** Display name for the judge. An unknown value stays Gemini and is not echoed (D033). */
export function checkedWithLabel(provider: string | null | undefined): string {
  if (provider === "gemini" || provider === "deepseek" || provider === "qwen") {
    return `Checked with ${PROVIDER_NAMES[provider]}`;
  }
  return "Checked with Gemini";
}
