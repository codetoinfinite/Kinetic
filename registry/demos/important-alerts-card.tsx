'use client';

import { ImportantAlertsCard } from '@/registry/ui/important-alerts-card';

/* The card as it sits on BoardUI's medical profile dashboard: a narrow column
   on the dashboard surface. The feed is meant to be cut by the bottom edge;
   scroll it to see the header fade come in. */
export default function Demo() {
  return (
    <div className="flex w-full items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-[380px] rounded-[26px] border border-border-table bg-background-primary-default p-2.5 shadow-xs">
        <ImportantAlertsCard />
      </div>
    </div>
  );
}
