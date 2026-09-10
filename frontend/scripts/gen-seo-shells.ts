// T044 — static per-route heads, because scrapers and previews don't run JS.
// Run: npx tsx scripts/gen-seo-shells.ts   (wired into `npm run build`, after vite build)
import { readFileSync, writeFileSync } from 'node:fs';
import { getBrand, type BrandId } from '../src/lib/brand';
import { pageMeta } from '../src/lib/seo';
import type { PageId } from '../src/lib/routes';

const DIST = new URL('../dist/', import.meta.url);

// `404.html` is what Vercel serves, with a real 404 status, for a path no rewrite matches.
const SHELLS: Array<{ file: string; page: PageId; brand: BrandId }> = [
  { file: 'about.html', page: 'about', brand: 'grounnel' },
  { file: 'about-biassemble.html', page: 'about', brand: 'biassemble' },
  { file: 'stats.html', page: 'stats', brand: 'grounnel' },
  { file: '404.html', page: 'not-found', brand: 'grounnel' },
];

/** Values land inside double-quoted attributes, so a quote or angle bracket would break the tag. */
function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Replaces the CONTENT of an existing tag; never inserts. index.html stays the single source of
// which tags exist, so one added there is picked up and one removed cannot silently linger.
function replaceAttr(html: string, match: RegExp, value: string): string {
  if (!match.test(html)) throw new Error(`gen-seo-shells: no tag matched ${match} — index.html changed?`);
  const escaped = escapeAttr(value);
  return html.replace(match, (tag) =>
    tag.replace(/content="[^"]*"|href="[^"]*"/, (attr) =>
      attr.startsWith('href') ? `href="${escaped}"` : `content="${escaped}"`
    )
  );
}

function removeTag(html: string, match: RegExp): string {
  return html.replace(match, '');
}

const template = readFileSync(new URL('index.html', DIST), 'utf8');

for (const { file, page, brand: brandId } of SHELLS) {
  const brand = getBrand(brandId);
  const meta = pageMeta(brand, page);
  let html = template;

  html = html.replace(/<title>[^<]*<\/title>/, () => `<title>${meta.title}</title>`);
  html = replaceAttr(html, /<meta\s+name="description"[^>]*>/, meta.description);
  html = replaceAttr(html, /<meta\s+property="og:site_name"[^>]*>/, brand.name);
  html = replaceAttr(html, /<meta\s+property="og:title"[^>]*>/, meta.title);
  html = replaceAttr(html, /<meta\s+property="og:description"[^>]*>/, meta.description);
  html = replaceAttr(html, /<meta\s+property="og:image:alt"[^>]*>/, meta.title);
  html = replaceAttr(html, /<meta\s+name="twitter:title"[^>]*>/, meta.title);
  html = replaceAttr(html, /<meta\s+name="twitter:description"[^>]*>/, meta.description);

  if (meta.canonical === null) {
    html = removeTag(html, /\s*<link\s+rel="canonical"[^>]*>/);
    html = html.replace(/<\/title>/, '</title>\n    <meta name="robots" content="noindex, nofollow" />');
  } else {
    html = replaceAttr(html, /<link\s+rel="canonical"[^>]*>/, meta.canonical);
    html = replaceAttr(html, /<meta\s+property="og:url"[^>]*>/, meta.canonical);
  }

  writeFileSync(new URL(file, DIST), html);
  console.log(`gen-seo-shells: dist/${file} — ${meta.title}${meta.noindex ? ' [noindex]' : ''}`);
}
