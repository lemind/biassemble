/**
 * Plain assert-based checks — no test framework (T040). Run: npx tsx src/lib/articleScore.test.ts
 * Covers T049's two guards and the A/B separation the formula exists to produce.
 */
import assert from 'node:assert/strict';
import { articleScore, completenessColor, groundednessColor } from './articleScore';
import type { Claim, ClaimVerdict } from '../types/grounnel';

function claims(spec: Partial<Record<ClaimVerdict | 'no_verdict' | 'pending', number>>): Claim[] {
  const out: Claim[] = [];
  let i = 0;
  const make = (verdict: ClaimVerdict | null, status: Claim['status']): Claim => ({
    id: `c${i++}`, text: 't', status, verdict, evidence: null, confidence: null,
    reason: null, sources: [], citations: [], sourceExcerpt: null,
  });
  for (const [key, n] of Object.entries(spec)) {
    for (let k = 0; k < (n ?? 0); k++) {
      if (key === 'no_verdict') out.push(make(null, 'failed'));
      else if (key === 'pending') out.push(make(null, 'pending'));
      else out.push(make(key as ClaimVerdict, 'done'));
    }
  }
  return out;
}

// The acceptance criterion: an article with 10 refuted claims must not read like one with 10
// merely unverified claims. A plain supported/checked ratio scores both 50.
const a = articleScore(claims({ supported: 18, unsupported: 2 }));
assert.equal(a.groundedness, 90);
assert.equal(a.completeness, 100);

const b = articleScore(claims({ supported: 10, contradicted: 10 }));
assert.equal(b.groundedness, 25);
assert.equal(b.completeness, 100);
assert.ok(a.groundedness! - b.groundedness! > 60, 'A and B must not be close');

// C — mostly opinion. Groundedness fine, completeness must fall.
const c = articleScore(claims({ supported: 4, unsupported: 2, excluded: 14 }));
assert.equal(c.groundedness, 67);
assert.equal(c.completeness, 65);

// A flawless run scores 100 completeness at ANY size — a sample-size term used to live in this
// number and capped a perfect 5-claim article at 85, penalising short articles twice.
assert.equal(articleScore(claims({ supported: 5 })).completeness, 100);
assert.equal(articleScore(claims({ supported: 20 })).completeness, 100);

// Colour must follow WHY the score is low. These two share a groundedness of 25.
const thinArticle = articleScore(claims({ supported: 5, unsupported: 15 }));
const refutedArticle = articleScore(claims({ supported: 10, contradicted: 10 }));
assert.equal(thinArticle.groundedness, refutedArticle.groundedness);
assert.equal(groundednessColor(thinArticle.groundedness!, thinArticle.counts), 'text-info');
assert.equal(groundednessColor(refutedArticle.groundedness!, refutedArticle.counts), 'text-error');

// Completeness is never red — a partly assessed article is not a wrong one.
for (const n of [0, 20, 50, 64, 65, 84, 85, 100]) {
  assert.notEqual(completenessColor(n), 'text-error');
}

// Guard 1 — below five checked claims one verdict moves the score 20+ points.
const few = articleScore(claims({ supported: 3, unsupported: 1 }));
assert.equal(few.groundedness, null);
assert.equal(few.suppressed, 'too-few');

// Guard 2 — nothing decisive. The formula would return 0, which reads as "refuted" for an
// article whose sources were merely unfindable.
const nothing = articleScore(claims({ unsupported: 20 }));
assert.equal(nothing.groundedness, null);
assert.equal(nothing.suppressed, 'no-direction');
assert.equal(nothing.completeness, 100);

// Partial support alone is not a direction (prose of the 2026-09-10 review; its code sample
// disagreed with its own reasoning and would have scored this 50).
const partialOnly = articleScore(claims({ partially_supported: 10 }));
assert.equal(partialOnly.groundedness, null);
assert.equal(partialOnly.suppressed, 'no-direction');

