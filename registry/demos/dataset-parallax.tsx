'use client';

import { useRef } from 'react';
import { DatasetParallax } from '@/registry/ui/dataset-parallax';

export default function Demo() {
  const scroller = useRef<HTMLDivElement>(null);

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <div
        ref={scroller}
        className="scrollbar-none h-full w-full overflow-y-auto overscroll-contain"
      >
        <DatasetParallax scrollerRef={scroller}>
          {/* Hero: three planes over the same scroll window at three depths. */}
          <section className="relative h-[70%] min-h-[220px] overflow-hidden border-b border-line">
            <div
              data-parallax="0.4"
              className="absolute inset-0"
              style={{
                backgroundImage:
                  'radial-gradient(120% 80% at 20% 10%, color-mix(in oklab, var(--color-accent) 30%, transparent), transparent 60%)',
              }}
            />
            <div
              data-parallax="0.22"
              className="absolute inset-x-6 top-10 h-40 rounded-md border border-line bg-surface"
            />
            <h2
              data-parallax="0.06"
              className="absolute inset-x-6 top-24 text-3xl leading-[0.95] tracking-tight text-fg"
            >
              Depth is
              <br />
              an attribute
            </h2>
          </section>

          <section className="px-6 py-10">
            <p className="meta">Field notes</p>
            <p className="mt-3 max-w-[40ch] text-sm leading-relaxed text-muted">
              Each plane above carries its own rate on the element. The background moves furthest,
              the card less, the headline barely at all — and every one of them travels a share of
              its own height, so the relationship survives a resize.
            </p>
          </section>

          <section className="relative h-[55%] min-h-[180px] overflow-hidden border-t border-line">
            <div
              data-parallax="0.3"
              className="absolute inset-0"
              style={{
                backgroundImage:
                  'linear-gradient(200deg, color-mix(in oklab, var(--color-accent) 18%, transparent), transparent 65%)',
              }}
            />
            <div
              data-parallax
              className="absolute bottom-8 left-6 right-6 border-t border-line-strong pt-3 text-xs text-faint"
            >
              This rule has a bare `data-parallax` — no value, so it falls back to 0.15.
            </div>
          </section>

          <div className="h-16" />
        </DatasetParallax>
      </div>
    </div>
  );
}
