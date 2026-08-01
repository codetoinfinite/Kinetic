'use client';

import { useRef } from 'react';
import { PrescatterHorizontalGallery } from '@/registry/ui/prescatter-horizontal-gallery';

const PLATES = [
  { index: '01', title: 'Bleach Room', place: 'Ostend', tone: 168 },
  { index: '02', title: 'Long Kitchen', place: 'Ghent', tone: 24 },
  { index: '03', title: 'Cold Store', place: 'Antwerp', tone: 212 },
  { index: '04', title: 'Paper Mill', place: 'Liège', tone: 92 },
  { index: '05', title: 'Two Chimneys', place: 'Namur', tone: 320 },
];

export default function Demo() {
  const scroller = useRef<HTMLDivElement>(null);

  return (
    <div ref={scroller} className="scrollbar-none h-full w-full overflow-y-auto bg-bg">
      <section className="flex h-full flex-col justify-end p-6">
        <p className="meta">Plates — five rooms</p>
        <h2 className="mt-3 max-w-[20ch] text-2xl leading-tight tracking-tight text-fg">
          Nothing here sits on the grid.
        </h2>
      </section>

      <PrescatterHorizontalGallery scroller={scroller} seed="plates">
        {PLATES.map((plate) => (
          <article
            key={plate.index}
            className="flex w-[62%] min-w-[190px] shrink-0 flex-col justify-between overflow-visible p-6"
          >
            <div className="flex items-baseline justify-between">
              <span className="meta">{plate.index}</span>
              <span className="meta">/05</span>
            </div>

            {/* The media drifts; the caption below stays on the grid. */}
            <div
              data-scatter
              className="my-5 flex-1 rounded-sm border border-line"
              style={{
                backgroundImage: `linear-gradient(155deg, oklch(0.72 0.13 ${plate.tone} / 0.55), color-mix(in oklab, var(--k-accent) 14%, transparent) 58%, transparent 88%)`,
              }}
            />

            <div>
              <h3 className="text-lg tracking-tight text-fg">{plate.title}</h3>
              <p className="mt-1 text-sm text-muted">{plate.place}</p>
            </div>
          </article>
        ))}
      </PrescatterHorizontalGallery>

      <section className="flex h-full flex-col justify-start p-6">
        <div className="rule" />
        <p className="mt-4 max-w-[34ch] text-sm leading-relaxed text-muted">
          Scroll back up: every plate reverses along the path it flew in on, and
          the resting offsets are identical — they come from the seed, not from
          the roll of a die.
        </p>
      </section>
    </div>
  );
}
