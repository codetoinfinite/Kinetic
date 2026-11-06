'use client';

import { useState } from 'react';
import type { Key } from 'react-aria-components';

import { SegmentedControl, SegmentedControlItem } from '@/registry/ui/segmented-control';

type Period = 'weekly' | 'monthly' | 'yearly';

const DATA: Record<Period, { range: string; total: string; delta: string; labels: string[]; bars: number[] }> = {
  weekly: {
    range: 'Mar 16 to Mar 22',
    total: '$18,420',
    delta: '+6.2%',
    labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    bars: [58, 72, 64, 81, 92, 46, 38],
  },
  monthly: {
    range: 'March 2026',
    total: '$74,910',
    delta: '+11.8%',
    labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'],
    bars: [61, 70, 66, 88],
  },
  yearly: {
    range: 'Apr 2025 to Mar 2026',
    total: '$812,300',
    delta: '+24.5%',
    labels: ['A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D', 'J', 'F', 'M'],
    bars: [44, 49, 52, 50, 57, 61, 66, 72, 84, 63, 70, 79],
  },
};

const firstKey = (keys: Set<Key>) => keys.values().next().value;

/* The Weekly / Monthly / Yearly switch from BoardUI's dashboard, driving a
   revenue card; under it, the plain variant as a view switcher with one
   segment disabled. */
export default function Demo() {
  const [period, setPeriod] = useState<Period>('weekly');
  const [view, setView] = useState<Key>('list');
  const data = DATA[period];

  return (
    <div className="flex w-full max-w-[440px] flex-col gap-4">
      <section className="flex flex-col gap-4 rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-body-semibold text-text-primary">Revenue</span>
            <span className="text-caption-1-regular text-text-tertiary">{data.range}</span>
          </div>
          <SegmentedControl
            aria-label="Period"
            selectedKeys={[period]}
            onSelectionChange={(keys) => {
              const next = firstKey(keys);
              if (next === 'weekly' || next === 'monthly' || next === 'yearly') setPeriod(next);
            }}
          >
            <SegmentedControlItem id="weekly">Weekly</SegmentedControlItem>
            <SegmentedControlItem id="monthly">Monthly</SegmentedControlItem>
            <SegmentedControlItem id="yearly">Yearly</SegmentedControlItem>
          </SegmentedControl>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-title-2-semibold text-text-primary">{data.total}</span>
          <span className="text-body-2-medium text-text-secondary">{data.delta} vs previous</span>
        </div>

        <div className="flex h-[120px] items-end gap-1.5" aria-hidden>
          {data.bars.map((height, index) => (
            <div key={`${period}-${index}`} className="flex h-full flex-1 flex-col justify-end gap-1.5">
              <div
                className="w-full rounded-md bg-accent-500/70 transition-[height] duration-300"
                style={{ height: `${height}%` }}
              />
              <span className="text-center text-caption-2-regular text-text-tertiary">{data.labels[index]}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <span className="text-body-2-regular text-text-secondary">Show tasks as</span>
        <SegmentedControl
          variant="plain"
          aria-label="View"
          selectedKeys={[view]}
          onSelectionChange={(keys) => {
            const next = firstKey(keys);
            if (next !== undefined) setView(next);
          }}
        >
          <SegmentedControlItem id="list">List</SegmentedControlItem>
          <SegmentedControlItem id="board">Board</SegmentedControlItem>
          <SegmentedControlItem id="timeline" isDisabled>
            Timeline
          </SegmentedControlItem>
        </SegmentedControl>
      </div>
    </div>
  );
}
