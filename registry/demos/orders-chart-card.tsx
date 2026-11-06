'use client';

import { OrdersChartCard } from '@/registry/ui/orders-chart-card';

/* The card at the width BoardUI previews it. Sweep the pointer across the
   bars: the header follows the hovered month and counts to its figure, then
   returns to the year total when the pointer leaves the chart. */
export default function Demo() {
  return (
    <div className="w-full max-w-[560px]">
      <OrdersChartCard />
    </div>
  );
}
