'use client';

import { CylinderDotScore } from '@/registry/ui/cylinder-dot-score';

export default function Demo() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <CylinderDotScore />

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-5">
        <div className="flex items-baseline justify-between">
          <span className="meta">Score</span>
          <span className="meta">6 / 6</span>
        </div>
        <p className="max-w-[24ch] text-sm leading-snug tracking-tight text-fg">
          Two movements, one cylinder, read from the outside in.
        </p>
      </div>
    </div>
  );
}
