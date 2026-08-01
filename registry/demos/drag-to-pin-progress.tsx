'use client';

import { useRef, useState } from 'react';
import { DragToPinProgress } from '@/registry/ui/drag-to-pin-progress';
import {
  PinnedHorizontalTrack,
  type PinnedTrack,
} from '@/registry/ui/pinned-horizontal-track';

const PLATES = [
  { index: '01', label: 'Kerb' },
  { index: '02', label: 'Awning' },
  { index: '03', label: 'Stair' },
  { index: '04', label: 'Landing' },
  { index: '05', label: 'Roof' },
];

export default function Demo() {
  const scroller = useRef<HTMLDivElement>(null);
  const [track, setTrack] = useState<PinnedTrack | null>(null);

  return (
    <div ref={scroller} className="scrollbar-none h-full w-full overflow-y-auto bg-bg">
      <section className="flex h-full flex-col justify-end p-6">
        <p className="meta">Plates 01—05</p>
        <h2 className="mt-3 max-w-[20ch] text-2xl leading-tight tracking-tight text-fg">
          Scroll it, or take hold of it.
        </h2>
      </section>

      <DragToPinProgress
        scroller={scroller}
        trigger={track?.trigger ?? null}
        getDistance={track?.getDistance}
      >
        <div
          className="sticky top-0 z-10 -mb-px h-px w-full origin-left bg-accent"
          style={{ transform: 'scaleX(var(--pin-progress, 0))' }}
        />
        <PinnedHorizontalTrack scroller={scroller} scrub={0.5} onTrack={setTrack}>
          {PLATES.map((plate) => (
            <figure
              key={plate.index}
              className="flex w-[54%] min-w-[180px] shrink-0 flex-col border-r border-line p-5"
            >
              <div
                className="flex-1 rounded-sm border border-line"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(115deg, color-mix(in oklab, var(--k-accent) 16%, transparent) 0 2px, transparent 2px 11px)',
                }}
              />
              <figcaption className="mt-4 flex items-baseline justify-between">
                <span className="text-sm tracking-tight text-fg">{plate.label}</span>
                <span className="meta">{plate.index}</span>
              </figcaption>
            </figure>
          ))}
        </PinnedHorizontalTrack>
      </DragToPinProgress>

      <section className="flex h-full flex-col justify-start p-6">
        <div className="rule" />
        <p className="mt-4 max-w-[32ch] text-sm leading-relaxed text-muted">
          The rail above tracked the pin, not the drag. They are the same number.
        </p>
      </section>
    </div>
  );
}
