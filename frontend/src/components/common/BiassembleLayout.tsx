import type { ReactNode } from 'react';
import { isGrounnelRoute } from '../../lib/routes';

interface BiassembleLayoutProps {
  children: ReactNode;
}

export default function BiassembleLayout({ children }: BiassembleLayoutProps) {
  return (
    <div className="relative">
      <div className="absolute top-0 left-0 z-10">
        <img src="/logo.svg" alt="Biassemble" className="w-32 h-32" />
      </div>
      <div className="absolute top-4 right-4 z-10">
        {isGrounnelRoute() ? (
          <a href="/" className="link link-hover text-sm text-base-content/70">
            ← Back to Biassemble
          </a>
        ) : (
          <a href="/grounnel" className="link link-hover text-sm text-base-content/70">
            Try Grounnel →
          </a>
        )}
      </div>
      {children}
    </div>
  );
}