/**
 * Plain assert-based checks for matchClaimSpans — no test framework (frontend has no vitest,
 * plan.md's Testing decision). Run: npx tsx src/lib/matchClaimSpans.test.ts
 *
 * D028 rewrite (2026-08-13): biassemble-core now returns a verified, verbatim source_excerpt per
 * claim — the primary locator. The old clause-splitting/heading-detection cases (each patching a
 * failure mode of guessing a claim's location from its paraphrased text alone) are removed along
 * with the code they tested; the fallback path they used to cover is now a much simpler
 * whole-sentence-only guess, only reached when source_excerpt is null or can't be located.
 */
import assert from 'node:assert/strict';
import { matchClaimSpans, assignHomeSentence, MatchTier } from './matchClaimSpans';
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
    sourceExcerpt: null,
    ...overrides,
  };
}

// ─── Exact tier: a verified source_excerpt locates the claim directly ────
test('a verified source_excerpt matches verbatim and is tagged MatchTier.Exact', () => {
  const article =
    'Researchers using X-ray tomography found that the Antikythera mechanism contained at least 30 bronze gears, some cut with hundreds of triangular teeth.';
  const c = claim({
    id: 'c1',
    text: 'The Antikythera mechanism contained at least 30 bronze gears.',
    sourceExcerpt: 'the Antikythera mechanism contained at least 30 bronze gears',
  });
  const result = matchClaimSpans(article, [c]);
  const span = result.get('c1');
  assert.ok(span, 'expected a match');
  assert.equal(article.slice(span!.start, span!.end), 'the Antikythera mechanism contained at least 30 bronze gears');
  assert.equal(span!.tier, MatchTier.Exact);
});

// ─── Fallback tier: source_excerpt is null (not yet supported by this run, or genuinely absent) ─
test('a claim with no source_excerpt falls back to its containing sentence (MatchTier.Sentence)', () => {
  const article =
    "Nauru, the world's smallest island nation by population, briefly became one of the wealthiest countries per capita in the 1970s due to phosphate mining revenue.";
  const c = claim({
    id: 'c1',
    text: 'Nauru briefly became one of the wealthiest countries per capita in the 1970s due to phosphate mining revenue.',
  });
  const result = matchClaimSpans(article, [c]);
  const span = result.get('c1');
  assert.ok(span, 'expected a sentence-level fallback match');
  assert.equal(article.slice(span!.start, span!.end), article);
  assert.equal(span!.tier, MatchTier.Sentence);
});

// ─── Fallback tier: source_excerpt present but not a real substring (core already nulled the field
// server-side on a miss, but a defensive local check must degrade the same way, not throw/crash) ──
test('a source_excerpt that is not found verbatim falls back instead of throwing', () => {
  const article = 'The Eiffel Tower was completed in 1889.';
  const c = claim({
    id: 'c1',
    text: 'The Eiffel Tower was completed in 1889.',
    sourceExcerpt: 'a paraphrase that never appears verbatim in the article',
  });
  const result = matchClaimSpans(article, [c]);
  const span = result.get('c1');
  assert.ok(span, 'expected a fallback match');
  assert.equal(span!.tier, MatchTier.Sentence);
});

// ─── Review finding: a degenerate (whitespace/punctuation-only) source_excerpt must not trivially
// indexOf-match and win Exact tier — that tier gets no "approximate location" disclaimer. ────────
test('a whitespace-only source_excerpt is rejected, not trivially matched at Exact tier', () => {
  const article = 'The Eiffel Tower was completed in 1889.';
  const c = claim({ id: 'c1', text: 'The Eiffel Tower was completed in 1889.', sourceExcerpt: '   ' });
  const result = matchClaimSpans(article, [c]);
  const span = result.get('c1');
  assert.ok(span, 'expected a fallback match, not null');
  assert.equal(span!.tier, MatchTier.Sentence, 'must not win Exact tier on a degenerate excerpt');
});

