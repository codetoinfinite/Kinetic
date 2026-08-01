'use client';

import { CursorRepulsionBurst } from '@/registry/ui/cursor-repulsion-burst';

export default function Demo() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <CursorRepulsionBurst />

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-7">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-fg/70">
            Particle Systems
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-fg/40">
            01 / Field
          </span>
        </div>

        <div>
          <h2 className="max-w-[15ch] text-[clamp(1.8rem,5vw,2.9rem)] font-medium leading-[0.95] tracking-tight text-fg">
            The field moves out of your way
          </h2>
          <p className="mt-3 max-w-[44ch] text-xs leading-relaxed text-fg/60">
            Fourteen hundred orbiting particles in one instanced draw call. The pointer
            opens a hole with a linear falloff; a press sends a wave through it, and the
            front tints only what it is passing.
          </p>
          <div className="mt-6 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-fg/45">
            <span>1 draw call</span>
            <span aria-hidden className="h-px w-6 bg-fg/25" />
            <span>3 concurrent waves</span>
          </div>
        </div>
      </div>
    </div>
  );
}
