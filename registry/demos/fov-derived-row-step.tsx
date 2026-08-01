'use client';

import { useState } from 'react';
import { FovDerivedRow } from '@/registry/ui/fov-derived-row-step';

/* Seven procedurally-tinted plates. No assets: the artwork is a two-stop
   gradient whose hue is a function of the index. */
const HUE_START = 214;
const HUE_STEP = 19;

/* Each entry is a field of view in degrees. Cycling them shows the spacing
   re-solving: a wider camera sees more of the plane, so the step grows and the
   row keeps spanning the frame exactly. */
const FOVS = [70, 100, 44];

const PLATES = 7;

function plateBackground(index: number) {
  const hue = HUE_START + index * HUE_STEP;
  return {
    backgroundImage: [
      `radial-gradient(140% 90% at 24% 6%, oklch(0.74 0.12 ${hue} / 0.5), transparent 64%)`,
      `linear-gradient(160deg, oklch(0.52 0.13 ${hue}) 0%, oklch(0.27 0.08 ${hue + 24}) 58%, oklch(0.15 0.04 ${hue + 44}) 100%)`,
    ].join(', '),
  };
}

export default function Demo() {
  const [step, setStep] = useState(0);
  const fov = FOVS[step % FOVS.length] ?? FOVS[0] ?? 70;

  return (
    <div className="flex h-full w-full flex-col bg-bg">
      <div className="relative min-h-0 flex-1">
        {/* The correctness test, drawn. With spanRatio at 1 the outermost item
            CENTRES land on these two lines at every viewport width — which is
            why the outer plates are half-clipped rather than tucked inside. */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-px bg-fg/25" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-px bg-fg/25" />

        <FovDerivedRow
          fov={fov}
          cellClassName="aspect-[3/4] w-[19%] min-w-[64px] max-w-[150px]"
        >
          {Array.from({ length: PLATES }, (_, i) => (
            <div
              key={i}
              className="h-full w-full rounded-sm shadow-[0_18px_44px_-18px_rgb(0_0_0/0.65)]"
              style={plateBackground(i)}
            />
          ))}
        </FovDerivedRow>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-4 border-t border-line px-4 py-3">
        <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-faint">
          step = 2·z·tan(fov/2)·aspect / {PLATES - 1}
        </span>
        <button
          type="button"
          onClick={() => setStep((s) => s + 1)}
          className="shrink-0 rounded-sm border border-line px-3 py-1 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted transition-colors hover:text-fg"
        >
          fov {fov}&deg;
        </button>
      </div>
    </div>
  );
}
