'use client';

import { RadialRippleDotCloud } from '@/registry/ui/radial-ripple-dot-cloud';

export default function Demo() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <RadialRippleDotCloud className="absolute inset-0" />

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6">
        <span className="meta">Field 02 / propagation</span>
        <div className="max-w-[22ch]">
          <h2 className="text-2xl leading-[1] tracking-tight text-fg">
            Every wave has a source
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Amplitude falls off exponentially, so the edge of the field is almost still.
          </p>
        </div>
      </div>
    </div>
  );
}
