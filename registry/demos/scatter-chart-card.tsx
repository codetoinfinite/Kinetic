'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Scatter Chart Card" (boardui.com/components/scatter-chart-card).
 * No BoardUI source was used.
 */

import { SCATTER_SERIES, ScatterChartCard, type ScatterRange, type ScatterSeries } from '@/registry/ui/scatter-chart-card';

/* The other periods are the quarter's accounts reshaped by a fixed formula:
   fewer sessions and less revenue over a month, more over a year. */
function reshape(base: ScatterSeries[], xScale: number, yScale: number, phase: number): ScatterSeries[] {
  return base.map((s, si) => ({
    ...s,
    points: s.points.map((p, pi) => {
      const wobble = 1 + 0.08 * Math.sin((si * 7 + pi) * 1.7 + phase);
      return {
        ...p,
        x: Math.round(p.x * xScale * wobble),
        y: Math.round(p.y * yScale * wobble),
      };
    }),
  }));
}

const RANGES: ScatterRange[] = [
  { id: 'month', label: 'This month', series: reshape(SCATTER_SERIES, 0.42, 0.36, 0.4), change: -2.4 },
  { id: 'quarter', label: 'This quarter', series: SCATTER_SERIES, change: 6.8 },
  { id: 'year', label: 'This year', series: reshape(SCATTER_SERIES, 3.6, 3.9, 1.3), change: 18.2 },
];

/* The card at the width BoardUI previews it. Hover a dot (or focus the plot and
   use the arrow keys): the headline names the account and its revenue, the
   other plans dim, and a readout floats over the dot. The period pill swaps the
   dataset. */
export default function Demo() {
  return (
    <div className="w-full max-w-[576px]" data-demo>
      <ScatterChartCard ranges={RANGES} defaultRange="quarter" />
    </div>
  );
}
