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
  nav: NavItem[];
}

// One explicit list, not a regex, not repeated across files. Add `grounnel.com` here when bought.
const GROUNNEL_HOSTS = ['grounnel.vercel.app'];
const BIASSEMBLE_HOSTS = ['frontend-topaz-eight-10.vercel.app'];
const DEV_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];

const GROUNNEL: Brand = {
  id: 'grounnel',
  name: 'Grounnel',
  logo: '/grn-logo.svg',
  tagline: 'Verify the claims in any text',
  origin: `https://${GROUNNEL_HOSTS[0]}`,
  nav: [
    { href: '/', label: 'Check' },
    { href: '/about', label: 'About' },
    { href: '/stats', label: 'Stats' },
  ],
};

const BIASSEMBLE: Brand = {
  id: 'biassemble',
  name: 'Biassemble',
  logo: '/logo.svg',
  tagline: 'Identify cognitive biases in text',
  origin: `https://${BIASSEMBLE_HOSTS[0]}`,
  nav: [
    { href: '/', label: 'Biassemble' },
    { href: '/grounnel', label: 'Grounnel' },
    { href: '/about', label: 'About' },
    { href: '/stats', label: 'Stats' },
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

/** Pure: hostname → brand. Unknown and development hosts both fall back to Biassemble (FR-006). */
export function brandForHost(hostname: string): Brand {
  return classifyHost(hostname) === 'grounnel' ? GROUNNEL : BIASSEMBLE;
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

export function resolveBrand(hostname = window.location.hostname): Brand {
  const kind = classifyHost(hostname);
  const brand = brandForHost(hostname);
  if (!announced) {
    announced = true;
    if (kind === 'development') {
      console.info(`[brand] ${hostname} is a development host — rendering ${brand.name}`);
    } else if (kind === 'unknown') {
      console.warn(`[brand] ${hostname} is not a configured host — falling back to ${brand.name}`);
    }
  }
  return brand;
}
