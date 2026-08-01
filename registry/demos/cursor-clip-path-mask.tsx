'use client';

import { CursorClipPathMask } from '@/registry/ui/cursor-clip-path-mask';

export default function Demo() {
  return (
    <CursorClipPathMask
      className="h-full w-full"
      radius={110}
      base={
        <div className="flex h-full w-full flex-col justify-between bg-bg p-6 sm:p-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
            Plate 04 / Survey
          </p>
          <div>
            <h2 className="max-w-sm text-2xl leading-tight tracking-tight text-fg sm:text-3xl">
              What the map leaves out.
            </h2>
            <button
              type="button"
              data-mask-trigger
              className="mt-5 rounded-full border border-line-strong px-5 py-2 text-sm text-fg transition-colors hover:border-accent hover:text-accent"
            >
              Show the survey
            </button>
          </div>
        </div>
      }
      reveal={
        <div className="flex h-full w-full flex-col justify-between bg-accent p-6 text-accent-fg sm:p-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] opacity-70">
            Plate 04 / Overlay
          </p>
          <div>
            <h2 className="max-w-sm text-2xl leading-tight tracking-tight sm:text-3xl">
              Contours, spoil heaps, a drowned lane.
            </h2>
            <p className="mt-5 max-w-xs text-sm leading-relaxed opacity-80">
              The same frame, surveyed eighty years later.
            </p>
          </div>
        </div>
      }
    />
  );
}
