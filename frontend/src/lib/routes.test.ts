/**
 * Plain assert-based checks — no test framework. Run: npx tsx src/lib/routes.test.ts
 * Covers the host x path matrix from tasks.md T004, which is this phase's checkpoint.
 */
import assert from 'node:assert/strict';
import { resolveRoute } from './routes';

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

test('root renders the tool on Grounnel and the reflection flow on Biassemble', () => {
  assert.equal(resolveRoute('/', 'grounnel').page, 'tool');
  assert.equal(resolveRoute('/', 'biassemble').page, 'reflection');
});

// FR-002/SC-002: /grounnel links already exist in the wild and must keep working.
test('/grounnel stays the tool on the Biassemble host, with no redirect', () => {
  const route = resolveRoute('/grounnel', 'biassemble');
  assert.equal(route.page, 'tool');
  assert.equal(route.redirectTo, undefined);
});

test('/grounnel on the Grounnel host is the tool and normalises to /', () => {
  const route = resolveRoute('/grounnel', 'grounnel');
  assert.equal(route.page, 'tool');
  assert.equal(route.redirectTo, '/');
});

test('/about and /stats resolve identically on both hosts', () => {
  for (const brand of ['grounnel', 'biassemble'] as const) {
    assert.equal(resolveRoute('/about', brand).page, 'about');
    assert.equal(resolveRoute('/stats', brand).page, 'stats');
  }
});

test('/check/:token carries the token through', () => {
  const route = resolveRoute('/check/aB3-_xY', 'grounnel');
  assert.equal(route.page, 'check');
  assert.equal(route.token, 'aB3-_xY');
});

// Tokens are base64url and case-sensitive; folding the path would hand core a different token.
test('token case is preserved even though fixed paths match case-insensitively', () => {
  assert.equal(resolveRoute('/check/AbCdEf', 'grounnel').token, 'AbCdEf');
  assert.equal(resolveRoute('/About', 'grounnel').page, 'about');
});

test('a bare /check or a nested path under it is not a token', () => {
  assert.equal(resolveRoute('/check/', 'grounnel').page, 'not-found');
  assert.equal(resolveRoute('/check/abc/def', 'grounnel').page, 'not-found');
});

test('trailing slashes do not change resolution', () => {
  assert.equal(resolveRoute('/about/', 'grounnel').page, 'about');
  assert.equal(resolveRoute('/grounnel/', 'biassemble').page, 'tool');
});

test('anything else is not-found on both hosts', () => {
  assert.equal(resolveRoute('/nope', 'grounnel').page, 'not-found');
  assert.equal(resolveRoute('/nope', 'biassemble').page, 'not-found');
});

console.log(`\n${passed} tests passed`);
