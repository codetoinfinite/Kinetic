'use client';

import { useRef } from 'react';
import { KnockoutZoomPin } from '@/registry/ui/knockout-zoom-pin';

export default function Demo() {
  const scroller = useRef<HTMLDivElement>(null);

  return (
    <div ref={scroller} className="scrollbar-none h-full w-full overflow-y-auto bg-bg">
      <section className="flex h-full flex-col justify-end p-6">
        <p className="meta">Scroll</p>
        <div className="rule mt-3" />
      </section>

      <KnockoutZoomPin
        scroller={scroller}
        behind={
          <div className="max-w-[30ch]">
            <div className="rule" />
            <p className="mt-3 text-sm leading-relaxed text-muted">
              The word arrives at its resting position at the same moment the
              caption becomes readable, so the section has one ending rather
              than two.
            </p>
          </div>
        }
      >
        MERIDIAN
      </KnockoutZoomPin>

      <section className="flex h-full flex-col justify-start p-6">
        <p className="meta">After</p>
        <p className="mt-3 max-w-[34ch] text-sm leading-relaxed text-muted">
          Scroll back up: the zoom reverses at the same rate it played. Nothing
          replays, because nothing was ever a timeline.
        </p>
      </section>
    </div>
  );
}
