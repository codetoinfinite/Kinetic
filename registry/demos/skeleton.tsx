'use client';

import { useState } from 'react';

import { Avatar } from '@/registry/ui/avatar';
import { Button } from '@/registry/ui/button';
import { Skeleton, SkeletonText } from '@/registry/ui/skeleton';

/* Left: BoardUI's own tile, a card waiting for its content. Right: the same
   card built from real content wrapped in Skeletons, so each block takes the
   exact size of what it stands in for. Toggle it to watch the blocks fade
   while the content sharpens in. */
const BARS = [38, 62, 48, 80, 56, 92, 70];

export default function Demo() {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div className="grid w-full max-w-[600px] grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-2xl border border-border-table bg-background-primary-default p-4" aria-hidden>
          <div className="flex items-center gap-3">
            <Skeleton shape="circle" className="size-9 shrink-0" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton shape="text" className="h-3 w-28" />
              <Skeleton shape="text" className="h-2.5 w-16" />
            </div>
          </div>
          <SkeletonText lines={2} lineClassName="h-3" />
          <Skeleton className="h-16 w-full" />
        </div>

        <section
          aria-busy={!loaded}
          aria-label="Weekly summary"
          className="flex flex-col gap-3 rounded-2xl border border-border-table bg-background-primary-default p-4"
        >
          <div className="flex items-center gap-3">
            <Skeleton shape="circle" isLoaded={loaded} className="size-9 shrink-0">
              <Avatar size="lg" color="blue" initials="LH" />
            </Skeleton>
            <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
              <Skeleton shape="text" isLoaded={loaded} className="w-fit">
                <span className="block text-body-semibold text-text-primary">Lena Hoffmann</span>
              </Skeleton>
              <Skeleton shape="text" isLoaded={loaded} className="w-fit">
                <span className="block text-caption-1-medium text-text-tertiary">Account lead</span>
              </Skeleton>
            </div>
          </div>
          <Skeleton shape="text" isLoaded={loaded}>
            <p className="text-body-regular text-text-secondary">Closed 14 tickets this week, 3 more than last week.</p>
          </Skeleton>
          <Skeleton isLoaded={loaded} className="w-full">
            <div className="flex h-16 items-end gap-1.5 rounded-xl bg-background-secondary-default px-3 pt-3">
              {BARS.map((height, index) => (
                <span
                  key={index}
                  className="flex-1 rounded-t-sm bg-chart-1"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </Skeleton>
        </section>
      </div>

      <Button variant="secondary" size="small" onClick={() => setLoaded((v) => !v)}>
        {loaded ? 'Reset to loading' : 'Load content'}
      </Button>
    </div>
  );
}
