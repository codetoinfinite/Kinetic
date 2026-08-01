'use client';

import { useRef } from 'react';
import { ThrottledScrubState } from '@/registry/ui/throttled-scrub-state';

export default function Demo() {
  const scroller = useRef<HTMLDivElement>(null);

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <div
        ref={scroller}
        className="scrollbar-none h-full w-full overflow-y-auto overscroll-contain px-5 py-6"
      >
        <p className="meta">Instrumentation</p>
        <h2 className="mt-2 max-w-[22ch] text-lg leading-tight tracking-tight text-fg">
          Two counters. One climbs on every frame, one only when it earns it.
        </h2>

        <div className="h-[55vh]" />

        <ThrottledScrubState scrollerRef={scroller} className="rounded-md border border-line p-4">
          {({ progress, commits, ticks }) => (
            <>
              <div className="flex items-baseline justify-between">
                <span className="meta">Progress</span>
                <span className="font-mono text-2xl tabular-nums leading-none text-fg">
                  {Math.round(progress * 100)}%
                </span>
              </div>

              <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-surface">
                {/* No CSS transition: the bar should show the discrete steps
                    the gate produces, not smooth them back out again. */}
                <div className="h-full bg-accent" style={{ width: `${progress * 100}%` }} />
              </div>

              <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-3">
                <div>
                  <dt className="meta">Ticks</dt>
                  <dd className="font-mono text-sm tabular-nums text-muted">{ticks}</dd>
                </div>
                <div>
                  <dt className="meta">Renders</dt>
                  <dd className="font-mono text-sm tabular-nums text-fg">{commits}</dd>
                </div>
                <div>
                  <dt className="meta">Saved</dt>
                  <dd className="font-mono text-sm tabular-nums text-muted">
                    {ticks === 0 ? '—' : `${Math.round((1 - commits / ticks) * 100)}%`}
                  </dd>
                </div>
              </dl>
            </>
          )}
        </ThrottledScrubState>

        <div className="h-[70vh]" />

        <p className="meta pb-6">End of range — the readout must show 100%.</p>
      </div>
    </div>
  );
}
