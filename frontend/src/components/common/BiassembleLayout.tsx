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
      <nav className="grid grid-cols-[1fr_auto_1fr] items-start bg-base-200 px-4">
        <a href="/" className="justify-self-start">
          <img src="/logo.svg" alt="Biassemble" className="w-32 h-32" />
        </a>
        <div className="flex justify-self-center gap-6 pt-2.5 text-sm">
          <NavLink href="/" active={!onGrounnel}>
            Biassemble
          </NavLink>
          <NavLink href="/grounnel" active={onGrounnel}>
            Grounnel
          </NavLink>
        </div>
      </nav>
      {children}
    </div>
  );
}