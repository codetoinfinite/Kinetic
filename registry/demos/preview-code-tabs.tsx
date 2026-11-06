'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Preview Code Tabs" (boardui.com/components/line-chart-card).
 * No BoardUI source was used.
 */

import { useMemo, useState } from 'react';
import type { Key } from 'react-aria-components';

import { CopyButton } from '@/registry/ui/code-block-copy';
import { PreviewCodeTabs } from '@/registry/ui/preview-code-tabs';
import type { PreviewCodeTab } from '@/registry/ui/preview-code-tabs';
import { SegmentedControl, SegmentedControlItem } from '@/registry/ui/segmented-control';

type Shape = 'smooth' | 'sharp';

const REVENUE = [14, 18, 16, 23, 21, 30, 27, 34, 31, 41, 38, 46];
const W = 320;
const H = 120;
const PAD = 8;

function firstKey(keys: Set<Key>): Key | undefined {
  for (const key of keys) return key;
  return undefined;
}

/** Points in SVG space: x spread evenly, y scaled to the data range. */
function points(values: number[]): [number, number][] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const step = (W - PAD * 2) / (values.length - 1);
  return values.map((v, i) => [PAD + i * step, H - PAD - ((v - min) / (max - min)) * (H - PAD * 2)]);
}

function linePath(pts: [number, number][], shape: Shape): string {
  if (shape === 'sharp') return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  // Smooth: cubic segments whose control points sit halfway along x.
  return pts
    .map(([x, y], i) => {
      if (i === 0) return `M${x.toFixed(1)} ${y.toFixed(1)}`;
      const [px, py] = pts[i - 1] ?? [x, y];
      const mx = (px + x) / 2;
      return `C${mx.toFixed(1)} ${py.toFixed(1)} ${mx.toFixed(1)} ${y.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

export default function Demo() {
  const [shape, setShape] = useState<Shape>('smooth');
  const [tab, setTab] = useState<PreviewCodeTab>('preview');

  const pts = useMemo(() => points(REVENUE), []);
  const line = linePath(pts, shape);
  const area = `${line} L${W - PAD} ${H} L${PAD} ${H} Z`;
  const code = `<LineChartCard
  title="Revenue"
  value="$48,210"
  data={revenue}
  shape="${shape}"
/>`;

  return (
    <div className="flex w-full max-w-[760px] flex-col gap-2" data-demo>
      <PreviewCodeTabs
        code={code}
        filename="usage"
        selectedTab={tab}
        onSelectedTabChange={setTab}
        minHeight={340}
        actions={<CopyButton value={code} label="Copy usage" />}
      >
        <div className="flex w-full max-w-[380px] flex-col gap-4 rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-body-medium text-text-secondary">Revenue</span>
              <span className="text-title-1-semibold text-text-primary">$48,210</span>
            </div>
            <SegmentedControl
              aria-label="Line shape"
              selectedKeys={[shape]}
              onSelectionChange={(keys) => {
                const next = firstKey(keys);
                if (next === 'smooth' || next === 'sharp') setShape(next);
              }}
            >
              <SegmentedControlItem id="smooth">Smooth</SegmentedControlItem>
              <SegmentedControlItem id="sharp">Sharp</SegmentedControlItem>
            </SegmentedControl>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full text-chart-1" role="img" aria-label={`Revenue trend, ${shape} line`}>
            {[0.25, 0.5, 0.75].map((f) => (
              <line key={f} x1={0} x2={W} y1={H * f} y2={H * f} className="text-chart-track" stroke="currentColor" strokeDasharray="3 4" />
            ))}
            <path d={area} fill="currentColor" opacity={0.12} />
            <path d={line} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </PreviewCodeTabs>
      <p className="text-caption-1-regular text-text-tertiary" aria-live="polite">
        {tab === 'preview' ? 'Pick a line shape, then open the Code tab to see the matching prop.' : `Showing the source for shape="${shape}".`}
      </p>
    </div>
  );
}
