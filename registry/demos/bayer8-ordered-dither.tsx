'use client';

import { Bayer8OrderedDither } from '@/registry/ui/bayer8-ordered-dither';

export default function Demo() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <Bayer8OrderedDither />

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6">
        <div className="flex items-start justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-fg mix-blend-difference">
          <span>Ordered 8&times;8</span>
          <span>5 levels</span>
        </div>
        <h2 className="max-w-[13ch] text-3xl leading-[0.95] tracking-tight text-fg mix-blend-difference">
          Printed, not rendered
        </h2>
      </div>
    </div>
  );
}
