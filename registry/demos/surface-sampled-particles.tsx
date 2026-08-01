'use client';

import { SurfaceSampledParticles } from '@/registry/ui/surface-sampled-particles';

export default function Demo() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <SurfaceSampledParticles count={9500} ringCount={5} spin={0.14} />

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-5">
        <div className="flex items-start justify-between">
          <span className="meta">Specimen 04</span>
          <span className="meta text-faint">9,500 samples</span>
        </div>

        <div className="flex items-end justify-between gap-4">
          <h2 className="max-w-[14ch] text-2xl leading-[0.95] tracking-tight text-fg">
            Sampled by area, not by mesh
          </h2>
          <p className="hidden max-w-[22ch] text-right text-xs leading-relaxed text-muted sm:block">
            Rings measured off the silhouette the particles landed on.
          </p>
        </div>
      </div>
    </div>
  );
}
