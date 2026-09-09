// Legacy filename: Grounnel is now the umbrella and Biassemble a separate related project, so the
// name no longer describes the hierarchy. Renaming is pure churn; do it when this file is next
// touched substantially (plan.md, Project Structure).
import type { ReactNode } from 'react';
import { siblingBrand, type Brand } from '../../lib/brand';
import { normalizePath } from '../../lib/routes';

interface BiassembleLayoutProps {
  brand: Brand;
  activePath: string;
  children: ReactNode;
}

interface NavLinkProps {
  href: string;
  active: boolean;
  children: ReactNode;
}

// Plain <a>, always full-reload — no client-side router. Cross-navigation remounting App is what
// lets brand and route resolve once, at mount.
function NavLink({ href, active, children }: NavLinkProps) {
  return (
    <a
      href={href}
      aria-current={active ? 'page' : undefined}
      className={active ? 'font-semibold text-primary' : 'link link-hover text-base-content/70'}
    >
      {children}
    </a>
  );
}

export default function BiassembleLayout({ brand, activePath, children }: BiassembleLayoutProps) {
  const sibling = siblingBrand(brand);
  const active = normalizePath(activePath);
  return (
    <div className="relative flex min-h-screen flex-col bg-base-200">
      {/* Height governs, width follows — a fixed w-x h-x box squashes both files, which have
          different aspect ratios. The wordmark is text only when the logo doesn't already carry it. */}
      <nav className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-base-300 px-6 py-3">
        <a href="/" className="flex items-center gap-2 justify-self-start" aria-label={brand.name}>
          <img src={brand.logo} alt="" className={`${brand.logoHeightClass} w-auto`} />
          {!brand.logoIncludesName && (
            <span className="text-lg font-semibold tracking-tight">{brand.name}</span>
          )}
        </a>
        <div className="flex justify-self-center gap-6 text-sm">
          {brand.nav.map((item) => (
            <NavLink key={item.href} href={item.href} active={item.href === active}>
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-base-300 px-4 py-6 text-center text-sm text-base-content/60">
        <p>
          Also from this project:{' '}
          <a className="link" href={sibling.origin} rel="noopener">
            {sibling.name}
          </a>{' '}
          — {sibling.tagline.toLowerCase()}.
        </p>
      </footer>
    </div>
  );
}
