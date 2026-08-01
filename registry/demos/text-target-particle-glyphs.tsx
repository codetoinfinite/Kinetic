'use client';

import { TextTargetParticleGlyphs } from '@/registry/ui/text-target-particle-glyphs';

export default function Demo() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <TextTargetParticleGlyphs text="KINETIC" count={15000} holdWritten={2.6} />

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-5">
        <div className="flex items-start justify-between">
          <span className="meta">Rasterised, not shipped</span>
          <span className="meta text-faint">15,000 samples</span>
        </div>

        <div className="flex items-end justify-between gap-4">
          <p className="max-w-[16ch] text-xs leading-relaxed text-muted">
            The word is drawn once with <span className="text-fg">fillText</span> into an offscreen
            canvas.
          </p>
          <p className="hidden max-w-[20ch] text-right text-xs leading-relaxed text-muted sm:block">
            Its inked pixels are the targets, so it writes left to right.
          </p>
        </div>
      </div>
    </div>
  );
}
