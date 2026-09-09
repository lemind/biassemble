// One source of head metadata for every route x brand pair. Until this existed, index.html's
// static head (Grounnel's homepage) was served on every URL of both domains.
import type { Brand } from './brand';
import type { PageId } from './routes';

export interface PageMeta {
  title: string;
  description: string;
  /** Path on this brand's own origin, or null to emit no canonical at all. */
  canonicalPath: string | null;
  /** True for pages that must never be indexed; also suppresses canonical. */
  noindex: boolean;
}

const GROUNNEL_DESCRIPTION =
  'Grounnel pulls the factual claims out of a piece of writing and checks each one against the open web, marking them in place with the passage and source behind every verdict.';

const BIASSEMBLE_DESCRIPTION =
  'Biassemble reads a piece of writing and names the cognitive biases shaping it, quoting the passage behind every observation.';

// A shared assessment gets no canonical: pointing one at the homepage told search engines these
// pages were duplicates of it, and pointing it at itself would invite indexing pages that can
// name private individuals. The X-Robots-Tag header in vercel.json is the binding control.
const CHECK_META = (brand: Brand): PageMeta => ({
  title: `Fact-check — ${brand.name}`,
  description: 'A shared fact-check. Every verdict shows the passage and the source behind it.',
  canonicalPath: null,
  noindex: true,
});

export function pageMeta(brand: Brand, page: PageId): PageMeta {
  const home = brand.id === 'grounnel' ? GROUNNEL_DESCRIPTION : BIASSEMBLE_DESCRIPTION;

  switch (page) {
    case 'about':
      return {
        title: `About ${brand.name} — how it works`,
        description:
          brand.id === 'grounnel'
            ? 'How Grounnel finds the factual claims in a text, searches for evidence, and decides each verdict — including what it gets wrong.'
            : 'What Biassemble looks for, how it reads a text, and how it relates to Grounnel.',
        canonicalPath: '/about',
        noindex: false,
      };
    case 'stats':
      return {
        title: `What we have measured — ${brand.name}`,
        description:
          'Measured results from real Grounnel runs: verdict mix, false accusations, and what the numbers do and do not show.',
        canonicalPath: '/stats',
        noindex: false,
      };
    case 'check':
      return CHECK_META(brand);
    case 'not-found':
      return { title: `Page not found — ${brand.name}`, description: home, canonicalPath: null, noindex: true };
    default:
      return {
        title: `${brand.name} — ${brand.tagline}`,
        description: home,
        canonicalPath: '/',
        noindex: false,
      };
  }
}

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string): void {
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function setCanonical(href: string | null): void {
  const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (href === null) {
    existing?.remove();
    return;
  }
  const tag = existing ?? document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'canonical' }));
  tag.href = href;
}

/** Rewrites the static head to this brand and route. Returns nothing; call it from an effect. */
export function applyPageMeta(brand: Brand, page: PageId): void {
  const meta = pageMeta(brand, page);
  const url = meta.canonicalPath === null ? null : `${brand.origin}${meta.canonicalPath}`;

  document.title = meta.title;
  setMeta('meta[name="description"]', 'name', 'description', meta.description);
  setCanonical(url);

  setMeta('meta[property="og:site_name"]', 'property', 'og:site_name', brand.name);
  setMeta('meta[property="og:title"]', 'property', 'og:title', meta.title);
  setMeta('meta[property="og:description"]', 'property', 'og:description', meta.description);
  setMeta('meta[property="og:url"]', 'property', 'og:url', url ?? `${brand.origin}/`);
  setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', meta.title);
  setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', meta.description);

  // Belt-and-braces only for the pages that need it — vercel.json's X-Robots-Tag is the real one,
  // since it needs neither JS nor a crawl that robots.txt already discourages.
  const robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (meta.noindex) setMeta('meta[name="robots"]', 'name', 'robots', 'noindex, nofollow');
  else robots?.remove();
}
