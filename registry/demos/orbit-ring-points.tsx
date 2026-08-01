'use client';

import { OrbitRingPoints } from '@/registry/ui/orbit-ring-points';

export default function Demo() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <OrbitRingPoints ringCount={5} dotsPerRing={190} speed={0.28} />

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-5">
        <span className="meta">Systems</span>
        <div className="max-w-[22ch]">
          <p className="text-sm leading-snug tracking-tight text-fg">
            Five services, one command centre.
          </p>
          <p className="mt-1 text-xs text-faint">Live since 04:12 UTC</p>
        </div>
      </div>
    </div>
  );
}
