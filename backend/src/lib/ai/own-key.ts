/** Forward a visitor key as headers. The key is not logged and not put in the JSON body (D033). */

export const CORS_ALLOW_HEADERS = "Content-Type, X-Grounnel-Provider, X-Grounnel-Provider-Key";

const CATEGORY_MESSAGE: Record<string, string> = {
  invalid_key: "The API key was rejected.",
  no_balance: "The account has no balance for this model.",
  rate_limited: "The provider rate limit stopped this check.",
  unavailable: "The provider is unavailable.",
  model_access_denied: "This account cannot use that model.",
};

const KEY_MATERIAL = /sk-[A-Za-z0-9._-]+|AIza[0-9A-Za-z_-]{10,}|AQ\.[A-Za-z0-9._-]+|bearer\s+\S+/i;
const KEY_MATERIAL_GLOBAL = /sk-[A-Za-z0-9._-]+|AIza[0-9A-Za-z_-]{10,}|AQ\.[A-Za-z0-9._-]+|bearer\s+\S+/gi;

/** Strip every key-shaped substring. A fresh lastIndex so the shared /g pattern cannot skip a later match. */
export function scrubKeyMaterial(text: string): string {
  KEY_MATERIAL_GLOBAL.lastIndex = 0;
  return text.replace(KEY_MATERIAL_GLOBAL, "[REDACTED]");
}

export function ownKeyForwardHeaders(
  provider: string | null | undefined,
  providerKey: string | null | undefined,
): Record<string, string> {
  const key = providerKey?.trim() ?? "";
  if (!key) return {};
  const id = provider?.trim() || "gemini";
  return {
    "X-Grounnel-Provider": id,
    "X-Grounnel-Provider-Key": key,
  };
}

/**
 * Sentence for a classified provider failure. invalid_key is the authentication error.
 * The raw body is not returned (D033, T2014).
 */
export function safeProviderMessage(body: string): string | null {
  let parsed: { error?: unknown; message?: unknown };
  try {
    parsed = JSON.parse(body) as { error?: unknown; message?: unknown };
  } catch {
    return null;
  }
  if (typeof parsed.error !== "string") return null;
  const fallback = CATEGORY_MESSAGE[parsed.error];
  if (!fallback) return null;
  if (parsed.error === "invalid_key") return fallback;
  if (
    typeof parsed.message === "string" &&
    parsed.message.length > 0 &&
    parsed.message.length <= 200 &&
    !KEY_MATERIAL.test(parsed.message)
  ) {
    return parsed.message;
  }
  return fallback;
}
