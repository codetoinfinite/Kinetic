'use client';

import { DriftingSmokeLayers } from '@/registry/ui/drifting-smoke-layers';

export default function Demo() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <DriftingSmokeLayers tint="var(--color-accent)" intensity={0.85} />

      <div className="relative flex h-full w-full flex-col justify-end gap-3 p-8">
        <p className="meta">Chapter 04</p>
        <h2 className="max-w-md text-2xl leading-tight tracking-tight text-fg">
          Everything here is weather, and weather is only ever a gradient that forgot where
          its edges were.
        </h2>
        <p className="max-w-sm text-[13px] leading-relaxed text-muted">
          Three layers, three periods that never agree, one keyframe block between them.
        </p>
      </div>
    </div>
  );
}
