// Legacy filename: Grounnel is now the umbrella and Biassemble a separate related project, so the
// name no longer describes the hierarchy. Renaming is pure churn; do it when this file is next
// touched substantially (plan.md, Project Structure).
import type { ReactNode } from 'react';
import type { Brand } from '../../lib/brand';
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
  // A cross-site nav entry is an absolute URL; it can never be the active path.
  const external = href.startsWith('http');
  return (
    <a
      href={href}
      rel={external ? 'noopener' : undefined}
      aria-current={active ? 'page' : undefined}
      className={active ? 'font-semibold text-primary' : 'link link-hover text-base-content/70'}
    >
      {children}
    </a>
  );
}

export default function BiassembleLayout({ brand, activePath, children }: BiassembleLayoutProps) {
  // overflow-x-clip, not hidden: a claim tooltip is `absolute w-max` and stays in layout even at
  // opacity-0, so one near the right edge widened the page into a horizontal scrollbar. `clip`
  // leaves the vertical axis visible, so tooltips still hang below their claim.
  const active = normalizePath(activePath);
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-base-200">
      {/* Height governs, width follows — a fixed w-x h-x box squashes both files, which have
          different aspect ratios. The wordmark is text only when the logo doesn't already carry it. */}
      {/* items-start, not items-center: centring the row against a tall logo pushed the menu far
          down the header. The menu sits at the top and the logo hangs below it, as it did before. */}
      <nav className="grid grid-cols-[1fr_auto_1fr] items-start gap-4 border-b border-base-300 px-6 pt-3 pb-2">
        <a href="/" className="flex items-center gap-2 justify-self-start" aria-label={brand.name}>
          <img src={brand.logo} alt="" className={`${brand.logoHeightClass} w-auto`} />
          {!brand.logoIncludesName && (
            <span className="text-2xl font-semibold tracking-tight">{brand.name}</span>
          )}
        </a>
        <div className="flex justify-self-center gap-6 pt-1.5 text-sm">
          {brand.nav.map((item) => (
            <NavLink key={item.href} href={item.href} active={item.href === active}>
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
      <main className="flex-1">{children}</main>
      <footer className="mt-16 border-t border-base-300 px-6 py-6 text-sm text-base-content/60">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {brand.name}
          </p>
          <nav className="flex gap-5">
            {brand.nav
              .filter((item) => item.href !== '/')
              .map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  rel={item.href.startsWith('http') ? 'noopener' : undefined}
                  className="link link-hover"
                >
                  {item.label}
                </a>
              ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
