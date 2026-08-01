'use client';

import { StrokeToFillRows, type StrokeToFillItem } from '@/registry/ui/stroke-to-fill-hover';

const ITEMS: StrokeToFillItem[] = [
  { label: 'Salt Ledger', meta: '2026 — Identity' },
  { label: 'Nightshift', meta: '2025 — Editorial' },
  { label: 'Pelago', meta: '2025 — Type' },
  { label: 'Quarry', meta: '2024 — Web' },
];

export default function Demo() {
  return (
    <div className="flex h-full w-full flex-col p-5 sm:p-7">
      <div className="flex shrink-0 items-baseline justify-between pb-3">
        <span className="meta">Selected work</span>
        <span className="meta">Four</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <StrokeToFillRows items={ITEMS} />
      </div>
    </div>
  );
}
