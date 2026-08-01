'use client';

import { DragMarquee } from '@/registry/ui/drag-marquee';

/* Seven cards. The "artwork" is a two-layer gradient keyed off the index, so
   the demo ships no images and the hues stay in one family. */
const WORK = [
  { title: 'Kiln', year: '2026', kind: 'Identity' },
  { title: 'Ledger', year: '2025', kind: 'Product' },
  { title: 'Foundry', year: '2025', kind: 'Site' },
  { title: 'Almanac', year: '2024', kind: 'Editorial' },
  { title: 'Quarry', year: '2024', kind: 'Film' },
  { title: 'Signal', year: '2023', kind: 'Product' },
  { title: 'Vellum', year: '2023', kind: 'Type' },
];

const HUE_START = 232;
const HUE_STEP = 17;

function cardBackground(index: number) {
  const hue = HUE_START + index * HUE_STEP;
  return {
    backgroundImage: [
      `radial-gradient(110% 70% at 15% 0%, oklch(0.80 0.12 ${hue + 30} / 0.42), transparent 60%)`,
      `linear-gradient(160deg, oklch(0.42 0.13 ${hue}) 0%, oklch(0.23 0.07 ${hue + 16}) 58%, oklch(0.14 0.03 ${hue + 30}) 100%)`,
    ].join(', '),
  };
}

export default function Demo() {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex shrink-0 items-baseline justify-between px-4 pb-1 pt-4">
        <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-faint">
          Selected work
        </span>
        <span className="font-mono text-[0.625rem] tracking-[0.18em] text-faint">
          {String(WORK.length).padStart(2, '0')} projects
        </span>
      </div>

      <div className="relative min-h-0 flex-1 py-3">
        <DragMarquee
          gap={16}
          speed={48}
          tileClassName="h-full w-[38%] min-w-[132px] max-w-[210px]"
          aria-label="Selected work"
        >
          {WORK.map((item, i) => (
            <article
              key={item.title}
              className="flex h-full w-full flex-col justify-between overflow-hidden rounded-lg p-3 shadow-lg"
              style={cardBackground(i)}
            >
              <span className="font-mono text-[0.5625rem] uppercase tracking-[0.2em] text-white/45">
                {item.kind}
              </span>
              <div>
                <p className="truncate text-[0.9375rem] leading-tight tracking-tight text-white/90">
                  {item.title}
                </p>
                <p className="font-mono text-[0.5625rem] tracking-[0.2em] text-white/40">
                  {item.year}
                </p>
              </div>
            </article>
          ))}
        </DragMarquee>

        {/* Edge fades, so tiles arrive and leave rather than popping at the
            container bounds. Pointer-transparent, or they would eat the drag. */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-bg to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-bg to-transparent" />
      </div>

      <div className="shrink-0 border-t border-line px-4 pb-3 pt-2">
        <p className="text-sm leading-tight tracking-tight text-fg">
          Drag the row, then let go
        </p>
        <p className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-faint">
          Press scatters — release throws
        </p>
      </div>
    </div>
  );
}
