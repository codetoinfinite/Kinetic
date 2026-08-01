'use client';

import { useState } from 'react';
import { RotaryDragCarousel } from '@/registry/ui/rotary-drag-carousel';

/* Sixteen stations. The "artwork" on each card is a two-layer gradient whose
   hue comes from the index — nothing is fetched and nothing ships. */
const STATIONS = [
  'Kiln',
  'Ledger',
  'Foundry',
  'Almanac',
  'Quarry',
  'Signal',
  'Vellum',
  'Anvil',
  'Cinder',
  'Tideline',
  'Lathe',
  'Beacon',
  'Cairn',
  'Mercury',
  'Slate',
  'Ember',
];

const HUE_START = 24;
const HUE_STEP = 21;

function cardBackground(index: number) {
  const hue = HUE_START + index * HUE_STEP;
  return {
    backgroundImage: [
      `radial-gradient(120% 80% at 20% 0%, oklch(0.82 0.13 ${hue + 26} / 0.45), transparent 62%)`,
      `linear-gradient(165deg, oklch(0.44 0.14 ${hue}) 0%, oklch(0.24 0.07 ${hue + 18}) 62%, oklch(0.14 0.03 ${hue + 34}) 100%)`,
    ].join(', '),
  };
}

export default function Demo() {
  const [active, setActive] = useState(0);
  const label = STATIONS[active] ?? STATIONS[0] ?? '';

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex shrink-0 items-baseline justify-between px-4 pb-1 pt-4">
        <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-faint">
          Index
        </span>
        <span className="font-mono text-[0.625rem] tracking-[0.18em] text-faint">
          {String(active + 1).padStart(2, '0')} / {STATIONS.length}
        </span>
      </div>

      <div className="relative min-h-0 flex-1">
        <RotaryDragCarousel
          itemClassName="h-[52%] w-[28%] min-w-[76px]"
          onIndexChange={setActive}
          aria-label="Project index"
        >
          {STATIONS.map((title, i) => (
            <article
              key={title}
              className="flex h-full w-full flex-col justify-end overflow-hidden rounded-md p-2 shadow-lg"
              style={cardBackground(i)}
            >
              <span className="font-mono text-[0.5625rem] tracking-[0.2em] text-white/45">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="truncate text-[0.6875rem] leading-tight text-white/90">
                {title}
              </span>
            </article>
          ))}
        </RotaryDragCarousel>

        {/* A hairline at the top station, so it is obvious what "up" means. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
          <div className="h-3 w-px bg-line-strong" />
        </div>
      </div>

      <div className="shrink-0 border-t border-line px-4 pb-3 pt-2">
        <p className="text-sm leading-tight tracking-tight text-fg">{label}</p>
        <p className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-faint">
          Drag to turn
        </p>
      </div>
    </div>
  );
}
