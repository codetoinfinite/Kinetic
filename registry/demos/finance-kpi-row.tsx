'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Finance KPI Row" (boardui.com/templates/finance).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import { RiBankCardLine, RiHandCoinLine, RiSafe2Line, RiWallet3Line } from '@remixicon/react';
import { FinanceKpiRow } from '@/registry/ui/finance-kpi-row';
import type { FinanceKpi } from '@/registry/ui/finance-kpi-row';

const KPIS: FinanceKpi[] = [
  {
    id: 'balance',
    label: 'Total balance',
    value: 84_230,
    change: 0.032,
    icon: RiWallet3Line,
    trend: [76_400, 77_900, 77_100, 79_300, 80_200, 79_600, 81_800, 82_900, 81_600, 84_230],
  },
  {
    id: 'income',
    label: 'Income',
    value: 18_420,
    change: 0.061,
    icon: RiHandCoinLine,
    trend: [15_200, 16_100, 15_800, 16_900, 16_400, 17_300, 17_100, 17_900, 18_100, 18_420],
  },
  {
    id: 'expenses',
    label: 'Expenses',
    value: 9_140,
    change: 0.024,
    goodDirection: 'down',
    icon: RiBankCardLine,
    trend: [8_300, 8_650, 8_420, 8_900, 8_710, 9_020, 8_860, 9_310, 8_980, 9_140],
  },
  {
    id: 'savings',
    label: 'Savings',
    value: 32_400,
    change: 0.084,
    icon: RiSafe2Line,
    trend: [24_800, 25_900, 26_400, 27_100, 28_300, 28_900, 29_800, 30_600, 31_500, 32_400],
  },
];

/* Click a card to pick the metric a chart below would plot. Expenses rising
   counts as bad news, so its chip and sparkline turn rose. */
export default function Demo() {
  const [metric, setMetric] = useState('balance');
  const picked = KPIS.find((k) => k.id === metric);
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <FinanceKpiRow
        className="max-w-[1100px]"
        items={KPIS}
        selectable
        selectedId={metric}
        onSelectionChange={setMetric}
      />
      <p className="text-body-regular text-text-tertiary" aria-live="polite" data-demo="picked">
        Charting <span className="text-text-primary">{picked?.label}</span> for the last 10 months
      </p>
    </div>
  );
}
