'use client';

import { RelaxedSeededScatter } from '@/registry/ui/relaxed-seeded-scatter';

export default function Demo() {
  return (
    <div className="flex h-full w-full flex-col bg-bg">
      <div className="shrink-0 px-4 pt-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-faint">
          15 passes · min gap 0.4 × mean
        </p>
        <p className="mt-1 max-w-[46ch] text-[13px] leading-snug text-muted">
          Dashed ticks are where the seeded sampler put each point. Solid ticks are where
          relaxation left them.
        </p>
      </div>
      <div className="min-h-0 flex-1 pt-2">
        <RelaxedSeededScatter />
      </div>
    </div>
  );
}
