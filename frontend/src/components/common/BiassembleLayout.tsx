import type { ReactNode } from 'react';
import { isGrounnelRoute } from '../../lib/routes';

interface BiassembleLayoutProps {
  children: ReactNode;
}

interface NavLinkProps {
  href: string;
  active: boolean;
  children: ReactNode;
}

// Plain <a>, always full-reload (ADR-002 §3) — no client-side router for two destinations.
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

export default function BiassembleLayout({ children }: BiassembleLayoutProps) {
  const onGrounnel = isGrounnelRoute();
  return (
    <div className="relative">
      <nav className="navbar px-4 sm:px-6">
        <div className="navbar-start">
          <a href="/">
            <img src="/logo.svg" alt="Biassemble" className="w-20 h-20" />
          </a>
        </div>
        <div className="navbar-center flex items-center gap-6 text-sm">
          <NavLink href="/" active={!onGrounnel}>
            Biassemble
          </NavLink>
          <NavLink href="/grounnel" active={onGrounnel}>
            Grounnel
          </NavLink>
        </div>
        <div className="navbar-end" />
      </nav>
      {children}
    </div>
  );
}