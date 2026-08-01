'use client';

import { DepthPulseTravellingWave } from '@/registry/ui/depth-pulse-travelling-wave';

export default function Demo() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <DepthPulseTravellingWave />

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-5">
        <div className="flex items-baseline justify-between">
          <span className="meta">Field</span>
          <span className="meta">110 x 44</span>
        </div>
        <p className="max-w-[26ch] text-sm leading-snug tracking-tight text-fg">
          The pulse travels. Depth does the rest.
        </p>
      </div>
    </div>
  );
}
