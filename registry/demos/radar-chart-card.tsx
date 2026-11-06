'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Radar Chart Card" (boardui.com/components/radar-chart-card).
 * No BoardUI source was used.
 */

import { useState } from 'react';

import { ChartPeriodControl } from '@/registry/ui/line-chart-card-parts';
import { RadarChartCard } from '@/registry/ui/radar-chart-card';
import type { RadarVariant } from '@/registry/ui/radar-chart-card';

const LOOKS: { id: RadarVariant; label: string }[] = [
  { id: 'filled', label: 'Filled' },
  { id: 'dots', label: 'Dots' },
  { id: 'lines', label: 'Lines' },
  { id: 'score', label: 'Score' },
];

/* Hover an axis to read that month in the header; open the "H1 2024" pill to
   switch ranges. The switch above the card changes the look; "Score" adds a
   centre disc that turns rose below 200. */
export default function Demo() {
  const [look, setLook] = useState<RadarVariant>('filled');
  return (
    <div className="flex w-full max-w-[448px] flex-col items-center gap-3">
      <ChartPeriodControl
        options={LOOKS}
        value={look}
        onChange={(id) => setLook(LOOKS.find((l) => l.id === id)?.id ?? 'filled')}
        label="Chart look"
      />
      <RadarChartCard variant={look} className="w-full" />
    </div>
  );
}
