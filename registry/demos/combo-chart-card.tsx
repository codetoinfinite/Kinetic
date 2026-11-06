'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Combo Chart Card" (boardui.com/components/combo-chart-card).
 * No BoardUI source was used.
 */

import { ComboChartCard } from '@/registry/ui/combo-chart-card';

/* Sessions as bars on the left axis, conversion rate as a line on the right.
   Hover a month to darken its bar and dim the others; open the "This year"
   pill to switch the data set. */
export default function Demo() {
  return (
    <div className="w-full max-w-[576px]">
      <ComboChartCard />
    </div>
  );
}
