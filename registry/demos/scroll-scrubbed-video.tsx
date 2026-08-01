'use client';

import { useRef } from 'react';
import { ScrollScrubbedVideo } from '@/registry/ui/scroll-scrubbed-video';

export default function Demo() {
  const scroller = useRef<HTMLDivElement>(null);

  return (
    <div ref={scroller} className="scrollbar-none h-full w-full overflow-y-auto bg-bg">
      <section className="flex h-full items-end p-6">
        <p className="meta">Scroll to scrub</p>
      </section>

      <ScrollScrubbedVideo scroller={scroller} viewports={2} frames={96}>
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6">
          <p className="meta">Frames drawn on demand</p>
          {/* The scrubber reads the smoothed value straight off the section as
              an inherited custom property — continuous, while the frame index
              behind it changes in steps. */}
          <div className="h-px w-full bg-line">
            <div
              className="h-full origin-left bg-accent"
              style={{ transform: 'scaleX(var(--scrub-progress, 0))' }}
            />
          </div>
        </div>
      </ScrollScrubbedVideo>

      <section className="flex h-full items-start p-6">
        <p className="max-w-[34ch] text-sm leading-relaxed text-muted">
          Stop scrolling and the loop unsubscribes within a few frames. Scroll
          again and it wakes. Nothing runs over a still image.
        </p>
      </section>
    </div>
  );
}
