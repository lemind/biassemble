// One source of head metadata for every route x brand pair. Until this existed, index.html's
// static head (Grounnel's homepage) was served on every URL of both domains.
import { getBrand, type Brand } from './brand';
import type { PageId } from './routes';

export interface PageMeta {
  title: string;
  description: string;
  /** Absolute canonical URL, or null to emit none. Not always on `brand.origin`: a page whose
   *  content belongs to the other brand canonicalises to where that content really lives. */
  canonical: string | null;
  noindex: boolean;
}

const GROUNNEL_ORIGIN = getBrand('grounnel').origin;

const GROUNNEL_HOME =
  'Grounnel finds the factual claims in a piece of writing and checks each one against the open web, marking every verdict with its source.';

// Rewritten after review: the product is a three-step flow (situation, AI-guided questions,
// reflection) and its output quotes no passages — that is Grounnel's affordance, not this one's.
const BIASSEMBLE_HOME =
  'Write about a situation in your own words, answer a few questions, and see the cognitive biases that may be shaping how you tell it.';

// Shared assessments are always Grounnel's artifact, whichever host serves the route. No canonical:
// pointing at the homepage made them duplicates of it, pointing at themselves invites indexing.
const CHECK: PageMeta = {
  title: 'Fact-check — Grounnel',
  description: 'A shared fact-check. Every verdict shows the passage and the source behind it.',
  canonical: null,
  noindex: true,
};

export function pageMeta(brand: Brand, page: PageId): PageMeta {
  const isGrounnel = brand.id === 'grounnel';

  switch (page) {
    // The fact-checker, wherever it is mounted. On the Biassemble host `/grounnel` serves this same
    // tool (FR-002), so it canonicalises to Grounnel's own home rather than to this host's root.
    case 'tool':
      return {
        title: 'Grounnel — Verify the claims in any text',
        description: GROUNNEL_HOME,
        canonical: `${GROUNNEL_ORIGIN}/`,
        noindex: false,
      };
    case 'reflection':
      return {
        title: `${brand.name} — ${brand.tagline}`,
        description: BIASSEMBLE_HOME,
        canonical: `${brand.origin}/`,
        noindex: false,
      };
    case 'about':
      return isGrounnel
        ? {
            title: 'About Grounnel — how it works',
            description:
              'How Grounnel finds the factual claims in a text, searches for evidence and decides each verdict — including where it gets things wrong.',
            canonical: `${GROUNNEL_ORIGIN}/about`,
            noindex: false,
          }
        : {
            title: 'About Biassemble — how it works',
            description:
              'How Biassemble turns an account of a situation into questions, and what the cognitive biases it names do and do not tell you.',
            canonical: `${brand.origin}/about`,
            noindex: false,
          };
    // Grounnel's measurements. The route resolves on both hosts but the page is one page: the
    // Biassemble copy canonicalises to it and stays out of the index rather than duplicating it.
    case 'stats':
      return {
        title: 'What we have measured — Grounnel',
        description:
          'Measured results from real Grounnel runs: verdict mix, false accusations, and what the numbers do and do not show.',
        canonical: `${GROUNNEL_ORIGIN}/stats`,
        noindex: !isGrounnel,
      };
    case 'check':
      return CHECK;
    default:
      return {
        title: `Page not found — ${brand.name}`,
        description: `That page does not exist on ${brand.name}.`,
        canonical: null,
        noindex: true,
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

/** Rewrites the static head to this brand and route. Safe to call again on an in-place URL change. */
export function applyPageMeta(brand: Brand, page: PageId): void {
  const meta = pageMeta(brand, page);

  document.title = meta.title;
  setMeta('meta[name="description"]', 'name', 'description', meta.description);
  setCanonical(meta.canonical);

  setMeta('meta[property="og:site_name"]', 'property', 'og:site_name', brand.name);
  setMeta('meta[property="og:title"]', 'property', 'og:title', meta.title);
  setMeta('meta[property="og:description"]', 'property', 'og:description', meta.description);
  setMeta('meta[property="og:url"]', 'property', 'og:url', meta.canonical ?? `${brand.origin}/`);
  // The shared card image is Grounnel's; its alt must not contradict a Biassemble-titled card.
  setMeta('meta[property="og:image:alt"]', 'property', 'og:image:alt', meta.title);
  setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', meta.title);
  setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', meta.description);

  const robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (meta.noindex) setMeta('meta[name="robots"]', 'name', 'robots', 'noindex, nofollow');
  else robots?.remove();
}
