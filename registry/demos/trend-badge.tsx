'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Trend Badge" (boardui.com/templates/dashboard).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import { RiAddLine, RiSubtractLine } from '@remixicon/react';
import { TrendBadge, type TrendBadgeSize } from '@/registry/ui/trend-badge';
import { Button } from '@/registry/ui/button';

const KPIS = [
  { label: 'Customers', value: '14,592', change: 5.3, decimals: 1 },
  { label: 'Units sold', value: '385', change: -2.1, decimals: 1 },
  { label: 'Orders', value: '1,394', change: 0, decimals: 2 },
] as const;

const SIZES: readonly TrendBadgeSize[] = ['sm', 'md', 'lg'];
const SAMPLES = [12.4, -3.8, 0] as const;

export default function Demo() {
  // Conversion rate change, stepped by 0.5 points so it crosses zero.
  const [change, setChange] = useState(1);
  const step = (delta: number) => setChange((c) => Math.max(-5, Math.min(5, Math.round((c + delta) * 10) / 10)));

  return (
    <div className="flex w-full max-w-[1000px] flex-col gap-3" data-demo>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {KPIS.map((kpi) => (
          <div key={kpi.label} className="flex flex-col gap-2 rounded-3xl border border-border-table bg-background-full p-5">
            <p className="text-body-medium text-text-tertiary">{kpi.label}</p>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-title-1-medium text-text-primary tabular-nums">{kpi.value}</p>
              <TrendBadge value={kpi.change} decimals={kpi.decimals} size="lg" icon={false} context="vs last month" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-4 rounded-3xl border border-border-table bg-background-full p-5">
          <p className="text-body-medium text-text-tertiary">Sizes</p>
          <div className="flex flex-col gap-3">
            {SIZES.map((size) => (
              <div key={size} data-size-row={size} className="flex flex-wrap items-center gap-2">
                <span className="w-8 text-caption-1-medium text-text-tertiary">{size}</span>
                {SAMPLES.map((v) => (
                  <TrendBadge key={v} value={v} size={size} />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-3xl border border-border-table bg-background-full p-5">
          <div className="flex flex-col gap-2">
            <p className="text-body-medium text-text-tertiary">Conversion rate</p>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-title-1-medium text-text-primary tabular-nums">3.42%</p>
              <span data-live-badge>
                <TrendBadge value={change} size="lg" context="vs last week" />
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="small"
              iconOnly
              leadingIcon={RiSubtractLine}
              aria-label="Decrease change by 0.5"
              onClick={() => step(-0.5)}
            />
            <Button
              variant="secondary"
              size="small"
              iconOnly
              leadingIcon={RiAddLine}
              aria-label="Increase change by 0.5"
              onClick={() => step(0.5)}
            />
            <span className="text-caption-1-regular text-text-tertiary">Step through zero to turn the arrow.</span>
          </div>
          <div className="flex flex-col gap-2 border-t border-border-table pt-4">
            <p className="text-body-medium text-text-tertiary">Churn (invert: down is good)</p>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-title-1-medium text-text-primary tabular-nums">2.4%</p>
              <span data-invert-badge>
                <TrendBadge value={-0.6} invert size="lg" context="vs last month" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
