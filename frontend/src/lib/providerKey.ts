import type { GrounnelProviderId } from "../types/grounnel";

/** Own-key choices. There is no site-paid option here (D033). */
export const OWN_KEY_PROVIDERS: readonly { id: GrounnelProviderId; label: string; company: string }[] = [
  { id: "gemini", label: "Gemini", company: "Google" },
  { id: "deepseek", label: "DeepSeek", company: "DeepSeek" },
  { id: "qwen", label: "Qwen", company: "Alibaba Cloud" },
];

/** Page memory only. Callers keep this in component state and do not write storage (D033). */
export interface OwnKeyChoice {
  enabled: boolean;
  provider: GrounnelProviderId;
  apiKey: string;
}

export const EMPTY_OWN_KEY: OwnKeyChoice = { enabled: false, provider: "gemini", apiKey: "" };

/** Shown before an own-key check. Names the company, the key, Google search, and the public link. */
export function ownKeyNotice(provider: GrounnelProviderId): string {
  const row = OWN_KEY_PROVIDERS.find((item) => item.id === provider) ?? OWN_KEY_PROVIDERS[0];
  return `${row.label} calls are processed by ${row.company}. Grounnel uses the key for this check and does not save it. Google still searches the web on Grounnel's account. After the check, this page shows how many input and output tokens were charged to the key. Anyone with the share link can open the result.`;
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
