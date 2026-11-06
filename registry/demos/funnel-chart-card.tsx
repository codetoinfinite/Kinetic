'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Funnel Chart Card" (boardui.com/components/funnel-chart-card).
 * No BoardUI source was used.
 */

import { useState } from 'react';

import { FunnelChartCard, type FunnelShape } from '@/registry/ui/funnel-chart-card';
import { SegmentedControl, SegmentedControlItem } from '@/registry/ui/segmented-control';
import { Switch } from '@/registry/ui/switch';

/* The sign-up funnel at the width BoardUI previews it. Hover or tab across the
   stages: the rest dim and the headline swaps to that stage's count and its
   step conversion. Click a stage to pin it (handy on touch). Change the period
   and the bands re-grow; the controls above switch shape and single-ink. */
export default function Demo() {
  const [shape, setShape] = useState<FunnelShape>('curved');
  const [mono, setMono] = useState(false);

  return (
    <div className="flex w-full max-w-[672px] flex-col gap-3" data-demo>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          aria-label="Funnel shape"
          selectedKeys={[shape]}
          onSelectionChange={(keys) => {
            const next = (['curved', 'sharp'] as const).find((s) => keys.has(s));
            if (next) setShape(next);
          }}
        >
          <SegmentedControlItem id="curved">Curved</SegmentedControlItem>
          <SegmentedControlItem id="sharp">Sharp</SegmentedControlItem>
        </SegmentedControl>
        <Switch size="sm" isSelected={mono} onChange={setMono}>
          Mono
        </Switch>
      </div>
      <FunnelChartCard shape={shape} mono={mono} />
    </div>
  );
}
