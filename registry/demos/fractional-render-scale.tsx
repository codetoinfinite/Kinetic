'use client';

import { FractionalRenderScale } from '@/registry/ui/fractional-render-scale';

export default function Demo() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      {/* The field is opaque and paints its own dark space, so the type above
          it is set in white rather than in the theme's foreground. */}
      <FractionalRenderScale className="absolute inset-0" />

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6">
        <div className="flex items-start justify-between gap-4">
          <span className="meta text-white/55">Budget 01 / backing store</span>
          <span className="meta rounded-full border border-white/15 px-2 py-1 text-white/70">
            0.6&#215; &middot; 36% of the pixels
          </span>
        </div>

        <div className="max-w-[24ch]">
          <h2 className="text-2xl leading-[1] tracking-tight text-white">
            Rendered smaller than it looks
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-white/60">
            Move the cursor. The grid it develops is measured in texels, which is why
            the upscale never shows.
          </p>
        </div>
      </div>
    </div>
  );
}
