'use client';

import { useRef } from 'react';
import { DualDirectionScrubEntrance } from '@/registry/ui/dual-direction-scrub-entrance';

export default function Demo() {
  const scroller = useRef<HTMLDivElement>(null);

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <div
        ref={scroller}
        className="scrollbar-none h-full w-full overflow-y-auto overscroll-contain"
      >
        <div className="flex h-[85%] min-h-[160px] items-end px-6 pb-8">
          <p className="meta">Keep scrolling</p>
        </div>

        <DualDirectionScrubEntrance
          scrollerRef={scroller}
          className="px-6 py-10"
          primary={
            <>
              <p className="meta">About</p>
              <h2 className="mt-3 max-w-[16ch] text-xl leading-tight tracking-tight text-fg">
                A studio of four, working mostly in print.
              </h2>
              <p className="mt-3 max-w-[32ch] text-sm leading-relaxed text-muted">
                We take on six projects a year. The rest of the time is spent drawing type nobody
                asked for.
              </p>
            </>
          }
          secondary={
            <div className="rounded-md border border-line bg-surface p-4">
              <div
                className="h-24 rounded-sm border border-line"
                style={{
                  backgroundImage:
                    'linear-gradient(160deg, color-mix(in oklab, var(--color-accent) 32%, transparent), transparent 70%)',
                }}
              />
              <p className="meta mt-3">Notepad</p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">
                Ongoing: a specimen for the Meridian family, drawn between jobs since 2021.
              </p>
            </div>
          }
        />

        <DualDirectionScrubEntrance
          scrollerRef={scroller}
          from="left"
          className="border-t border-line px-6 py-10"
          primary={
            <>
              <p className="meta">Contact</p>
              <h2 className="mt-3 max-w-[16ch] text-xl leading-tight tracking-tight text-fg">
                Enquiries answered on Thursdays.
              </h2>
            </>
          }
          secondary={
            <div className="rounded-md border border-line bg-surface p-4 text-xs leading-relaxed text-muted">
              The second block enters from the other side, and swaps column order so it never
              crosses the copy on its way in.
            </div>
          }
        />

        <div className="h-24" />
      </div>
    </div>
  );
}
