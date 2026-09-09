/**
 * Plain assert-based checks — no test framework (frontend has no vitest, plan.md's Testing
 * decision). Run: npx tsx src/lib/brand.test.ts
 */
import assert from 'node:assert/strict';
import { classifyHost, brandForHost, siblingBrand } from './brand';

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

test('known Grounnel host resolves to Grounnel', () => {
  assert.equal(classifyHost('grounnel.vercel.app'), 'grounnel');
  assert.equal(brandForHost('grounnel.vercel.app').id, 'grounnel');
});

test('known Biassemble host resolves to Biassemble', () => {
  assert.equal(classifyHost('frontend-topaz-eight-10.vercel.app'), 'biassemble');
  assert.equal(brandForHost('frontend-topaz-eight-10.vercel.app').id, 'biassemble');
});

// The explicit list must beat the .vercel.app suffix, or the Grounnel host reads as a preview
// deploy and the production domain silently renders Biassemble.
test('the explicit Grounnel host is not swallowed by the .vercel.app preview rule', () => {
  assert.notEqual(classifyHost('grounnel.vercel.app'), 'development');
  assert.equal(classifyHost('frontend-git-branch-x.vercel.app'), 'development');
});

test('localhost is development, not unknown', () => {
  assert.equal(classifyHost('localhost'), 'development');
  assert.equal(classifyHost('127.0.0.1'), 'development');
});

test('a production-looking unrecognised host is unknown and still renders Biassemble', () => {
  assert.equal(classifyHost('grounnell.com'), 'unknown');
  assert.equal(brandForHost('grounnell.com').id, 'biassemble');
});

test('host matching is case-insensitive', () => {
  assert.equal(classifyHost('Grounnel.Vercel.App'), 'grounnel');
});

test('brand carries identity only — no component reference', () => {
  const keys = Object.keys(brandForHost('grounnel.vercel.app')).sort();
  assert.deepEqual(keys, ['id', 'logo', 'logoHeightClass', 'logoIncludesName', 'name', 'nav', 'origin', 'tagline']);
});

// The footer links to the sibling by origin so no hostname is written outside the lists above.
test('siblingBrand points each brand at the other, by its canonical origin', () => {
  const grounnel = brandForHost('grounnel.vercel.app');
  const sibling = siblingBrand(grounnel);
  assert.equal(sibling.id, 'biassemble');
  assert.equal(sibling.origin, 'https://frontend-topaz-eight-10.vercel.app');
  assert.equal(siblingBrand(sibling).id, 'grounnel');
});

console.log(`\n${passed} tests passed`);
