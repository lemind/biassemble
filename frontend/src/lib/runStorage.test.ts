/**
 * Plain assert-based checks — no test framework. Run: npx tsx src/lib/runStorage.test.ts
 * localStorage is stubbed; Node has none by default.
 */
import assert from 'node:assert/strict';

let store: Record<string, string> = {};
let throwOnAccess = false;
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => {
    if (throwOnAccess) throw new Error('blocked');
    return store[k] ?? null;
  },
  setItem: (k: string, v: string) => {
    if (throwOnAccess) throw new Error('blocked');
    store[k] = v;
  },
  removeItem: (k: string) => {
    delete store[k];
  },
};

const { loadRun, saveRun, clearRun } = await import('./runStorage');

let passed = 0;

function test(name: string, fn: () => void) {
  store = {};
  throwOnAccess = false;
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.error(`  ✗ ${name}`);
    throw error;
  }
}

test('a saved run round-trips, link included', () => {
  saveRun('run-1', 'tok-1', 'some article');
  const loaded = loadRun();
  assert.equal(loaded?.runId, 'run-1');
  assert.equal(loaded?.shareToken, 'tok-1');
  assert.equal(loaded?.articleText, 'some article');
});

// A run stored before share tokens existed must still restore — it just has no link to offer.
test('a run stored without a share token still restores', () => {
  const now = Date.now();
  store['grounnel.run'] = JSON.stringify({ runId: 'r', articleText: 'x', savedAt: now });
  assert.equal(loadRun()?.runId, 'r');
  assert.equal(loadRun()?.shareToken, null);
});

test('nothing stored means no run, not a crash', () => {
  assert.equal(loadRun(), null);
});

// Core drops a run's status from Redis after 7 days, so an older id can only ever 404.
test('a run older than the 7-day status window is dropped', () => {
  const eightDays = Date.now() - 8 * 24 * 60 * 60 * 1000;
  store['grounnel.run'] = JSON.stringify({ runId: 'old', articleText: 'x', savedAt: eightDays });
  assert.equal(loadRun(), null);
});

test('a run inside the window survives', () => {
  const sixDays = Date.now() - 6 * 24 * 60 * 60 * 1000;
  store['grounnel.run'] = JSON.stringify({ runId: 'ok', articleText: 'x', savedAt: sixDays });
  assert.equal(loadRun()?.runId, 'ok');
});

test('corrupt or half-written entries are ignored', () => {
  store['grounnel.run'] = 'not json';
  assert.equal(loadRun(), null);
  store['grounnel.run'] = JSON.stringify({ runId: 'r' });
  assert.equal(loadRun(), null);
  store['grounnel.run'] = JSON.stringify({ runId: 'r', articleText: 'x' });
  assert.equal(loadRun(), null, 'a missing timestamp must not read as age zero');
});

// Persistence is a convenience; a browser that blocks storage must not break the run.
test('a throwing storage never propagates', () => {
  throwOnAccess = true;
  assert.equal(loadRun(), null);
  saveRun('r', 't', 'x');
  clearRun();
});

console.log(`\n${passed} tests passed`);
