'use client';

import { PerspectiveCoverflowScroller } from '@/registry/ui/perspective-coverflow-scroller';

/* Nine procedurally-tinted plates. The "photograph" is a two-layer gradient
   whose hue is derived from the index; no asset is loaded. */
const FRAMES = [
  'Overture',
  'Dry Season',
  'Long Exposure',
  'Field Notes',
  'Second Movement',
  'Low Country',
  'Interval',
  'Night Shift',
  'Coda',
];

const HUE_START = 268;
const HUE_STEP = 19;

function plateBackground(index: number) {
  const hue = HUE_START + index * HUE_STEP;
  return {
    backgroundImage: [
      `radial-gradient(90% 120% at 78% 4%, oklch(0.78 0.12 ${hue + 30} / 0.5), transparent 58%)`,
      `linear-gradient(200deg, oklch(0.46 0.15 ${hue}) 0%, oklch(0.26 0.08 ${hue + 22}) 58%, oklch(0.15 0.03 ${hue + 40}) 100%)`,
    ].join(', '),
  };
}

export default function Demo() {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex shrink-0 items-baseline justify-between px-4 pb-2 pt-4">
        <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-faint">
          Selected frames
        </span>
        <span className="font-mono text-[0.625rem] tracking-[0.18em] text-faint">
          {String(FRAMES.length).padStart(2, '0')}
        </span>
      </div>

      <PerspectiveCoverflowScroller
        className="min-h-0 flex-1"
        panelClassName="h-[78%] aspect-[4/5]"
        aria-label="Selected frames"
      >
        {FRAMES.map((title, i) => (
          <figure
            key={title}
            className="relative flex h-full w-full flex-col justify-end overflow-hidden rounded-md p-4"
            style={plateBackground(i)}
          >
            <span className="absolute left-4 top-3 font-mono text-[0.625rem] tracking-[0.2em] text-white/50">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 -bottom-6 text-center font-mono text-[6rem] font-light leading-none tracking-tighter text-white/10"
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <figcaption className="relative text-sm leading-tight text-white">{title}</figcaption>
          </figure>
        ))}
      </PerspectiveCoverflowScroller>

      <div className="shrink-0 px-4 pb-3 pt-2">
        <div className="h-px w-full bg-line" />
      </div>
    </div>
  );
}
