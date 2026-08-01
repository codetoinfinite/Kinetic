'use client';

import { useState } from 'react';
import { ScrubCharColorReveal } from '@/registry/ui/scrub-char-color-reveal';

const COPY =
  'The kiln ran for nine days. We logged the temperature every hour, by hand, in a book that is now warped from the heat of the room it was written in.';

export default function Demo() {
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);

  return (
    <div className="h-full w-full overflow-hidden bg-bg">
      <div
        ref={setScroller}
        className="scrollbar-none h-full w-full overflow-y-auto overscroll-contain"
      >
        <div className="flex h-[70%] min-h-[130px] flex-col justify-between p-5">
          <span className="meta">Notes from the pottery</span>
          <span className="meta">Scroll</span>
        </div>

        <ScrubCharColorReveal
          text={COPY}
          scroller={scroller}
          className="px-5 text-lg leading-relaxed tracking-tight text-fg sm:text-2xl"
        />

        <div className="mt-8 border-t border-line px-5 py-4">
          <span className="meta">Entry 12 — reduction firing</span>
        </div>

        <div className="h-[55%]" />
      </div>
    </div>
  );
}
