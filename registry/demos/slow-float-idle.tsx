'use client';

import { SlowFloatIdle } from '@/registry/ui/slow-float-idle';

const CARDS = [
  { label: 'Discover', phase: 0, tilt: '-rotate-2' },
  { label: 'Design', phase: 0.33, tilt: 'rotate-1' },
  { label: 'Deliver', phase: 0.66, tilt: 'rotate-3' },
];

export default function Demo() {
  return (
    <div className="flex h-full w-full items-center justify-center gap-5 px-6">
      {CARDS.map((card, i) => (
        <SlowFloatIdle key={card.label} phase={card.phase} className="shrink-0">
          {/* transform-based utilities live here and on hover — the float owns
              `translate`, so the two never contend for the same property. */}
          <div
            className={`${card.tilt} flex h-32 w-24 flex-col justify-between rounded-lg border border-line bg-surface p-3 transition-transform duration-300 hover:scale-105`}
          >
            <span className="font-mono text-[10px] text-faint">0{i + 1}</span>
            <span className="text-xs tracking-tight text-fg">{card.label}</span>
          </div>
        </SlowFloatIdle>
      ))}
    </div>
  );
}
