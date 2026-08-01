'use client';

import { useState } from 'react';
import { ConvergingScrubWords } from '@/registry/ui/converging-scrub-words';

export default function Demo() {
  // Element rather than a ref object: the effect inside the component keys on
  // the scroller, so it has to re-run once the node exists.
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);

  return (
    <div className="h-full w-full overflow-hidden bg-bg">
      <div
        ref={setScroller}
        className="scrollbar-none h-full w-full overflow-y-auto overscroll-contain"
      >
        <div className="flex h-[86%] min-h-[150px] flex-col justify-between p-5">
          <span className="meta">Chapter two</span>
          <span className="meta">Scroll</span>
        </div>

        <ConvergingScrubWords
          words={['Between', 'Signals']}
          scroller={scroller}
          className="px-5 text-4xl sm:text-5xl"
        />

        <div className="px-5 pb-5 pt-6">
          <p className="max-w-[42ch] text-sm leading-relaxed text-muted">
            Two words crossing the frame in opposite directions, tied to the
            scrollbar with no easing of their own, landing together.
          </p>
        </div>

        <div className="h-[45%]" />
      </div>
    </div>
  );
}
