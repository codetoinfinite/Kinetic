'use client';

import { RiHomeLine } from '@remixicon/react';

import { AppShell } from '@/registry/ui/app-shell';
import { DataTableExample } from '@/registry/ui/data-table';
import { OrdersChartCard } from '@/registry/ui/orders-chart-card';
import { RevenueChartCard } from '@/registry/ui/revenue-chart-card';
import { StatCards } from '@/registry/ui/stat-cards';

/** Stat cards, the two chart cards side by side, then the customers table. */
export default function ChatStarterDashboardPage() {
  return (
    <AppShell title="Dashboard" heading="Welcome Jordan" icon={RiHomeLine}>
      <StatCards variant="footer" />

      <div className="flex w-full flex-col items-stretch gap-4 xl:flex-row">
        <RevenueChartCard />
        <OrdersChartCard />
      </div>

      <DataTableExample />
    </AppShell>
  );
}
