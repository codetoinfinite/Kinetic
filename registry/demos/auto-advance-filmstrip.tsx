'use client';

import { AutoAdvanceFilmstrip } from '@/registry/ui/auto-advance-filmstrip';

const REEL = [
  { title: 'Threshold', length: '04:12' },
  { title: 'Grain Study', length: '02:48' },
  { title: 'Harbour Light', length: '06:03' },
  { title: 'Understory', length: '03:31' },
  { title: 'Last Ferry', length: '05:17' },
];

const HUE_START = 32;
const HUE_STEP = 41;

function plateBackground(index: number) {
  const hue = HUE_START + index * HUE_STEP;
  return {
    backgroundImage: [
      `radial-gradient(100% 90% at 12% 100%, oklch(0.74 0.14 ${hue} / 0.45), transparent 60%)`,
      `linear-gradient(168deg, oklch(0.48 0.14 ${hue}) 0%, oklch(0.27 0.08 ${hue + 20}) 55%, oklch(0.15 0.03 ${hue + 36}) 100%)`,
    ].join(', '),
  };
}

export default function Demo() {
  return (
    <AutoAdvanceFilmstrip className="h-full w-full" panelClassName="px-2" aria-label="Reel">
      {REEL.map((entry, i) => (
        <figure
          key={entry.title}
          className="relative flex aspect-[16/10] w-full flex-col justify-end overflow-hidden rounded-md p-3"
          style={plateBackground(i)}
        >
          <span
            aria-hidden
            className="absolute right-2 top-0 font-mono text-[4rem] font-light leading-none tracking-tighter text-white/12"
          >
            {String(i + 1).padStart(2, '0')}
          </span>
          <figcaption className="relative flex items-baseline justify-between gap-2">
            <span className="truncate text-sm leading-tight text-white">{entry.title}</span>
            <span className="shrink-0 font-mono text-[0.625rem] tracking-[0.16em] text-white/60">
              {entry.length}
            </span>
          </figcaption>
        </figure>
      ))}
    </AutoAdvanceFilmstrip>
  );
}
