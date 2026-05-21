import type { ReactNode } from 'react';

interface BiassembleLayoutProps {
  children: ReactNode;
}

export default function BiassembleLayout({ children }: BiassembleLayoutProps) {
  return (
    <div className="relative">
      <div className="absolute top-0 left-0 z-10">
        <img src="/logo.svg" alt="Biassemble" className="w-32 h-32" />
      </div>
      {children}
    </div>
  );
}