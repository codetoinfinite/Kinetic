'use client';

import { BayerPlasmaHero } from '@/registry/ui/bayer-plasma-hero';

export default function Demo() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <BayerPlasmaHero />

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6">
        <div className="flex items-start justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-fg mix-blend-difference">
          <span>Proof 01</span>
          <span>11 tones</span>
        </div>
        <h2 className="max-w-[11ch] text-4xl leading-[0.9] tracking-tight text-fg mix-blend-difference">
          Set in halftone
        </h2>
      </div>
    </div>
  );
}
