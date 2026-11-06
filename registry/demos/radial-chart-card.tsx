'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Radial Chart Card" (boardui.com/components/radial-chart-card).
 * No BoardUI source was used.
 */

import { useState } from 'react';

import { RadialChartCard, type RadialVariant } from '@/registry/ui/radial-chart-card';
import { SegmentedControl, SegmentedControlItem } from '@/registry/ui/segmented-control';

const LOOKS: readonly { id: RadialVariant; label: string }[] = [
  { id: 'rings', label: 'Rings' },
  { id: 'labels', label: 'Labels' },
  { id: 'grid', label: 'Grid' },
  { id: 'gauge', label: 'Gauge' },
];

/* Visitors by browser as concentric rings. Hover or tab across the rings (or
   the tiles): the rest fall back, a tooltip sits on the arc's tip and the
   headline counts to that browser. Click a ring to pin it. Switch the look,
   or the period, and the arcs sweep to their new lengths. */
export default function Demo() {
  const [variant, setVariant] = useState<RadialVariant>('rings');

  return (
    <div className="flex w-full max-w-[448px] flex-col gap-3" data-demo>
      <SegmentedControl
        aria-label="Chart look"
        selectedKeys={[variant]}
        onSelectionChange={(keys) => {
          const next = LOOKS.find((look) => keys.has(look.id));
          if (next) setVariant(next.id);
        }}
      >
        {LOOKS.map((look) => (
          <SegmentedControlItem key={look.id} id={look.id}>
            {look.label}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>
      <RadialChartCard variant={variant} />
    </div>
  );
}
