'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Finance Dashboard" (boardui.com/templates/finance).
 * No BoardUI source was used.
 */

import { FinanceDashboard } from '@/registry/ui/finance-dashboard';

export default function Demo() {
  return (
    <div className="h-full w-full">
      <FinanceDashboard />
    </div>
  );
}
