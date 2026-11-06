'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Legend Stat Tiles" (boardui.com/templates/dashboard).
 * No BoardUI source was used.
 */

import { LegendStatTiles } from '@/registry/ui/legend-stat-tiles';
import type { LegendSegment } from '@/registry/ui/legend-stat-tiles';

const SESSIONS: LegendSegment[] = [
  { id: 'organic', label: 'Organic search', value: 18_420, color: 'chart-6' },
  { id: 'direct', label: 'Direct', value: 9_310, color: 'chart-2' },
  { id: 'social', label: 'Social', value: 6_085, color: 'chart-3' },
  { id: 'referral', label: 'Referral', value: 3_942, color: 'chart-5' },
];

/* Hover a tile to spotlight its slice of the bar; click a tile to take it
   out of the total (the bar, the headline and the percents all rebalance). */
export default function Demo() {
  return (
    <div className="flex w-full justify-center">
      <LegendStatTiles
        className="max-w-[720px]"
        title="Sessions this month"
        change={0.148}
        segments={SESSIONS}
      />
    </div>
  );
}
