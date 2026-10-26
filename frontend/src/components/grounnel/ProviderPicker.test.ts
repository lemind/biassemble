// Plain assert checks. Run: npx tsx --tsconfig tsconfig.app.json src/components/grounnel/ProviderPicker.test.ts
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ProviderPicker from "./ProviderPicker";

const html = renderToStaticMarkup(
  createElement(ProviderPicker, {
    value: { enabled: true, provider: "gemini", apiKey: "pasted-key" },
    onChange: () => {},
  }),
);

assert.match(html, /type="password"/);
assert.match(html, /value="pasted-key"/);
assert.match(html, /aria-label="Show API key"/);
assert.doesNotMatch(html, /aria-label="Hide API key"/);
assert.match(html, /aria-pressed="false"/);
assert.match(html, /type="button"/);
assert.match(html, /<svg /);

const hidden = renderToStaticMarkup(
  createElement(ProviderPicker, {
    value: { enabled: false, provider: "gemini", apiKey: "" },
    onChange: () => {},
  }),
);
assert.doesNotMatch(hidden, /API key/);
assert.doesNotMatch(hidden, /Show API key/);

console.log("ProviderPicker show/hide ok");
