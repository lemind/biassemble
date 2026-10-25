import type { GrounnelProviderId } from "../types/grounnel";

/** Own-key choices. There is no site-paid option here (D033). keyUrl is that provider's API-key page. */
export const OWN_KEY_PROVIDERS: readonly {
  id: GrounnelProviderId;
  label: string;
  company: string;
  keyUrl: string;
  keyLinkLabel: string;
}[] = [
  { id: "gemini", label: "Gemini", company: "Google", keyUrl: "https://aistudio.google.com/apikey", keyLinkLabel: "Google AI Studio" },
  { id: "deepseek", label: "DeepSeek", company: "DeepSeek", keyUrl: "https://platform.deepseek.com/api_keys", keyLinkLabel: "DeepSeek API keys" },
  { id: "qwen", label: "Qwen", company: "Alibaba Cloud", keyUrl: "https://home.qwencloud.com/api-keys", keyLinkLabel: "Qwen API keys" },
];

/** Page memory only. Callers keep this in component state and do not write storage (D033). */
export interface OwnKeyChoice {
  enabled: boolean;
  provider: GrounnelProviderId;
  apiKey: string;
}

export const EMPTY_OWN_KEY: OwnKeyChoice = { enabled: false, provider: "gemini", apiKey: "" };

/** Shown before an own-key check. Names the company, and how the key is used (D033, FR-021). */
export function ownKeyTransparency(provider: GrounnelProviderId): readonly string[] {
  const row = OWN_KEY_PROVIDERS.find((item) => item.id === provider) ?? OWN_KEY_PROVIDERS[0];
  return [
    `${row.label} calls are processed by ${row.company}.`,
    "The key is sent over HTTPS and used for this one check. Grounnel does not save it. It lives only in this page and is gone when you close or reload the tab.",
    "We do not write the key to our database. Key-shaped text is removed from errors we store.",
    "The key pays the provider directly. Grounnel does not bill you through it and does not hold a balance on it.",
    "Your key is used for the model calls on this check, including reading the text and judging the claims. Web search still runs on Grounnel's Google account, at no cost to you.",
    "Anyone with the share link can open the result.",
  ];
}

/** One string for the same notice. Callers that render a list use `ownKeyTransparency`. */
export function ownKeyNotice(provider: GrounnelProviderId): string {
  return ownKeyTransparency(provider).join(" ");
}

/** Request headers only. A blank key is omitted so the check is not sent, and the key is not a body field. */
export function ownKeyHeaders(choice: OwnKeyChoice): Record<string, string> | undefined {
  if (!choice.enabled) return undefined;
  const key = choice.apiKey.trim();
  if (!key) return undefined;
  return {
    "X-Grounnel-Provider": choice.provider,
    "X-Grounnel-Provider-Key": key,
  };
}
