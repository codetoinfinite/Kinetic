'use client';

import { useRef } from 'react';
import { ConvergingFlowSteps } from '@/registry/ui/converging-flow-steps';

const STEPS = [
  { kicker: '01', title: 'Audit', body: 'Everything printed in the last decade, on one table.' },
  { kicker: '02', title: 'Draw', body: 'One grid, two weights, eleven route marks.' },
  { kicker: '03', title: 'Ship', body: 'Timetable, signage and tickets in a single season.' },
];

export default function Demo() {
  const scroller = useRef<HTMLDivElement>(null);

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <div
        ref={scroller}
        className="scrollbar-none h-full w-full overflow-y-auto overscroll-contain"
      >
        <div className="flex h-[80%] min-h-[150px] items-end px-5 pb-6">
          <div>
            <p className="meta">How we work</p>
            <h2 className="mt-2 max-w-[18ch] text-lg leading-tight tracking-tight text-fg">
              Three phases, one season, no re-brief.
            </h2>
          </div>
        </div>

        <ConvergingFlowSteps steps={STEPS} scrollerRef={scroller} className="mx-5" />

        <p className="mx-5 mt-6 max-w-[36ch] text-xs leading-relaxed text-muted">
          The outer cards close toward the middle. The arrows only appear once they are already
          moving, which is what makes the row read as a sequence rather than three boxes.
        </p>

        <div className="h-28" />
      </div>
    </div>
  );
}
