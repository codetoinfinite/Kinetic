'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Earnings Chart Card" (boardui.com/components/earnings-chart-card).
 * No BoardUI source was used.
 */

import { EarningsChartCard } from '@/registry/ui/earnings-chart-card';

/* The newest bar is the current week and drives the headline. Hover any bar to
   ring its track and read it in the headline; switch Weekly / Monthly / Yearly
   to swap the data set. */
export default function Demo() {
  return (
    <div className="w-full max-w-[640px]">
      <EarningsChartCard />
    </div>
  );
}
