// Plain assert checks. Run: npx tsx --tsconfig tsconfig.app.json src/components/grounnel/RunView.test.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import RunView from "./RunView";
import { ownKeyTokenLine } from "../../lib/ownKeyTokens";
import type { RunProgress } from "../../types/grounnel";

const base: RunProgress = {
  status: "verifying",
  progress: { checked: 0, total: 1 },
  claims: [],
  caps_hit: false,
  elapsed_seconds: 1,
  provider: "deepseek",
};

function html(status: RunProgress): string {
  return renderToStaticMarkup(createElement(RunView, { articleText: "A short article.", status }));
}

const shown = html({ ...base, ownKeyTokens: { input: 58786, output: 1200 } });
assert.match(shown, /This check used ~58,786 input \/ 1,200 output tokens on your key\./);

assert.equal(html({ ...base, ownKeyTokens: null }).includes("tokens on your key"), false);
assert.equal(html(base).includes("tokens on your key"), false);
assert.equal(ownKeyTokenLine(null), null);
assert.equal(ownKeyTokenLine(undefined), null);

const page = readFileSync(new URL("./SharedAssessmentPage.tsx", import.meta.url), "utf8");
assert.match(page, /ownKeyTokens:\s*assessment\.ownKeyTokens/);

console.log("RunView own-key tokens ok");
