'use client';

import { MatchMediaLayoutTeardown } from '@/registry/ui/matchmedia-layout-teardown';

const CARDS = [
  { title: 'Ash', year: '2021' },
  { title: 'Kiln', year: '2022' },
  { title: 'Bloom', year: '2023' },
  { title: 'Slate', year: '2024' },
  { title: 'Ember', year: '2025' },
];

const HUE_START = 214;
const HUE_STEP = 29;

function plateBackground(index: number) {
  const hue = HUE_START + index * HUE_STEP;
  return {
    backgroundImage: [
      `radial-gradient(90% 70% at 20% 0%, oklch(0.8 0.12 ${hue} / 0.45), transparent 65%)`,
      `linear-gradient(180deg, oklch(0.44 0.12 ${hue}) 0%, oklch(0.24 0.07 ${hue + 16}) 60%, oklch(0.13 0.03 ${hue + 30}) 100%)`,
    ].join(', '),
  };
}

export default function Demo() {
  return (
    <div className="flex h-full w-full flex-col p-4">
      <div className="flex shrink-0 items-baseline justify-between border-b border-line pb-3">
        <span className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-muted">
          Editions
        </span>
        <span className="font-mono text-[0.625rem] tracking-[0.16em] text-faint">
          column · 640 · fan
        </span>
      </div>

      <div className="min-h-0 flex-1">
        {/* The breakpoint is passed to the component AND used by the `sm:`
            classes below, which is Tailwind's 640px. They have to agree: the
            card is full width in the column and 44% in the fan. */}
        <MatchMediaLayoutTeardown
          breakpoint={640}
          className="px-1 py-4"
          itemClassName="w-full sm:w-[44%]"
        >
          {CARDS.map((card, i) => (
            <figure
              key={card.title}
              className="relative flex h-16 w-full flex-col justify-end overflow-hidden rounded-md border border-white/10 p-3 sm:h-auto sm:aspect-[3/4]"
              style={plateBackground(i)}
            >
              <span
                aria-hidden
                className="absolute right-2 top-1 font-mono text-[2.5rem] font-light leading-none tracking-tighter text-white/12 sm:text-[3.5rem]"
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <figcaption className="relative flex items-baseline justify-between gap-2">
                <span className="truncate text-sm leading-tight text-white">{card.title}</span>
                <span className="shrink-0 font-mono text-[0.625rem] tracking-[0.16em] text-white/60">
                  {card.year}
                </span>
              </figcaption>
            </figure>
          ))}
        </MatchMediaLayoutTeardown>
      </div>
    </div>
  );
}
