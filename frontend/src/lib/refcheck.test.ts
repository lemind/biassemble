// Plain assert-based checks — no test framework. Run: npx tsx src/lib/refcheck.test.ts
// Guards the shared-link regression: sources present, citations absent, References list empty.
import assert from 'node:assert/strict';
import { numberCitations, numberSources } from './numberCitations';
import type { Claim, ClaimSource } from '../types/grounnel';

const web = (url: string, title = 'Example'): ClaimSource => ({
  kind: 'web',
  title,
  domain: new URL(url).hostname,
  url,
  status: 'ok',
});

const shared: Claim[] = [
  {
    id: 'shared-0',
    text: 'The first flight covered 852 feet.',
    status: 'done',
    verdict: 'supported',
    evidence: 'e',
    confidence: 0.9,
    reason: 'r',
    sources: [web('https://a.example/one'), web('https://b.example/two')],
    citations: [],
    sourceExcerpt: 'The first flight covered 852 feet.',
  },
  {
    id: 'shared-1',
    text: 'It happened in 1903.',
    status: 'done',
    verdict: 'supported',
    evidence: 'e',
    confidence: 0.9,
    reason: 'r',
    // Same source as claim 0 with a trailing slash — must reuse its number, not add an entry.
    sources: [web('https://a.example/one/'), web('https://c.example/three')],
    citations: [],
    sourceExcerpt: 'It happened in 1903.',
  },
];

const article = 'The first flight covered 852 feet. It happened in 1903.';

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

test('a shared claim set yields no citation-based references', () => {
  assert.equal(numberCitations(article, shared).references.length, 0);
});

test('the source fallback lists every unique source instead', () => {
  const refs = numberSources(article, shared);
  assert.equal(refs.length, 3, 'three unique sources across two claims');
  assert.deepEqual(
    refs.map((r) => r.number),
    [1, 2, 3]
  );
});

test('the same url with a trailing slash reuses its number', () => {
  const refs = numberSources(article, shared);
  assert.equal(refs.filter((r) => r.url.includes('a.example')).length, 1);
});

test('an unreachable source is not offered as a reference', () => {
  const withDead: Claim[] = [
    { ...shared[0], sources: [{ ...web('https://dead.example/x'), status: 'unreachable' }] },
  ];
  assert.equal(numberSources(article, withDead).length, 0);
});

console.log(`\n${passed} tests passed`);
