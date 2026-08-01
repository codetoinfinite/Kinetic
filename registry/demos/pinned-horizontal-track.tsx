'use client';

import { useRef } from 'react';
import { PinnedHorizontalTrack } from '@/registry/ui/pinned-horizontal-track';

const PANELS = [
  { index: '01', title: 'Terrace House', year: '2024', place: 'Lisbon' },
  { index: '02', title: 'Salt Pavilion', year: '2024', place: 'Setúbal' },
  { index: '03', title: 'Foundry Rooms', year: '2023', place: 'Porto' },
  { index: '04', title: 'North Reading', year: '2023', place: 'Braga' },
];

export default function Demo() {
  const scroller = useRef<HTMLDivElement>(null);

  return (
    <div ref={scroller} className="scrollbar-none h-full w-full overflow-y-auto bg-bg">
      <section className="flex h-full flex-col justify-end p-6">
        <p className="meta">Index — 2023/2024</p>
        <h2 className="mt-3 max-w-[18ch] text-2xl leading-tight tracking-tight text-fg">
          Four buildings, one long room.
        </h2>
      </section>

      <PinnedHorizontalTrack scroller={scroller}>
        {PANELS.map((panel) => (
          <article
            key={panel.index}
            className="flex w-[68%] min-w-[200px] shrink-0 flex-col justify-between border-r border-line p-6"
          >
            <div className="flex items-baseline justify-between">
              <span className="meta">{panel.index}</span>
              <span className="meta">{panel.year}</span>
            </div>
            <div
              className="my-5 flex-1 rounded-sm border border-line"
              style={{
                backgroundImage:
                  'linear-gradient(160deg, color-mix(in oklab, var(--k-accent) 22%, transparent), transparent 62%)',
              }}
            />
            <div>
              <h3 className="text-lg tracking-tight text-fg">{panel.title}</h3>
              <p className="mt-1 text-sm text-muted">{panel.place}</p>
            </div>
          </article>
        ))}
      </PinnedHorizontalTrack>

      <section className="flex h-full flex-col justify-start p-6">
        <div className="rule" />
        <p className="mt-4 max-w-[32ch] text-sm leading-relaxed text-muted">
          The pin released exactly where the track ran out. Vertical scroll resumes
          with no gap and no overshoot.
        </p>
      </section>
    </div>
  );
}
