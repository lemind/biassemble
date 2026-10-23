// Plain assert-based checks. Run: npx tsx src/lib/providerLabel.test.ts
import assert from "node:assert/strict";
import { checkedWithLabel } from "./providerLabel";

assert.equal(checkedWithLabel(undefined), "Checked with Gemini");
assert.equal(checkedWithLabel(null), "Checked with Gemini");
assert.equal(checkedWithLabel("gemini"), "Checked with Gemini");
assert.equal(checkedWithLabel("deepseek"), "Checked with DeepSeek");
assert.equal(checkedWithLabel("qwen"), "Checked with Qwen");

const pasted = "sk-pasted-into-provider-slot";
const label = checkedWithLabel(pasted);
assert.equal(label, "Checked with Gemini");
assert.equal(label.includes(pasted), false);

console.log("providerLabel.test.ts ok");
