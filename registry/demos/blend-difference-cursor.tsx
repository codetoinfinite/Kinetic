'use client';

import { BlendDifferenceCursor } from '@/registry/ui/blend-difference-cursor';

export default function Demo() {
  return (
    <BlendDifferenceCursor className="h-full w-full bg-bg" label="Open">
      <div className="flex h-full w-full flex-col">
        {/* A light band and a dark band, so the inversion is visible crossing
            from one to the other without any per-section styling. */}
        <div className="flex flex-1 items-center justify-between gap-6 bg-surface px-6 sm:px-8">
          <h2 className="text-2xl leading-tight tracking-tight sm:text-3xl">
            Contrast
            <br />
            solves itself.
          </h2>
          <button
            type="button"
            data-cursor="view"
            className="shrink-0 rounded-full border border-line-strong px-5 py-2 text-sm"
          >
            Case study
          </button>
        </div>

        <div className="flex flex-1 items-center justify-between gap-6 bg-fg px-6 text-bg sm:px-8">
          <p className="max-w-xs text-sm leading-relaxed">
            The same white dot, unchanged, over an inverted band.
          </p>
          <a href="#" className="shrink-0 text-sm underline underline-offset-4">
            A plain link
          </a>
        </div>
      </div>
    </BlendDifferenceCursor>
  );
}
