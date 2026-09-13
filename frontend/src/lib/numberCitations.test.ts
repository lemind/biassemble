// Plain assert-based checks — no test framework. Run: npx tsx src/lib/numberCitations.test.ts
// The invariant that was missing: every number in the References list is also reachable from an
// inline marker in the article body, and vice versa. Its absence shipped an orphaned [2].
import assert from 'node:assert/strict';
import { numberCitations, numberSources } from './numberCitations';
import { isStyledClaim } from './verdictStyle';
import type { Claim, ClaimCitation, ClaimSource, ClaimVerdict, ClaimStatus } from '../types/grounnel';

const cite = (url: string, text: string): ClaimCitation => ({ source: 'web', sentence: 0, url, text });
const web = (url: string): ClaimSource => ({
  kind: 'web',
  title: 'Example',
  domain: new URL(url).hostname,
  url,
  status: 'ok',
});

function claim(over: Partial<Claim> & { id: string; text: string }): Claim {
  return {
    status: 'done' as ClaimStatus,
    verdict: 'supported' as ClaimVerdict,
    evidence: 'e',
    confidence: 0.9,
    reason: 'r',
    sources: [],
    citations: [],
    sourceExcerpt: over.text,
    ...over,
  };
}

// One sentence, deliberately: matchClaimSpans walks a losing claim down to the next-best free
// sentence, so an overlap is only forced — and a span only nulled — when there is nowhere else.
const article = 'The concept was borrowed from a literal depiction.';

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

test('a claim with no locatable span contributes no reference', () => {
  const claims = [
    claim({
      id: 'a',
      text: 'The concept was borrowed from a literal depiction.',
      citations: [cite('https://ivypanda.com/x', 'The concept was borrowed from a literal depiction.')],
    }),
    // Loses the only sentence to 'a' and is discarded (matchClaimSpans' overlap rule), so
    // HighlightedArticle draws no <mark> for it — yet its citation still took [2] before the fix.
    claim({
      id: 'orphan',
      text: 'The concept was borrowed from a depiction, literally.',
      sourceExcerpt: null,
      citations: [cite('https://pmc.ncbi.nlm.nih.gov/y', 'A left-cheek bias in non-artists.')],
    }),
  ];
  const { references, claimNumbers } = numberCitations(article, claims);
  assert.equal(references.length, 1, 'only the claim the reader can see is numbered');
  assert.equal(references[0]!.url, 'https://ivypanda.com/x');
  assert.deepEqual(claimNumbers.get('orphan'), undefined);
});

test('every reference number is reachable from some inline marker', () => {
  const claims = [
    claim({
      id: 'a',
      text: 'The concept was borrowed from a literal depiction.',
      citations: [cite('https://ivypanda.com/x', 'q')],
    }),
    claim({
      id: 'orphan',
      text: 'The concept was borrowed from a depiction, literally.',
      sourceExcerpt: null,
      citations: [cite('https://pmc.ncbi.nlm.nih.gov/z', 'q')],
    }),
  ];
  const { references, claimNumbers } = numberCitations(article, claims);
  const inline = new Set([...claimNumbers.values()].flat());
  assert.deepEqual(
    references.map((r) => r.number).filter((n) => !inline.has(n)),
    [],
    'no reference without an inline marker'
  );
  assert.deepEqual(
    [...inline].filter((n) => !references.some((r) => r.number === n)),
    [],
    'no inline marker without a reference'
  );
});

test('an excluded claim is neither marked nor numbered', () => {
  assert.equal(isStyledClaim({ verdict: 'excluded', status: 'done' }), false);
  const claims = [
    claim({
      id: 'x',
      text: 'The concept was borrowed from a literal depiction.',
      verdict: 'excluded',
      citations: [cite('https://ivypanda.com/x', 'q')],
    }),
  ];
  assert.equal(numberCitations(article, claims).references.length, 0);
});

test('a pending or failed claim is still marked, so it may carry a number', () => {
  assert.equal(isStyledClaim({ verdict: null, status: 'pending' }), true);
  assert.equal(isStyledClaim({ verdict: null, status: 'failed' }), true);
  assert.equal(isStyledClaim({ verdict: null, status: 'done' }), false);
});

test('numberSources applies the same visibility rule', () => {
  const claims = [
    claim({
      id: 'a',
      text: 'The concept was borrowed from a literal depiction.',
      sources: [web('https://ivypanda.com/x')],
    }),
    claim({
      id: 'orphan',
      text: 'The concept was borrowed from a depiction, literally.',
      sourceExcerpt: null,
      sources: [web('https://pmc.ncbi.nlm.nih.gov/z')],
    }),
  ];
  const refs = numberSources(article, claims);
  assert.equal(refs.length, 1);
  assert.equal(refs[0]!.url, 'https://ivypanda.com/x');
});

console.log(`\n${passed} tests passed`);
