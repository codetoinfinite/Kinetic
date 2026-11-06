'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Props Table" (boardui.com/components/line-chart-card).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import { PropsTable } from '@/registry/ui/props-table';
import type { PropsTableRow } from '@/registry/ui/props-table';
import { SegmentedControl, SegmentedControlItem } from '@/registry/ui/segmented-control';

type ApiKey = 'card' | 'tooltip';
type Width = 'auto' | 'narrow';

const APIS: Record<ApiKey, { label: string; intro: string; rows: PropsTableRow[] }> = {
  card: {
    label: 'LineChartCard',
    intro: 'Every prop is optional; the card renders the dashboard revenue series out of the box.',
    rows: [
      {
        name: 'data',
        type: 'Array<{ label: string; value: number }>',
        description: 'Points for the active range, oldest first.',
        required: true,
      },
      {
        name: 'shape',
        type: '"curved" | "sharp"',
        default: '"curved"',
        description: (
          <>
            <code className="rounded-md bg-background-secondary-default px-1 font-mono text-caption-1-regular text-text-primary">sharp</code> joins
            points with straight segments.
          </>
        ),
      },
      {
        name: 'range',
        type: '"daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "all"',
        default: '"weekly"',
        description: 'Active switcher segment. Pair with onRangeChange to control it.',
      },
      {
        name: 'onRangeChange',
        type: '(range: Range) => void',
        description: 'Called when a switcher segment is picked.',
      },
      {
        name: 'valueFormatter',
        type: '(value: number) => string',
        default: 'formatCurrency',
        description: 'Formats the headline, axis ticks and the hover readout.',
      },
      {
        name: 'curve',
        type: 'boolean',
        default: 'true',
        description: 'Use shape instead; kept for one release.',
        deprecated: true,
      },
    ],
  },
  tooltip: {
    label: 'ChartTooltip',
    intro: 'Rendered by the card on hover; use it directly when composing your own Recharts chart.',
    rows: [
      {
        name: 'active',
        type: 'boolean',
        default: 'false',
        description: 'Set by Recharts while the cursor is over the plot.',
      },
      {
        name: 'payload',
        type: 'TooltipPayload[] | undefined',
        description: 'Series values under the cursor.',
      },
      {
        name: 'indicator',
        type: '"dot" | "line" | "dashed" | "none" | "square"',
        default: '"dot"',
        description: 'Marker drawn next to each series name.',
      },
      {
        name: 'align',
        type: '"start" | "center" | "end"',
        default: '"center"',
        description: 'Horizontal anchor relative to the active point.',
      },
    ],
  },
};

export default function Demo() {
  const [api, setApi] = useState<ApiKey>('card');
  const [width, setWidth] = useState<Width>('auto');
  const current = APIS[api];

  return (
    <div data-demo className="flex w-full max-w-[900px] flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-title-3-medium text-text-primary">API Reference</h2>
          <p className="text-body-regular text-text-secondary">{current.intro}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            aria-label="Component"
            selectedKeys={[api]}
            onSelectionChange={(keys) => {
              const next = (Object.keys(APIS) as ApiKey[]).find((k) => keys.has(k));
              if (next) setApi(next);
            }}
          >
            {(Object.keys(APIS) as ApiKey[]).map((k) => (
              <SegmentedControlItem key={k} id={k}>
                {APIS[k].label}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
          <SegmentedControl
            aria-label="Table width"
            variant="plain"
            selectedKeys={[width]}
            onSelectionChange={(keys) => {
              if (keys.has('narrow')) setWidth('narrow');
              else if (keys.has('auto')) setWidth('auto');
            }}
          >
            <SegmentedControlItem id="auto">Full</SegmentedControlItem>
            <SegmentedControlItem id="narrow">Narrow</SegmentedControlItem>
          </SegmentedControl>
        </div>
      </div>

      <div
        data-width={width}
        role="region"
        aria-label={`${current.label} props`}
        tabIndex={0}
        className={
          width === 'narrow'
            ? 'mx-auto h-[380px] w-full max-w-[360px] overflow-y-auto rounded-2xl bg-background-secondary-default p-3 outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring sm:h-[420px]'
            : 'max-h-[380px] w-full overflow-y-auto rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring sm:max-h-[440px]'
        }
      >
        <PropsTable key={api} rows={current.rows} caption={`${current.label} props`} maxUnionMembers={3} idPrefix={`prop-${api}`} />
      </div>
    </div>
  );
}
