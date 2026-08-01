'use client';

import { MultipassOffscreenComposite } from '@/registry/ui/multipass-offscreen-composite';

const PASSES = ['01 ramp', '02 fills', '03 bloom', '04 composite'];

export default function Demo() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      {/* The composite is opaque and paints its own dark space, so the type
          above it is set in white rather than in the theme's foreground — it
          sits on the artwork, not on the page. */}
      <MultipassOffscreenComposite className="absolute inset-0" />

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6">
        <span className="meta text-white/55">Chain 04 / offscreen</span>

        <div className="flex items-end justify-between gap-6">
          <div className="max-w-[20ch]">
            <h2 className="text-2xl leading-[1] tracking-tight text-white">
              The canvas is written once
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-white/60">
              Everything before the last pass happens somewhere you never see.
            </p>
          </div>

          <ol className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
            {PASSES.map((pass, index) => (
              <li
                key={pass}
                className="meta text-white/40"
                style={{ opacity: 0.4 + index * 0.2 }}
              >
                {pass}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
