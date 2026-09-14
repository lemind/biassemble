// Plain assert-based checks — no test framework. Run: npx tsx src/lib/refcheck.test.ts
// Guards the shared-link shape: sources present, citations absent — must still number and list.
import assert from 'node:assert/strict';
import { numberCitations } from './numberCitations';
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

test('a shared claim set is numbered from its sources', () => {
  const { references } = numberCitations(article, shared);
  assert.equal(references.length, 3, 'three unique sources across two claims');
  assert.deepEqual(
    references.map((r) => r.number),
    [1, 2, 3]
  );
  assert.deepEqual(references.map((r) => r.citations.length), [0, 0, 0], 'no citations to deep-link');
});

test('a shared claim carries inline numbers, same as a live one', () => {
  const { claimNumbers } = numberCitations(article, shared);
  assert.deepEqual(claimNumbers.get('shared-0'), [1, 2]);
  assert.deepEqual(claimNumbers.get('shared-1'), [1, 3], 'reuses [1] for the repeated source');
});

test('the same url with a trailing slash reuses its number', () => {
  const { references } = numberCitations(article, shared);
  assert.equal(references.filter((r) => r.url.includes('a.example')).length, 1);
});

test('an unreachable source is not offered as a reference', () => {
  const withDead: Claim[] = [
    { ...shared[0], sources: [{ ...web('https://dead.example/x'), status: 'unreachable' }] },
  ];
  assert.equal(numberCitations(article, withDead).references.length, 0);
});

console.log(`\n${passed} tests passed`);
