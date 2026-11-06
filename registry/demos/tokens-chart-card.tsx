'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Tokens Chart Card" (boardui.com/templates/ai-profile).
 * No BoardUI source was used.
 */

import { TokensChartCard } from '@/registry/ui/tokens-chart-card';
import type { TokenPeriod, TokenPoint } from '@/registry/ui/tokens-chart-card';

// Fixed calendar: the series ends on Dec 14, labelled "Today".
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_IN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function labelsEndingDec14(count: number) {
  const out: string[] = [];
  let month = 11;
  let day = 14;
  for (let i = 0; i < count; i++) {
    out.unshift(`${MONTHS[month]} ${day}`);
    day -= 1;
    if (day === 0) {
      month = (month + 11) % 12;
      day = DAYS_IN[month] ?? 30;
    }
  }
  return out;
}

// Last 30 days in millions of tokens; eight idle days early on. Sums to 667.7M.
const LAST_30 = [
  42.1, 36.4, 11.2, 4.8, 0, 0, 0, 0, 0, 0, 0, 0, 44.9, 12.6, 9.8, 8.3, 13.7, 8.1, 7.6, 70.2, 78.4,
  72.9, 48.6, 14.1, 6.9, 25.3, 32.7, 47.5, 37.8, 33.8,
];

// Sixty earlier days from a fixed wave, with two idle stretches.
const EARLIER_60 = Array.from({ length: 60 }, (_, i) => {
  if ((i >= 18 && i <= 23) || (i >= 41 && i <= 43)) return 0;
  const v = 26 + 16 * Math.sin(i * 0.7) + 11 * Math.sin(i * 0.23 + 1);
  return Math.round(Math.max(3, v) * 10) / 10;
});

function toPoints(millions: number[]): TokenPoint[] {
  const labels = labelsEndingDec14(millions.length);
  return millions.map((m, i) => ({ label: labels[i] ?? '', value: Math.round(m * 1_000_000) }));
}

const PERIODS: TokenPeriod[] = [
  { id: '7d', label: '7D', points: toPoints(LAST_30.slice(-7)), trend: -4.3 },
  { id: '30d', label: '30D', points: toPoints(LAST_30), trend: 9.4 },
  { id: '90d', label: '90D', points: toPoints([...EARLIER_60, ...LAST_30]), trend: 31.2 },
];

export default function Demo() {
  return (
    <div className="w-full max-w-[680px]">
      <TokensChartCard periods={PERIODS} defaultPeriod="30d" />
    </div>
  );
}
