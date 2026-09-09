/**
 * T044 — static per-route heads. Scrapers and previews don't run JS, so App's runtime metadata is
 * invisible to them; these shells put the right tags in the served HTML. Grounnel-branded only:
 * one static file cannot serve two hostnames, and the Biassemble host is covered at runtime.
 *
 * Run: npx tsx scripts/gen-seo-shells.ts   (wired into `npm run build`, after vite build)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { getBrand } from '../src/lib/brand';
import { pageMeta } from '../src/lib/seo';
import type { PageId } from '../src/lib/routes';

const DIST = new URL('../dist/', import.meta.url);
const SHELLS: Array<{ file: string; page: PageId }> = [
  { file: 'about.html', page: 'about' },
  { file: 'stats.html', page: 'stats' },
];

// Replaces the CONTENT of an existing tag; never inserts. index.html is the single source of which
// tags exist, so a tag added there is picked up here and one removed can't silently linger.
function replaceAttr(html: string, match: RegExp, value: string): string {
  if (!match.test(html)) throw new Error(`gen-seo-shells: no tag matched ${match} — index.html changed?`);
  return html.replace(match, (tag) => tag.replace(/content="[^"]*"|href="[^"]*"/, (attr) =>
    attr.startsWith('href') ? `href="${value}"` : `content="${value}"`));
}

const brand = getBrand('grounnel');
const template = readFileSync(new URL('index.html', DIST), 'utf8');

for (const { file, page } of SHELLS) {
  const meta = pageMeta(brand, page);
  const url = `${brand.origin}${meta.canonicalPath ?? '/'}`;
  let html = template;

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`);
  html = replaceAttr(html, /<meta\s+name="description"[^>]*>/, meta.description);
  html = replaceAttr(html, /<link\s+rel="canonical"[^>]*>/, url);
  html = replaceAttr(html, /<meta\s+property="og:title"[^>]*>/, meta.title);
  html = replaceAttr(html, /<meta\s+property="og:description"[^>]*>/, meta.description);
  html = replaceAttr(html, /<meta\s+property="og:url"[^>]*>/, url);
  html = replaceAttr(html, /<meta\s+name="twitter:title"[^>]*>/, meta.title);
  html = replaceAttr(html, /<meta\s+name="twitter:description"[^>]*>/, meta.description);

  writeFileSync(new URL(file, DIST), html);
  console.log(`gen-seo-shells: dist/${file} — ${meta.title}`);
}
