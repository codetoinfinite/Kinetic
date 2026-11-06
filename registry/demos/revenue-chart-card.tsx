'use client';

import { RevenueChartCard } from '@/registry/ui/revenue-chart-card';

/* The card at the width BoardUI previews it. Hover along the line: the ringed
   dot and the dashed cursor follow the month, and the headline counts to that
   month's revenue against the same month a year earlier. */
export default function Demo() {
  return (
    <div className="w-full max-w-[560px]">
      <RevenueChartCard />
    </div>
  );
}