// ─── Review finding: splitSentences() alone (independent of the deleted clause-splitter) still
// isolates a short heading as its own sentence, and Jaccard's small-denominator bias can let it
// outscore the real, longer sentence — heading exclusion is still needed in the fallback tier. ───
test('a heading-like line never wins the fallback match over the real containing sentence', () => {
  const article =
    'Early life\nBukowski was born in Andernach, Germany, in 1920, to an American soldier father and a German mother.';
  const c = claim({ id: 'c1', text: "Bukowski's early life began in Germany." });
  const result = matchClaimSpans(article, [c]);
  const span = result.get('c1');
  assert.ok(span, 'expected a fallback match');
  assert.equal(
    article.slice(span!.start, span!.end).includes('Andernach'),
    true,
    'must match the real sentence about Germany, not the "Early life" heading',
  );
});

test('assignHomeSentence never groups a claim under a heading when a real sentence is available', () => {
  const article = 'Early life\nBukowski was born in Andernach, Germany, in 1920.';
  const c = claim({ id: 'c1', text: "Bukowski's early life began in Germany." });
  const result = assignHomeSentence(article, [c]);
  assert.equal(result.get('c1'), 1, 'should group under the real sentence (index 1), not the heading (index 0)');
});

// ─── Behavior change, documented: a compound sentence with no source_excerpt now falls back to the
// WHOLE sentence, not a clause — clause-splitting is deleted along with the guessing it patched. ──
test('without a source_excerpt, a compound sentence falls back to the whole sentence, not a clause', () => {
  const article =
    'He wrote thousands of poems, hundreds of short stories and six novels, eventually publishing over one hundred sixty books during the course of his career.';
  const c = claim({ id: 'c1', text: 'Bukowski wrote six novels.' });
  const result = matchClaimSpans(article, [c]);
  const span = result.get('c1');
  assert.ok(span, 'expected a fallback match');
  assert.equal(article.slice(span!.start, span!.end), article, 'must be the whole sentence, not just "six novels"');
});

// ─── No-threshold last resort: every claim gets a span, even a bad one ─────
test('unrelated claim text still gets a best-effort span, not null', () => {
  const article = 'The Eiffel Tower was completed in 1889.';
  const c = claim({ id: 'c1', text: 'Quantum computers use qubits instead of classical bits.' });
  const result = matchClaimSpans(article, [c]);
  const span = result.get('c1');
  assert.ok(span, 'expected a last-resort fallback span, not null');
  assert.equal(article.slice(span!.start, span!.end), article);
  assert.equal(span!.tier, MatchTier.Sentence);
});

test('with multiple sentences, the fallback still picks the highest-scoring one, not always the first', () => {
  const article = 'The cat sat on the mat. Quantum computers use qubits for calculations.';
  const c = claim({ id: 'c1', text: 'Quantum computers rely on qubits.' });
  const result = matchClaimSpans(article, [c]);
  const span = result.get('c1');
  assert.ok(span, 'expected a span');
  assert.equal(article.slice(span!.start, span!.end), 'Quantum computers use qubits for calculations.');
});

// ─── D028: the normalized secondary path returns real ORIGINAL-text coordinates, not offsets into
// an intermediate normalized copy — a naive normalize-both-sides-then-indexOf would silently shift
// every offset after whatever earlier text the normalization changed. ───────────────────────────
test('the normalized secondary path locates a whitespace-differing excerpt at its real original coordinates', () => {
  const article = 'The Eiffel   Tower\nwas completed in 1889. It is located in Paris.';
  const c = claim({
    id: 'c1',
    text: 'The Eiffel Tower was completed in 1889.',
    // Verbatim per core, but differs from the article's own irregular internal whitespace/newline —
    // a plain indexOf must miss, forcing the normalized path.
    sourceExcerpt: 'The Eiffel Tower was completed in 1889.',
  });
  const result = matchClaimSpans(article, [c]);
  const span = result.get('c1');
  assert.ok(span, 'expected the normalized secondary path to find a match');
  assert.equal(span!.tier, MatchTier.Exact);
  // Reproduces the REAL original text at that location (irregular spacing/newline intact) — not
  // the normalized query string, and not shifted by the normalization applied earlier in the scan.
  assert.equal(article.slice(span!.start, span!.end), 'The Eiffel   Tower\nwas completed in 1889.');
});

