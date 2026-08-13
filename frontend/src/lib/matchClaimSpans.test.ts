/**
 * Plain assert-based checks for matchClaimSpans — no test framework (frontend has no vitest,
 * plan.md's Testing decision). Run: npx tsx src/lib/matchClaimSpans.test.ts
 *
 * Cases drawn from the real observed sample (plan.md's Design Decisions) plus overlap/no-match
 * cases. Expanded further in specs/002-grounnel-frontend/tasks.md T017 (Phase 5) with duplicate-
 * content cases.
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

// ─── Clause-level fallback: compound sentence bundling multiple facts ─────
// Real observed case (2026-08-12): a 13-claim extraction over a real Bukowski bio paragraph
// matched only 3/13 before this fallback existed — EXTRACT correctly split one compound sentence
// into several atomic claims, but each one scored below JACCARD_THRESHOLD against the *whole*
// sentence (diluted by its siblings' tokens). Verified against the real matcher: 9/13 after.
test('a claim for one fact in a compound sentence matches its own clause, not the whole sentence', () => {
  const article =
    'He wrote thousands of poems, hundreds of short stories and six novels, eventually publishing over one hundred sixty books during the course of his career.';
  const c = claim({ id: 'c1', text: 'Bukowski wrote six novels.' });
  const result = matchClaimSpans(article, [c]);
  const span = result.get('c1');
  assert.ok(span, 'expected a clause-level match');
  assert.equal(article.slice(span!.start, span!.end), 'six novels');
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

// ─── No-threshold last resort: every claim gets a span, even a bad one ─────
// Changed 2026-08-12 — every claim used to fall through to `null` (unmatched, not shown in the
// article body) once nothing cleared JACCARD_THRESHOLD. User-requested tradeoff: every claim now
// gets SOME location rather than silently vanishing from the highlighted text; a poor match beats
// no visible location at all. Falls back to whichever sentence scores highest, even at score 0.
test('unrelated claim text still gets a best-effort span, not null', () => {
  const article = 'The Eiffel Tower was completed in 1889.';
  const c = claim({ id: 'c1', text: 'Quantum computers use qubits instead of classical bits.' });
  const result = matchClaimSpans(article, [c]);
  const span = result.get('c1');
  assert.ok(span, 'expected a last-resort fallback span, not null');
  assert.equal(article.slice(span!.start, span!.end), article);
});

test('with multiple sentences, the last-resort fallback still picks the highest-scoring one, not always the first', () => {
  const article = 'The cat sat on the mat. Quantum computers use qubits for calculations.';
  const c = claim({ id: 'c1', text: 'Quantum computers rely on qubits.' });
  const result = matchClaimSpans(article, [c]);
  const span = result.get('c1');
  assert.ok(span, 'expected a span');
  assert.equal(article.slice(span!.start, span!.end), 'Quantum computers use qubits for calculations.');
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

// ─── Date-comma fix must not over-merge non-date clauses ───
// Code-review finding, 2026-08-12: the first version of the date-comma fix keyed off the
// lookahead alone (any comma before a bare 4-digit number), which wrongly suppressed splitting
// for ordinary lists too, not just dates — the day-number lookbehind narrows it back down.
test('a comma before a 4-digit count that is not a year still splits into its own clause', () => {
  const article = 'He owns three cars, 1500 books, several bicycles, and a boat.';
  const c = claim({ id: 'c1', text: 'He owns 1500 books.' });
  const result = matchClaimSpans(article, [c]);
  const span = result.get('c1');
  assert.ok(span, 'expected a clause-level match');
  assert.equal(article.slice(span!.start, span!.end), '1500 books');
});

// ─── A section heading must never win a highlight, not even as a last-resort fallback ───
// Real observed bug, 2026-08-13: a plain-text heading with no ending punctuation ("Family and
// early years") merged into the next real sentence, and the clause-splitter's own "and" boundary
// isolated the heading's first word ("Family") as a nonsense 1-word candidate — which then won a
// fallback match for a claim ("Katharina died in 1956.") having nothing to do with it.
test('a heading-like line never wins a match, even for a claim with no good sentence match', () => {
  const article =
    'Family and early years\nKatharina died in 1956, having outlived her son by several decades.';
  const c = claim({ id: 'c1', text: 'Katharina died in 1956.' });
  const result = matchClaimSpans(article, [c]);
  const span = result.get('c1');
  assert.ok(span, 'expected a match');
  assert.equal(
    article.slice(span!.start, span!.end).includes('Family'),
    false,
    'the heading must never be part of (or the entirety of) the matched span',
  );
});

// ─── A degenerate 1-content-word clause must never win, heading or not ───
// Real observed bug, 2026-08-13, found in a live run AFTER the newline-based heading fix above:
// the real article's heading ran straight into the next sentence with NO newline at all
// ("Family and early years Bukowski's birthplace...") — isHeadingLike never saw the heading in
// isolation, so the fix above didn't help. splitClauses' "and" boundary still carved "Family" out
// as its own clause, which still won a fallback match. This is the deeper, newline-independent
// fix: a clause with fewer than 2 real content words is never a match candidate, regardless of
// whether a newline ever separated it from a heading.
test('a bare-word clause carved out of a heading merged with body text never wins a match', () => {
  const article =
    "Family and early years Bukowski's birthplace as noted was Andernach. His father was a sergeant in the United States Army.";
  const c = claim({ id: 'c1', text: "Bukowski's father was a sergeant in the United States Army." });
  const result = matchClaimSpans(article, [c]);
  const span = result.get('c1');
  assert.ok(span, 'expected a match');
  assert.equal(
    article.slice(span!.start, span!.end),
    'His father was a sergeant in the United States Army.',
    'must match the real sentence, not the bare word "Family"',
  );
});

// ─── Heading exclusion must never crash the fallback tier when NOTHING else is available ───
// Code-review finding, 2026-08-13 (CONFIRMED via live repro): an article whose every sentence is
// heading-like emptied both candidate lists, and the fallback tier's `ranked[0]!` on an empty
// array threw `Cannot read properties of undefined (reading 'start')` from the overlap-sort
// comparator the moment a second claim needed the same fallback path.
test('a heading-only article still produces real, non-crashing spans for every claim', () => {
  const article = 'Early life';
  const a = claim({ id: 'a', text: 'Something totally unrelated one.' });
  const b = claim({ id: 'b', text: 'Something totally unrelated two.' });
  const result = matchClaimSpans(article, [a, b]);
  const spanA = result.get('a');
  assert.ok(spanA, 'the winning claim should still get a real span');
  assert.equal(article.slice(spanA!.start, spanA!.end), 'Early life');
  assert.equal(result.has('b'), true, 'the overlap loser must still have a map entry (null)');
});

// ─── Tier is exposed on the returned span, so a renderer can flag low-confidence guesses ───
// Added 2026-08-12 alongside HighlightedArticle's fallback-tier dotted-underline treatment — the
// tier has to survive onto the span the caller actually receives, not just live inside this
// module's internal TieredSpan bookkeeping.
test('exact match is tagged with MatchTier.Exact', () => {
  const article = 'The Eiffel Tower was completed in 1889.';
  const c = claim({ id: 'c1', text: 'The Eiffel Tower was completed in 1889.' });
  const result = matchClaimSpans(article, [c]);
  assert.equal(result.get('c1')!.tier, MatchTier.Exact);
});

test('last-resort fallback match is tagged with MatchTier.Fallback', () => {
  const article = 'The Eiffel Tower was completed in 1889.';
  const c = claim({ id: 'c1', text: 'Quantum computers use qubits instead of classical bits.' });
  const result = matchClaimSpans(article, [c]);
  assert.equal(result.get('c1')!.tier, MatchTier.Fallback);
});

// ─── assignHomeSentence: zero-overlap claims must not collapse together ───
// Code-review finding: the original implementation defaulted to sentence index 0 whenever a
// claim shared zero tokens with every sentence, silently bucketing unrelated zero-overlap claims
// into the same progress-dot group as if they belonged to the article's first sentence.
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

// ─── assignHomeSentence must never prefer a heading over a real sentence ───
// Code-review finding, 2026-08-13: matchClaimSpans excludes headings from ever winning a
// highlight, but assignHomeSentence (used only for progress-dot grouping) shared the same
// splitSentences() output with no such filter — a claim could get grouped under a heading
// index that the article body would never actually highlight it against.
test('assignHomeSentence never groups a claim under a heading when a real sentence is available', () => {
  const article = 'Family and early years\nKatharina died in 1956, having outlived her son by decades.';
  const c = claim({ id: 'c1', text: 'Katharina died in 1956.' });
  const result = assignHomeSentence(article, [c]);
  assert.equal(result.get('c1'), 1, 'should group under the real sentence (index 1), not the heading (index 0)');
});

// ─── isHeadingLike must count CONTENT words, agreeing with this file's own tokenize() ───
// Code-review finding, 2026-08-13: a raw whitespace split disagreed with tokenize()'s stopword-
// aware definition of "word" used everywhere else in this file — a stopword-heavy title read as
// too long to be heading-like by the raw count, even though its real content-word count was short.
test('a stopword-heavy heading is still recognized as heading-like by content-word count', () => {
  const article = 'The Rise And Fall Of The Empire\nBukowski wrote hundreds of short stories.';
  const c = claim({ id: 'c1', text: 'Bukowski wrote hundreds of short stories.' });
  const result = matchClaimSpans(article, [c]);
  const span = result.get('c1');
  assert.ok(span, 'expected a match');
  assert.equal(
    article.slice(span!.start, span!.end).includes('Rise'),
    false,
    'the 7-raw-word/3-content-word heading must still be excluded from matching',
  );
});

console.log(`\n${passed} tests passed`);
