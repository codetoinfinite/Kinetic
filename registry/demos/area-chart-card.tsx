'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Area Chart Card" (boardui.com/components/area-chart-card).
 * No BoardUI source was used.
 */

import { AreaChartCard } from '@/registry/ui/area-chart-card';

/* Stacked visitors by channel. Switch This year / Last year to swap the data,
   then hover a month: the tooltip splits it by channel and the headline and
   tiles follow the pointer. */
export default function Demo() {
  return (
    <div className="w-full max-w-[576px]">
      <AreaChartCard />
    </div>
  );
}
