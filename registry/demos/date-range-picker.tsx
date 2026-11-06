'use client';

import { useState } from 'react';
import { parseDate } from '@internationalized/date';
import { I18nProvider } from 'react-aria-components';

import { DateRangePicker } from '@/registry/ui/date-range-picker';
import type { DateRangeValue } from '@/registry/ui/date-range-picker';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const count = new Intl.NumberFormat('en-US');

/* Fixed, deterministic daily revenue so the chart is identical on every render. */
function dayRevenue(index: number) {
  return 900 + ((index * 37) % 23) * 41 + ((index * 11) % 7) * 63;
}

/* A revenue toolbar the way a dashboard uses the picker: the trigger sits at
   the right of the header and the tiles below follow the committed range. The
   card hugs the top of a tall frame so the popover opens downward in full. */
export default function Demo() {
  const [range, setRange] = useState<DateRangeValue | null>({
    start: parseDate('2026-03-02'),
    end: parseDate('2026-03-15'),
  });

  const days = range ? range.end.compare(range.start) + 1 : 0;
  const series = Array.from({ length: Math.min(days, 31) }, (_, i) => dayRevenue(i));
  const revenue = series.reduce((sum, v) => sum + v, 0) + Math.max(0, days - 31) * 1100;
  const peak = Math.max(1, ...series);

  // React Aria formats dates and numbers in the browser's language; pin it to
  // en-US so the values match this demo's English copy and the server render.
  return (
    <I18nProvider locale="en-US">
      <div className="flex min-h-[480px] w-full justify-center">
        <div className="h-fit w-full max-w-[860px] rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-body-semibold text-text-primary">Revenue overview</span>
              <span className="text-caption-1-regular text-text-secondary">Online store · all channels</span>
            </div>
            <DateRangePicker aria-label="Reporting period" value={range} onChange={setRange} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: 'Revenue', value: money.format(revenue) },
              { label: 'Orders', value: count.format(days * 37) },
              { label: 'Days in range', value: count.format(days) },
            ].map((tile) => (
              <div key={tile.label} className="rounded-xl bg-background-secondary-default px-3 py-2.5">
                <div className="text-caption-1-regular text-text-secondary">{tile.label}</div>
                <div className="text-title-3-semibold text-text-primary">{tile.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex h-24 items-end gap-1" aria-hidden>
            {series.map((value, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm bg-accent-500/70"
                style={{ height: `${Math.round((value / peak) * 100)}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </I18nProvider>
  );
}
