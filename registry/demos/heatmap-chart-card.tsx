'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Heatmap Chart Card" (boardui.com/components/heatmap-chart-card).
 * No BoardUI source was used.
 */

import { HeatmapChartCard, type HeatmapRange } from '@/registry/ui/heatmap-chart-card';

const REGIONS: HeatmapRange[] = [
  {
    id: 'h1',
    label: 'H1 2024',
    columns: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    rows: [
      { label: 'EMEA', values: [42, 48, 55, 61, 70, 74] },
      { label: 'AMER', values: [38, 40, 47, 52, 58, 66] },
      { label: 'APAC', values: [21, 25, 29, 36, 41, 49] },
      { label: 'LATAM', values: [12, 14, 15, 19, 24, 27] },
    ],
    max: 80,
    change: 11.8,
  },
  {
    id: 'h2',
    label: 'H2 2024',
    columns: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    rows: [
      { label: 'EMEA', values: [71, 66, 73, 78, 80, 76] },
      { label: 'AMER', values: [64, 61, 68, 72, 79, 77] },
      { label: 'APAC', values: [50, 47, 53, 58, 62, 65] },
      { label: 'LATAM', values: [26, 25, 29, 31, 34, 33] },
    ],
    max: 80,
    change: 6.4,
  },
];

export default function Demo() {
  return (
    <div className="flex w-full flex-wrap items-start justify-center gap-4" data-demo>
      <div className="w-full max-w-[460px]" data-card="hours">
        <HeatmapChartCard />
      </div>
      <div className="hidden w-full max-w-[460px] sm:block" data-card="regions">
        <HeatmapChartCard title="Revenue by region" color="var(--color-chart-7)" ranges={REGIONS} />
      </div>
    </div>
  );
}
