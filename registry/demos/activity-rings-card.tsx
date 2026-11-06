'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Activity Rings Card" (boardui.com/components/activity-rings-card).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import { RiRestartLine } from '@remixicon/react';

import { ActivityRingsCard } from '@/registry/ui/activity-rings-card';

export default function Demo() {
  const [run, setRun] = useState(0);
  return (
    <div className="flex w-full max-w-[448px] flex-col items-center gap-3" data-demo>
      <ActivityRingsCard key={run} />
      <button
        type="button"
        onClick={() => setRun((n) => n + 1)}
        className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-border-button-default bg-background-primary-default px-2.5 text-body-medium text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
      >
        <RiRestartLine aria-hidden className="size-4 text-text-secondary" />
        Replay
      </button>
    </div>
  );
}
