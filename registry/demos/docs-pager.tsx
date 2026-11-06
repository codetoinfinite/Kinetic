'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Docs Pager" (boardui.com/components/line-chart-card).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import { DocsPager } from '@/registry/ui/docs-pager';
import type { DocsPagerLink } from '@/registry/ui/docs-pager';

const PAGES: (DocsPagerLink & { id: string; bars: number[] })[] = [
  { id: 'area-chart', title: 'Area Chart Card', description: 'Stacked series over time', bars: [30, 42, 38, 55, 61, 58, 72] },
  { id: 'bar-list', title: 'Bar List', description: 'Ranked horizontal bars', bars: [88, 74, 61, 47, 35, 22, 14] },
  { id: 'heatmap', title: 'Heatmap Chart', description: 'Density grid', bars: [44, 70, 52, 81, 39, 66, 58] },
  { id: 'line-chart', title: 'Line Chart Card', description: 'Trend line with a hover readout', bars: [36, 48, 44, 63, 57, 74, 82] },
  { id: 'most-active', title: 'Most Active Days', description: 'Weekly activity bars', bars: [52, 64, 71, 48, 90, 34, 26] },
  { id: 'sankey', title: 'Sankey Flow', description: 'Flow between stages', bars: [80, 62, 62, 45, 45, 30, 18] },
];

export default function Demo() {
  const [index, setIndex] = useState(3);
  const page = PAGES[index] ?? PAGES[0]!;
  const prev = PAGES[index - 1] ?? null;
  const next = PAGES[index + 1] ?? null;

  return (
    <div
      data-demo
      className="flex w-full max-w-[720px] flex-col gap-6 rounded-3xl border border-border-component-detail-container bg-background-primary-default p-6 sm:p-8"
    >
      <header aria-live="polite" className="flex flex-col gap-1">
        <p className="text-caption-1-medium tracking-[0.04em] text-text-tertiary uppercase">
          Charts · {index + 1} of {PAGES.length}
        </p>
        <h2 className="text-title-2-semibold text-text-primary">{page.title}</h2>
        <p className="text-body-regular text-text-secondary">{page.description}</p>
      </header>

      <div
        aria-hidden
        className="flex h-[150px] items-end gap-2 rounded-2xl bg-background-secondary-default px-5 pt-5 pb-4 sm:h-[180px]"
      >
        {page.bars.map((height, i) => (
          <span
            key={i}
            className="flex-1 rounded-t-md bg-text-primary/80 transition-[height] duration-300 ease-out motion-reduce:transition-none"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>

      <div className="border-t border-separator-border pt-6">
        <DocsPager prev={prev} next={next} onNavigate={(direction) => setIndex((i) => (direction === 'prev' ? i - 1 : i + 1))} />
      </div>
    </div>
  );
}
