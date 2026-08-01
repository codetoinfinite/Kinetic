'use client';

import { DomainWarpedFbm } from '@/registry/ui/domain-warped-fbm';

export default function Demo() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <DomainWarpedFbm />

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-end p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          Atmosphere
        </p>
        <h2 className="mt-2 max-w-[14ch] text-3xl leading-[0.95] tracking-tight text-fg">
          Weather, not animation
        </h2>
        <p className="mt-2 max-w-[40ch] text-xs leading-relaxed text-muted">
          Two octaves, warped into themselves, drifting at 0.03 units a second.
        </p>
      </div>
    </div>
  );
}
