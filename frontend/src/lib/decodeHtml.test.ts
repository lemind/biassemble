// Plain assert checks. Run: npx tsx src/lib/decodeHtml.test.ts
import assert from "node:assert/strict";
import { decodeHtmlEntities } from "./decodeHtml";

assert.equal(decodeHtmlEntities("Paris&#039; iconic monument"), "Paris' iconic monument");
assert.equal(decodeHtmlEntities("NASA Myth Answer &#x2d; Great Wall"), "NASA Myth Answer - Great Wall");
assert.equal(decodeHtmlEntities("A &amp; B &quot;quoted&quot;"), 'A & B "quoted"');
assert.equal(decodeHtmlEntities("plain title"), "plain title");
assert.equal(decodeHtmlEntities("&lt;script&gt;"), "<script>");

console.log("decodeHtml.test.ts ok");