// All refuted still scores — it has a direction, and it is 0.
const refuted = articleScore(claims({ contradicted: 20 }));
assert.equal(refuted.groundedness, 0);

// Our own failures never lower groundedness, only completeness.
const failed = articleScore(claims({ supported: 18, unsupported: 2, no_verdict: 5 }));
assert.equal(failed.groundedness, 90, 'engine failures must not change the article score');
assert.ok(failed.completeness < 100, 'engine failures must lower completeness');

// A claim left pending on a finished run resolved no more than a failed one.
assert.equal(articleScore(claims({ supported: 18, unsupported: 2, pending: 5 })).completeness,
             failed.completeness);

// Degenerate inputs must not divide by zero.
assert.equal(articleScore([]).completeness, null);
assert.equal(articleScore(claims({ excluded: 9 })).completeness, null);
assert.equal(articleScore([]).groundedness, null);

// An opinion piece is not 0% assessed — it has nothing to assess. Suppressed, never scored 0.
const opinionOnly = articleScore(claims({ excluded: 12 }));
assert.equal(opinionOnly.completeness, null);
assert.equal(opinionOnly.completenessSuppressed, 'nothing-checkable');
assert.equal(articleScore([]).completenessSuppressed, 'nothing-checkable');

// Extraction hit the claim cap: an unknown number were never extracted, so no fraction is honest.
const capped = articleScore(claims({ supported: 100 }), true);
assert.equal(capped.completeness, null);
assert.equal(capped.completenessSuppressed, 'capped');
assert.equal(capped.groundedness, 100, 'the cap says nothing about the claims we DID check');

// One contradiction in five must not force the red ring — 1/5 is exactly the threshold.
const oneOfFive = articleScore(claims({ supported: 4, contradicted: 1 }));
assert.equal(oneOfFive.groundedness, 64);
assert.equal(groundednessColor(oneOfFive.groundedness!, oneOfFive.counts), 'text-warning');
const twoOfFive = articleScore(claims({ supported: 3, contradicted: 2 }));
assert.equal(groundednessColor(twoOfFive.groundedness!, twoOfFive.counts), 'text-error');

// A verdict this build has never heard of must not vanish from the denominators.
const unknown = claims({ supported: 6 });
unknown.push({ ...unknown[0], id: 'x', verdict: 'mixed' as never });
assert.equal(articleScore(unknown).counts.checked, 6);
assert.equal(articleScore(unknown).counts.noVerdict, 1, 'unknown verdict falls back to noVerdict');

// A shared assessment whose claim rows are SHORT must not score higher than the run it came from.
// Postgres writes are best-effort: a dropped row vanishes from the denominator rather than
// lowering the score, so the forwarded link would always be the flattering one.
const fullRun = articleScore(claims({ supported: 16, excluded: 4 }));
const droppedRows = claims({ supported: 16 }); // the 4 excluded inserts failed
assert.equal(articleScore(droppedRows).completeness, 100, 'without the snapshot it reads higher');
const authoritative = {
  supported: 16, partiallySupported: 0, unsupported: 0, unverifiable: 0,
  contradicted: 0, excluded: 4, noVerdict: 0,
};
const shared = articleScore(droppedRows, false, authoritative);
assert.equal(shared.completeness, fullRun.completeness, 'snapshot restores the true denominator');
assert.equal(shared.groundedness, fullRun.groundedness);
assert.equal(shared.counts.excluded, 4);

// Blue means "nothing refuted". A low score WITH a contradiction is mixed, not thin.
const lowWithContra = articleScore(claims({
  supported: 2, partially_supported: 1, unsupported: 1, contradicted: 1,
}));
assert.equal(lowWithContra.groundedness, 40);
assert.equal(groundednessColor(40, lowWithContra.counts), 'text-warning');
assert.equal(groundednessColor(40, articleScore(claims({ supported: 2, unsupported: 8 })).counts),
             'text-info', 'no contradictions at the same score stays blue');

console.log('articleScore.test.ts: all assertions passed');
