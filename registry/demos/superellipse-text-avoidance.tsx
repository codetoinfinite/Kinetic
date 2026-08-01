'use client';

import { SuperellipseTextAvoidance } from '@/registry/ui/superellipse-text-avoidance';

export default function Demo() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <SuperellipseTextAvoidance textClassName="max-w-[18ch]">
        <h2 className="text-[clamp(1.9rem,5.4vw,3.2rem)] font-medium leading-[0.95] tracking-tight text-fg">
          The field keeps its distance
        </h2>
        <p className="mx-auto mt-4 max-w-[34ch] text-xs leading-relaxed text-fg/55">
          A six-norm fitted to this box, measured from the DOM. Move the pointer for the
          second field.
        </p>
      </SuperellipseTextAvoidance>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-baseline justify-between p-7">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-fg/70">
          Avoidance Fields
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-fg/40">
          e = 6
        </span>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-3 p-7 font-mono text-[10px] uppercase tracking-[0.18em] text-fg/45">
        <span>1 draw call</span>
        <span aria-hidden className="h-px w-6 bg-fg/25" />
        <span>2 fields</span>
      </div>
    </div>
  );
}
