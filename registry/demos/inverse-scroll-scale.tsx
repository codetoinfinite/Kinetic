'use client';

import { useRef } from 'react';
import { InverseScrollScale } from '@/registry/ui/inverse-scroll-scale';

const PLATES = [
  { caption: 'Plate 01 — Harbour timetable, recto', angle: '135deg' },
  { caption: 'Plate 02 — Route marks at 8mm', angle: '20deg' },
  { caption: 'Plate 03 — Ticket stock, uncut', angle: '75deg' },
];

export default function Demo() {
  const scroller = useRef<HTMLDivElement>(null);

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <div
        ref={scroller}
        className="scrollbar-none h-full w-full overflow-y-auto overscroll-contain px-5 py-6"
      >
        <p className="meta">Plates</p>
        <h2 className="mt-2 max-w-[20ch] text-lg leading-tight tracking-tight text-fg">
          Each plate arrives too large and settles into its frame.
        </h2>

        <div className="mt-8 flex flex-col gap-8 pb-24">
          {PLATES.map((plate) => (
            <figure key={plate.caption}>
              <InverseScrollScale
                scrollerRef={scroller}
                className="h-44 w-full rounded-md border border-line"
              >
                {/* CSS-drawn stand-in for a photograph: no asset, and the
                    diagonal makes the scale change unmistakable. */}
                <div
                  className="h-full w-full"
                  style={{
                    background: `repeating-linear-gradient(${plate.angle}, var(--color-surface) 0 14px, var(--color-bg) 14px 28px)`,
                  }}
                />
              </InverseScrollScale>
              <figcaption className="meta mt-2">{plate.caption}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}
