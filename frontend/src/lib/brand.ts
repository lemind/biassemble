// Brand is identity only — name, logo, tagline, nav. It never carries a component reference:
// the path table (routes.ts) decides what renders. Keeping them orthogonal is what lets the
// Biassemble host keep the reflection flow at `/` while the Grounnel host puts the tool there.

export type BrandId = 'grounnel' | 'biassemble';

/** How a hostname was recognised. `unknown` is a production-looking host we don't serve. */
export type HostKind = 'grounnel' | 'biassemble' | 'development' | 'unknown';

export interface NavItem {
  href: string;
  label: string;
}

export interface Brand {
  id: BrandId;
  name: string;
  logo: string;
  tagline: string;
  /** Canonical public origin — the one place a URL for this brand is written. */
  origin: string;
  /** Height class for the mark. The two files are not interchangeable: Biassemble's is a full
   *  lockup (square, wordmark baked in) and needs room to read; Grounnel's is a bare glyph. */
  logoHeightClass: string;
  /** True when the file already contains the brand name, so the layout must not repeat it. */
  logoIncludesName: boolean;
  nav: NavItem[];
}

// One explicit list, not a regex, not repeated across files. Add `grounnel.com` here when bought.
const GROUNNEL_HOSTS = ['grounnel.vercel.app'];
const BIASSEMBLE_HOSTS = ['frontend-topaz-eight-10.vercel.app'];
const DEV_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];

// Each brand's canonical public URL, written once. The two nav bars cross-link to each other's
// SITE, not to a path on the current host — they are separate products at separate addresses.
const GROUNNEL_ORIGIN = `https://${GROUNNEL_HOSTS[0]}`;
const BIASSEMBLE_ORIGIN = `https://${BIASSEMBLE_HOSTS[0]}`;

const GROUNNEL: Brand = {
  id: 'grounnel',
  name: 'Grounnel',
  logo: '/grn-logo.svg',
  tagline: 'Verify the claims in any text',
  origin: GROUNNEL_ORIGIN,
  logoHeightClass: 'h-12',
  logoIncludesName: false,
  nav: [
    { href: '/', label: 'Check' },
    { href: '/about', label: 'About' },
    { href: '/stats', label: 'Stats' },
    { href: BIASSEMBLE_ORIGIN, label: 'Biassemble' },
  ],
};

const BIASSEMBLE: Brand = {
  id: 'biassemble',
  name: 'Biassemble',
  logo: '/logo.svg',
  tagline: 'Identify cognitive biases in text',
  origin: BIASSEMBLE_ORIGIN,
  logoHeightClass: 'h-16',
  logoIncludesName: true,
  // No Stats: that page is Grounnel's measurements and means nothing here. Grounnel points at the
  // Grounnel site, not this host's /grounnel — that route still works for existing links (FR-002).
  nav: [
    { href: '/', label: 'Biassemble' },
    { href: '/about', label: 'About' },
    { href: GROUNNEL_ORIGIN, label: 'Grounnel' },
  ],
};

const BRANDS: Record<BrandId, Brand> = { grounnel: GROUNNEL, biassemble: BIASSEMBLE };

/**
 * Three cases, not two — an unknown host is not the same as a development host. Explicit lists
 * win over the `.vercel.app` suffix so `grounnel.vercel.app` classifies as Grounnel, not preview.
 */
export function classifyHost(hostname: string): HostKind {
  const host = hostname.toLowerCase();
  if (GROUNNEL_HOSTS.includes(host)) return 'grounnel';
  if (BIASSEMBLE_HOSTS.includes(host)) return 'biassemble';
  if (DEV_HOSTS.includes(host) || host.endsWith('.localhost') || host.endsWith('.vercel.app')) {
    return 'development';
  }
  return 'unknown';
}

/**
 * Pure: hostname → brand. Unknown and development hosts both fall back to Biassemble (FR-006),
 * except that a development host may NAME the brand it wants as its first label —
 * `grounnel.localhost` renders Grounnel. That is the only way to see the Grounnel brand without a
 * deploy: browsers HSTS-preload `*.vercel.app`, so the real host can't be pointed at a dev server.
 * It cannot leak into production: `.localhost` is reserved and never resolves off this machine.
 */
export function brandForHost(hostname: string): Brand {
  const host = hostname.toLowerCase();
  if (GROUNNEL_HOSTS.includes(host)) return GROUNNEL;
  if (BIASSEMBLE_HOSTS.includes(host)) return BIASSEMBLE;
  if (classifyHost(host) === 'development' && host.split('.')[0] === 'grounnel') return GROUNNEL;
  return BIASSEMBLE;
}

export function getBrand(id: BrandId): Brand {
  return BRANDS[id];
}

/** The other brand — the footer's "also from this project" link, so no URL is written twice. */
export function siblingBrand(brand: Brand): Brand {
  return brand.id === 'grounnel' ? BIASSEMBLE : GROUNNEL;
}

// A DNS typo renders a valid Biassemble page, so the deploy looks successful while Grounnel is
// not configured. A console line is the whole mitigation; T001's six-case check is the real one.
let announced = false;

const OVERRIDE_KEY = 'grounnel.devBrand';

/**
 * Development-only brand switch: `?brand=grounnel` once, and it sticks for the tab.
 *
 * The hostname conventions above both need DNS to cooperate — `grounnel.localhost` fails outright
 * behind an HTTP proxy that only exempts bare `localhost`, and the real host cannot be pointed at
 * a dev server because browsers HSTS-preload `*.vercel.app`. This path needs neither. It is read
 * ONLY on a development host, so production branding still comes from the hostname alone.
 */
function devBrandOverride(kind: HostKind): Brand | null {
  if (kind !== 'development') return null;
  try {
    const requested = new URLSearchParams(window.location.search).get('brand');
    const id = requested ?? sessionStorage.getItem(OVERRIDE_KEY);
    if (id !== 'grounnel' && id !== 'biassemble') return null;
    // Written only for a value that resolved, and only when it changes — `resolveBrand` is called
    // from a render body, so an unconditional write would be a side effect during render.
    if (requested && sessionStorage.getItem(OVERRIDE_KEY) !== id) {
      sessionStorage.setItem(OVERRIDE_KEY, id);
    }
    return BRANDS[id];
  } catch {
    // Storage blocked, or no window.location.search — the hostname rules still apply.
    return null;
  }
}

export function resolveBrand(hostname = window.location.hostname): Brand {
  const kind = classifyHost(hostname);
  const override = devBrandOverride(kind);
  const brand = override ?? brandForHost(hostname);
  if (!announced) {
    announced = true;
    if (override) {
      console.info(`[brand] ?brand= override active — rendering ${brand.name}. Clear it with ?brand=biassemble`);
    } else if (kind === 'development') {
      console.info(`[brand] ${hostname} is a development host — rendering ${brand.name}`);
    } else if (kind === 'unknown') {
      console.warn(`[brand] ${hostname} is not a configured host — falling back to ${brand.name}`);
    }
  }
  return brand;
}
