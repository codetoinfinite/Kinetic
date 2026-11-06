'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Line Chart Card" (boardui.com/components/line-chart-card).
 * No BoardUI source was used.
 */

import { LineChartCard } from '@/registry/ui/line-chart-card';

/* The card at the width BoardUI previews it. Switch Weekly / Monthly / Yearly to
   swap the data set, then sweep along the chart: the tooltip lists revenue and
   costs, both lines get a pinging dot and the headline counts to that point. */
export default function Demo() {
  return (
    <div className="w-full max-w-[576px]">
      <LineChartCard />
    </div>
  );
}
