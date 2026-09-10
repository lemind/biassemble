// Plain assert-based checks — no test framework. Run: npx tsx src/lib/stats.test.ts
// A verdict core emits that isn't in the fixed row list would vanish and leave the bar short.
import assert from 'node:assert/strict';
import stats from '../data/stats';
import { VERDICT_ROWS, INDEFINITE_VERDICTS } from './verdictRows';

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

test('every verdict in the snapshot has a row on the page', () => {
  const rows = new Set(VERDICT_ROWS.map((r) => r.key));
  for (const v of stats.verdicts) {
    assert.ok(rows.has(v.verdict), `no row for "${v.verdict}" — it would vanish from the table`);
  }
});

test('the rows account for every claim, so the bar totals 100%', () => {
  const counted = VERDICT_ROWS.reduce(
    (sum, r) => sum + (stats.verdicts.find((v) => v.verdict === r.key)?.n ?? 0),
    0,
  );
  assert.equal(counted, stats.totalClaims);
});

// The principle paragraph rests on this number, so assert the invariant, not the literal — the
// snapshot is regenerated and a pinned count would break on a legitimate refresh.
test('the no-definitive-verdict count never absorbs failed verifications', () => {
  const n = (k: string) => stats.verdicts.find((v) => v.verdict === k)?.n ?? 0;
  assert.ok(!INDEFINITE_VERDICTS.includes('no_verdict'), 'a failed verification is not a judgement');
  const indefinite = INDEFINITE_VERDICTS.reduce((sum, k) => sum + n(k), 0);
  assert.ok(n('no_verdict') > 0, 'fixture has no failed verifications left to keep separate');
  assert.ok(indefinite > 0 && indefinite < stats.totalClaims);
});

console.log(`\n${passed} tests passed`);
