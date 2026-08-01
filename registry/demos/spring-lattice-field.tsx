'use client';

import { SpringLatticeField } from '@/registry/ui/spring-lattice-field';

export default function Demo() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <SpringLatticeField />

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6">
        <div className="flex items-start justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          <span>Lattice</span>
          <span>60 Hz fixed step</span>
        </div>
        <p className="max-w-[24ch] font-mono text-[10px] uppercase leading-relaxed tracking-[0.18em] text-faint">
          Drag across the field
        </p>
      </div>
    </div>
  );
}
