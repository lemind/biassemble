// Plain assert-based checks. Run: npx tsx src/lib/providerKey.test.ts
import assert from "node:assert/strict";
import { EMPTY_OWN_KEY, OWN_KEY_PROVIDERS, ownKeyHeaders, ownKeyNotice } from "./providerKey";

const pasted = "sk-pasted-into-provider-slot";

assert.deepEqual(
  OWN_KEY_PROVIDERS.map((item) => item.id),
  ["gemini", "deepseek", "qwen"],
);

assert.equal(OWN_KEY_PROVIDERS.find((item) => item.id === "gemini")?.keyUrl, "https://aistudio.google.com/apikey");
assert.equal(OWN_KEY_PROVIDERS.find((item) => item.id === "deepseek")?.keyUrl, "https://platform.deepseek.com/api_keys");
assert.equal(OWN_KEY_PROVIDERS.find((item) => item.id === "qwen")?.keyUrl, "https://home.qwencloud.com/api-keys");

for (const item of OWN_KEY_PROVIDERS) {
  const notice = ownKeyNotice(item.id);
  assert.equal(notice.includes(item.company), true);
  assert.equal(notice.includes("does not save it"), true);
  assert.equal(notice.includes("Google still searches"), true);
  assert.equal(notice.includes("Grounnel's Google account"), true);
  assert.equal(notice.includes("share link"), true);
  assert.equal(notice.includes("this page shows how many input and output tokens"), true);
  assert.equal(notice.includes(item.keyLinkLabel), false);
  assert.equal(item.keyUrl.startsWith("https://"), true);
  assert.equal(notice.includes(pasted), false);
}

assert.equal(ownKeyHeaders(EMPTY_OWN_KEY), undefined);
assert.equal(ownKeyHeaders({ enabled: true, provider: "gemini", apiKey: "   " }), undefined);

const headers = ownKeyHeaders({ enabled: true, provider: "deepseek", apiKey: `  ${pasted}  ` });
assert.deepEqual(headers, {
  "X-Grounnel-Provider": "deepseek",
  "X-Grounnel-Provider-Key": pasted,
});
const body = { text: "Some pasted article text." };
assert.equal(JSON.stringify(body).includes(pasted), false);
assert.equal(Object.keys(headers ?? {}).includes("X-Grounnel-Provider-Key"), true);

console.log("providerKey.test.ts ok");
