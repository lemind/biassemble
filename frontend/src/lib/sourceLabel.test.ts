// Plain assert checks. Run: npx tsx src/lib/sourceLabel.test.ts
import assert from "node:assert/strict";
import { sourceLabel } from "./sourceLabel";
import type { ClaimSource } from "../types/grounnel";

const source: ClaimSource = {
  kind: "web",
  title: "Paris&#039; iconic monument",
  domain: "example.com",
  url: "https://example.com/tower",
  status: "ok",
};

assert.equal(sourceLabel(source.url, [source]), "example.com - Paris' iconic monument");

console.log("sourceLabel.test.ts ok");
