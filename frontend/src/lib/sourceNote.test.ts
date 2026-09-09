/**
 * Plain assert-based checks — no test framework. Run: npx tsx src/lib/sourceNote.test.ts
 * Covers T014 (a contradicted claim must not label refuting evidence as supporting) and T015
 * (a claim with no verdict must not render bare, unexplained links).
 */
import assert from 'node:assert/strict';
import { sourceNote } from './sourceNote';
import type { Claim, ClaimVerdict } from '../types/grounnel';

let passed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.error(`  ✗ ${name}`);
    throw error;
  }
}

function claim(verdict: ClaimVerdict | null, overrides: Partial<Claim> = {}): Claim {
  return {
    id: 'c1',
    text: 'a claim',
    status: verdict === null ? 'failed' : 'done',
    verdict,
    evidence: null,
    confidence: null,
    reason: null,
    sources: [],
    citations: [],
    sourceExcerpt: null,
    ...overrides,
  };
}

// T014 — the bug: 'contradicted' shared a branch with the affirmative verdicts.
test('a contradicted claim labels its sources as refuting, never as supporting', () => {
  assert.equal(sourceNote(claim('contradicted'), 3), 'refuting');
});

test('affirmative verdicts still say supporting', () => {
  assert.equal(sourceNote(claim('supported'), 3), 'supporting');
  assert.equal(sourceNote(claim('partially_supported'), 3), 'supporting');
});

// T015 — the bug: verdict === null matched none of the flags and fell through to bare links.
test('a claim with no verdict says verification is incomplete', () => {
  assert.equal(sourceNote(claim(null), 2), 'unevaluated');
  assert.equal(sourceNote(claim(null, { status: 'pending' }), 2), 'unevaluated');
});

test('every verdict with sources produces some note — none falls through to bare links', () => {
  const verdicts: (ClaimVerdict | null)[] = [
    'supported',
    'partially_supported',
    'unsupported',
    'contradicted',
    'unverifiable',
    null,
  ];
  for (const verdict of verdicts) {
    assert.notEqual(sourceNote(claim(verdict), 2), null, `${verdict} rendered bare links`);
  }
});

test('a zero-evidence verdict with nothing found says so rather than staying silent', () => {
  assert.equal(sourceNote(claim('unsupported'), 0), 'no-sources-found');
  assert.equal(sourceNote(claim('unverifiable'), 0), 'no-sources-found');
});

test('searched-but-unconfirmed wording is kept for the failed verdicts', () => {
  assert.equal(sourceNote(claim('unsupported'), 2), 'searched-unconfirmed');
  assert.equal(sourceNote(claim('unverifiable'), 2), 'searched-unconfirmed');
});

// A resolved citation quotes the sentence itself, so the note would be redundant — except for a
// claim with no verdict, which must always say why nothing was evaluated.
test('a claim with citations gets no note, unless it never reached a verdict', () => {
  const cited = { citations: [{ source: 'A', sentence: 1, url: 'https://x', text: 'q' }] };
  assert.equal(sourceNote(claim('supported', cited), 2), null);
  assert.equal(sourceNote(claim('contradicted', cited), 2), null);
  assert.equal(sourceNote(claim(null, cited), 2), 'unevaluated');
});

console.log(`\n${passed} tests passed`);