// ─── D028: a source_excerpt appearing twice in the article resolves to the first occurrence —
// core doesn't guarantee uniqueness; documented, deterministic indexOf semantics. ─────────────────
test('a source_excerpt appearing twice in the article matches the first occurrence', () => {
  const article = 'The cat sat on the mat. The cat sat on the mat.';
  const c = claim({ id: 'c1', text: 'The cat sat on the mat.', sourceExcerpt: 'The cat sat on the mat.' });
  const result = matchClaimSpans(article, [c]);
  const span = result.get('c1');
  assert.ok(span, 'expected a match');
  assert.equal(span!.start, 0, 'indexOf-based exact match always resolves to the first occurrence');
});

// ─── Overlap: earliest-start wins, loser still keyed (null) ──────
test('overlapping exact-tier spans resolve to the earliest-starting claim; the loser still has an entry (null)', () => {
  const article = 'The Eiffel Tower was completed in 1889 and stands in Paris.';
  const a = claim({
    id: 'a',
    text: 'The Eiffel Tower was completed in 1889 and stands in Paris.',
    sourceExcerpt: 'The Eiffel Tower was completed in 1889 and stands in Paris.',
  });
  const b = claim({
    id: 'b',
    text: 'The Eiffel Tower was completed in 1889.',
    sourceExcerpt: 'The Eiffel Tower was completed in 1889',
  });
  const result = matchClaimSpans(article, [a, b]);
  assert.ok(result.get('a'), 'a should win (starts at the same position, registered first)');
  assert.equal(result.has('b'), true, 'loser must still have a map entry');
});

// ─── Overlap tie-break: lower claim.id wins on identical spans ───
test('identical spans resolve by lower claim.id', () => {
  const article = 'The Eiffel Tower was completed in 1889.';
  const a = claim({ id: 'zzz', text: 'The Eiffel Tower was completed in 1889.', sourceExcerpt: 'The Eiffel Tower was completed in 1889.' });
  const b = claim({ id: 'aaa', text: 'The Eiffel Tower was completed in 1889.', sourceExcerpt: 'The Eiffel Tower was completed in 1889.' });
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
    sourceExcerpt: 'The Eiffel Tower was completed in 1889.',
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
    claim({ id: 'c1', text: 'The Eiffel Tower was completed in 1889.', sourceExcerpt: 'The Eiffel Tower was completed in 1889.' }),
    claim({ id: 'c2', text: 'Completely unrelated text about qubits.' }),
  ];
  const result = matchClaimSpans(article, claims);
  assert.equal(result.size, 2);
  assert.ok(result.get('c1'));
  // The article is one sentence — c1's exact match occupies the whole thing, so c2's fallback (no
  // other sentence to walk to) collides and loses; it still gets a real map entry (null), not a
  // missing key.
  assert.equal(result.get('c2'), null);
});

// ─── Duplicate content: two claims, identical source_excerpt, one occurrence ──
test('two claims with identical source_excerpt both target the same single occurrence; overlap tie-break picks one', () => {
  const article = 'The cat sat on the mat.';
  const a = claim({ id: 'zzz', text: 'The cat sat on the mat.', sourceExcerpt: 'The cat sat on the mat.' });
  const b = claim({ id: 'aaa', text: 'The cat sat on the mat.', sourceExcerpt: 'The cat sat on the mat.' });
  const result = matchClaimSpans(article, [a, b]);
  assert.ok(result.get('aaa'), 'lower id should win the identical-span collision');
  assert.equal(result.get('zzz'), null, 'higher id should lose, not silently duplicate the highlight');
});

// ─── assignHomeSentence: zero-overlap claims must not collapse together ───
test('assignHomeSentence gives two unrelated zero-overlap claims distinct groups, not both sentence 0', () => {
  const article = 'The cat sat on the mat. A dog ran in the park.';
  const a = claim({ id: 'a', text: 'Xyzzy plugh quux.' });
  const b = claim({ id: 'b', text: 'Frobnicate wibble wobble.' });
  const result = assignHomeSentence(article, [a, b]);
  assert.notEqual(result.get('a'), result.get('b'), 'unrelated zero-overlap claims must not share a group');
});

test('assignHomeSentence still groups a real match to its actual sentence index', () => {
  const article = 'The cat sat on the mat. A dog ran in the park.';
  const c = claim({ id: 'c', text: 'A dog ran in the park.' });
  const result = assignHomeSentence(article, [c]);
  assert.equal(result.get('c'), 1);
});

console.log(`\n${passed} tests passed`);
