/**
 * Plain assert-based checks for matchClaimSpans — no test framework (frontend has no vitest,
 * plan.md's Testing decision). Run: npx tsx src/lib/matchClaimSpans.test.ts
 *
 * Cases drawn from the real observed sample (plan.md's Design Decisions) plus overlap/no-match
 * cases. Expanded further in specs/002-grounnel-frontend/tasks.md T017 (Phase 5) with duplicate-
 * content cases.
 */
import assert from 'node:assert/strict';
import { matchClaimSpans } from './matchClaimSpans';
import type { Claim } from '../types/grounnel';

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

function claim(overrides: Partial<Claim> & { id: string; text: string }): Claim {
  return {
    status: 'done',
    verdict: 'supported',
    evidence: null,
    confidence: null,
    reason: null,
    sources: [],
    citations: [],
    ...overrides,
  };
}

// ─── Exact match ─────────────────────────────────────────────────
test('exact verbatim substring matches directly', () => {
  const article =
    'Researchers using X-ray tomography found that the Antikythera mechanism contained at least 30 bronze gears, some cut with hundreds of triangular teeth.';
  const c = claim({
    id: 'c1',
    text: 'Researchers using X-ray tomography found that the Antikythera mechanism contained at least 30 bronze gears.',
  });
  const result = matchClaimSpans(article, [c]);
  const span = result.get('c1');
  assert.ok(span, 'expected a match');
  assert.equal(article.slice(span!.start, span!.end).includes('Antikythera mechanism'), true);
});

// ─── Sentence-level fallback: appositive removed ──────────────────
test('appositive-removed claim falls back to the containing sentence', () => {
  const article =
    "Nauru, the world's smallest island nation by population, briefly became one of the wealthiest countries per capita in the 1970s due to phosphate mining revenue.";
  const c = claim({
    id: 'c1',
    text: 'Nauru briefly became one of the wealthiest countries per capita in the 1970s due to phosphate mining revenue.',
  });
  const result = matchClaimSpans(article, [c]);
  const span = result.get('c1');
  assert.ok(span, 'expected a sentence-level match');
  assert.equal(article.slice(span!.start, span!.end), article);
});

// ─── Sentence-level fallback: pronoun resolved ────────────────────
test('pronoun-resolved claim falls back to the containing sentence', () => {
  const article =
    'Mount Everest is the highest mountain on Earth above sea level, making it the tallest mountain above sea level on Earth.';
  const c = claim({
    id: 'c1',
    text: 'Mount Everest is the tallest mountain above sea level on Earth.',
  });
  const result = matchClaimSpans(article, [c]);
  assert.ok(result.get('c1'), 'expected a sentence-level match');
});

// ─── No match clears the threshold ────────────────────────────────
test('unrelated claim text does not match anything', () => {
  const article = 'The Eiffel Tower was completed in 1889.';
  const c = claim({ id: 'c1', text: 'Quantum computers use qubits instead of classical bits.' });
  const result = matchClaimSpans(article, [c]);
  assert.equal(result.get('c1'), null);
});

// ─── Overlap: earliest-start wins, loser still keyed (null) ──────
test('overlapping spans resolve to the earliest-starting claim; the loser still has an entry (null)', () => {
  const article = 'The Eiffel Tower was completed in 1889 and stands in Paris.';
  const a = claim({ id: 'a', text: 'The Eiffel Tower was completed in 1889 and stands in Paris.' });
  const b = claim({ id: 'b', text: 'The Eiffel Tower was completed in 1889.' });
  const result = matchClaimSpans(article, [a, b]);
  assert.ok(
    result.get('a'),
    'a should win (starts at the same position, but a is the full-sentence claim registered first)',
  );
  assert.equal(result.has('b'), true, 'loser must still have a map entry');
});

// ─── Overlap tie-break: lower claim.id wins on identical spans ───
test('identical spans resolve by lower claim.id', () => {
  const article = 'The Eiffel Tower was completed in 1889.';
  const a = claim({ id: 'zzz', text: 'The Eiffel Tower was completed in 1889.' });
  const b = claim({ id: 'aaa', text: 'The Eiffel Tower was completed in 1889.' });
  const result = matchClaimSpans(article, [a, b]);
  assert.ok(result.get('aaa'), 'lower id should win');
  assert.equal(result.get('zzz'), null, 'higher id should lose');
});

// ─── Runs over pending claims too (FR-005) ────────────────────────
test('pending (verdict-less) claims are matched the same as done ones', () => {
  const article = 'The Eiffel Tower was completed in 1889.';
  const c = claim({
    id: 'c1',
    text: 'The Eiffel Tower was completed in 1889.',
    status: 'pending',
    verdict: null,
  });
  const result = matchClaimSpans(article, [c]);
  assert.ok(result.get('c1'), 'pending claim should still match');
});

// ─── Every claim gets an entry, matched or not ────────────────────
test('every input claim gets a map entry', () => {
  const article = 'The Eiffel Tower was completed in 1889.';
  const claims = [
    claim({ id: 'c1', text: 'The Eiffel Tower was completed in 1889.' }),
    claim({ id: 'c2', text: 'Completely unrelated text about qubits.' }),
  ];
  const result = matchClaimSpans(article, claims);
  assert.equal(result.size, 2);
  assert.ok(result.get('c1'));
  assert.equal(result.get('c2'), null);
});

// ─── Duplicate content: two identical sentences, one claim ───────
test('a claim matching text that appears twice in the article matches the first occurrence', () => {
  const article = 'The cat sat on the mat. The cat sat on the mat.';
  const c = claim({ id: 'c1', text: 'The cat sat on the mat.' });
  const result = matchClaimSpans(article, [c]);
  const span = result.get('c1');
  assert.ok(span, 'expected a match');
  assert.equal(span!.start, 0, 'indexOf-based exact match always resolves to the first occurrence');
});

// ─── Duplicate content: two claims, identical text, one occurrence ──
test('two claims with identical text both target the same single occurrence; overlap tie-break picks one', () => {
  const article = 'The cat sat on the mat.';
  const a = claim({ id: 'zzz', text: 'The cat sat on the mat.' });
  const b = claim({ id: 'aaa', text: 'The cat sat on the mat.' });
  const result = matchClaimSpans(article, [a, b]);
  assert.ok(result.get('aaa'), 'lower id should win the identical-span collision');
  assert.equal(result.get('zzz'), null, 'higher id should lose, not silently duplicate the highlight');
});

// ─── Duplicate content: claim text is a substring appearing twice ───
test('a claim whose text is a duplicate substring of the article matches the first occurrence', () => {
  const article = 'Paris is the capital of France. Paris has a population of over 2 million.';
  const c = claim({ id: 'c1', text: 'Paris' });
  const result = matchClaimSpans(article, [c]);
  const span = result.get('c1');
  assert.ok(span, 'expected a match');
  assert.equal(span!.start, 0);
  assert.equal(span!.end, 5);
});

console.log(`\n${passed} tests passed`);
