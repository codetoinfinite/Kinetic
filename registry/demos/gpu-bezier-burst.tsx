'use client';

import { GpuBezierBurst } from '@/registry/ui/gpu-bezier-burst';

export default function Demo() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <GpuBezierBurst />

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-5">
        <div className="flex items-baseline justify-between">
          <span className="meta">Newton</span>
          <span className="meta">8 steps</span>
        </div>
        <p className="max-w-[24ch] text-sm leading-snug tracking-tight text-fg">
          Click a sector. Every particle solves its own curve.
        </p>
      </div>
    </div>
  );
}
