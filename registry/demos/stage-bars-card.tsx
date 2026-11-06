'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Stage Bars Card" (boardui.com/components/stage-bars-card).
 * No BoardUI source was used.
 */

import { useState } from 'react';

import { StageBarsCard } from '@/registry/ui/stage-bars-card';
import { SegmentedControl, SegmentedControlItem } from '@/registry/ui/segmented-control';
import { Switch } from '@/registry/ui/switch';

/* A product pipeline as stage pills. Hover or tab across the stages: the rest
   fade and the headline follows. "By channel" splits every pill into Organic,
   Paid and Referral; hover a part, or press the arrow keys on a focused stage,
   to read that part. Change the period and the pills grow to the new shares. */
export default function Demo() {
  const [view, setView] = useState<'total' | 'channel'>('total');
  const [mono, setMono] = useState(false);

  return (
    <div className="flex w-full max-w-[560px] flex-col gap-3" data-demo>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          aria-label="Bars"
          selectedKeys={[view]}
          onSelectionChange={(keys) => {
            const next = (['total', 'channel'] as const).find((k) => keys.has(k));
            if (next) setView(next);
          }}
        >
          <SegmentedControlItem id="total">Total</SegmentedControlItem>
          <SegmentedControlItem id="channel">By channel</SegmentedControlItem>
        </SegmentedControl>
        <Switch size="sm" isSelected={mono} onChange={setMono}>
          Mono
        </Switch>
      </div>
      <StageBarsCard stacked={view === 'channel'} mono={mono} />
    </div>
  );
}
