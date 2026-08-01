'use client';

import { useRef } from 'react';
import { ScrubTimelineSpine } from '@/registry/ui/scrub-timeline-spine';

const ENTRIES = [
  { label: '2016', title: 'Two desks above a chandlery', body: 'Letterpress work for the harbour trust.' },
  { label: '2018', title: 'First timetable', body: 'Eleven routes, one fold, no colour.' },
  { label: '2020', title: 'Meridian begins', body: 'A grotesque drawn for signage at 8mm.' },
  { label: '2022', title: 'Moved to the old net loft' },
  { label: '2024', title: 'Northline, end to end', body: 'Identity, wayfinding, tickets, one season.' },
];

export default function Demo() {
  const scroller = useRef<HTMLDivElement>(null);

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <div
        ref={scroller}
        className="scrollbar-none h-full w-full overflow-y-auto overscroll-contain"
      >
        <div className="px-5 py-6">
          <p className="meta">History</p>
          <h2 className="mt-2 max-w-[18ch] text-lg leading-tight tracking-tight text-fg">
            Eight years, told down a single rule.
          </h2>
        </div>

        <ScrubTimelineSpine entries={ENTRIES} scrollerRef={scroller} className="mx-5 pb-6" />

        <div className="h-24" />
      </div>
    </div>
  );
}
