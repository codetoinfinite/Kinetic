'use client';

import { Chip, type ChipColor } from '@/registry/ui/chip';

/* BoardUI shows chips packed like a tag cloud: mixed variants give the rows
   different heights, so the edges stay ragged. Below it, chips in context on
   a small stats row (a status, a delta, a role tag). */
const CLOUD: { color: ChipColor; label: string; variant: 'bold' | 'subtle' | 'caption' }[] = [
  { color: 'lime', label: 'Completed', variant: 'bold' },
  { color: 'yellow', label: 'Waiting', variant: 'subtle' },
  { color: 'purple', label: '+14.8%', variant: 'bold' },
  { color: 'cyan', label: 'Confirmed', variant: 'caption' },
  { color: 'rose', label: 'Failed', variant: 'bold' },
  { color: 'blue', label: 'In review', variant: 'subtle' },
  { color: 'gray', label: 'v2.4.0', variant: 'caption' },
  { color: 'neutral', label: 'Draft', variant: 'bold' },
  { color: 'lime', label: 'Live', variant: 'subtle' },
  { color: 'rose', label: '-3.2%', variant: 'caption' },
  { color: 'orange', label: 'Overdue', variant: 'bold' },
  { color: 'soft', label: 'Archived', variant: 'subtle' },
];

export default function Demo() {
  return (
    <div className="flex w-full max-w-[360px] flex-col items-center gap-6">
      <div className="flex max-w-[280px] flex-wrap items-center justify-center gap-1.5">
        {CLOUD.map((chip) => (
          <Chip key={chip.label} color={chip.color} variant={chip.variant}>
            {chip.label}
          </Chip>
        ))}
      </div>

      <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-border-table bg-background-primary-default px-4 py-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-caption-1-medium text-text-tertiary">Monthly revenue</span>
          <span className="text-title-3-semibold text-text-primary">$48,210</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Chip color="lime">+12.4%</Chip>
          <Chip color="gray" variant="caption">
            Owner
          </Chip>
        </div>
      </div>
    </div>
  );
}
