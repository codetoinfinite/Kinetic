'use client';

import { useState } from 'react';
import { FontSafeTextSplit } from '@/registry/ui/font-safe-text-split';

export default function Demo() {
  // Element, not a ref object: the split effect keys on the scroller, so it has
  // to re-run once the node exists.
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);

  return (
    <div className="h-full w-full overflow-hidden bg-bg">
      <div
        ref={setScroller}
        className="scrollbar-none h-full w-full overflow-y-auto overscroll-contain"
      >
        <div className="flex h-[62%] min-h-[120px] flex-col justify-between p-5">
          <span className="meta">Cold cache, narrow measure</span>
          <span className="meta">Scroll</span>
        </div>

        {/* A narrow measure is the honest test: more line breaks means more
            chances for a fallback-face measurement to land in the wrong place,
            and resizing the frame re-splits on width alone. */}
        <FontSafeTextSplit
          scroller={scroller}
          className="max-w-[34ch] px-5 text-xl leading-[1.35] tracking-tight text-fg sm:text-3xl"
        >
          The fallback face is wider. Measure the lines before the real font
          lands and every wrapper ends up describing a layout that no longer
          exists.
        </FontSafeTextSplit>

        <div className="mt-8 flex items-baseline justify-between border-t border-line px-5 py-4">
          <span className="meta">fonts.ready + loadingdone</span>
          <span className="meta">Re-split on width</span>
        </div>

        <div className="h-[45%]" />
      </div>
    </div>
  );
}
