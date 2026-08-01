'use client';

import { useState } from 'react';
import { WrappingDrumCarousel } from '@/registry/ui/wrapping-drum-carousel';

/* Six procedurally-tinted plates. No assets: the artwork is a three-stop
   gradient whose hue is a function of the index, plus a set numeral. */
const PIECES = [
  { title: 'Slow Tide', room: 'Hall A' },
  { title: 'Paper Weather', room: 'Studio 2' },
  { title: 'Nine Rooms', room: 'Hall B' },
  { title: 'Salt Chorus', room: 'Annex' },
  { title: 'Blue Interval', room: 'Studio 1' },
  { title: 'After Image', room: 'Hall A' },
];

const HUE_START = 196;
const HUE_STEP = 27;

function plateBackground(index: number) {
  const hue = HUE_START + index * HUE_STEP;
  return {
    backgroundImage: [
      `radial-gradient(120% 80% at 20% 8%, oklch(0.72 0.13 ${hue} / 0.55), transparent 62%)`,
      `linear-gradient(158deg, oklch(0.5 0.14 ${hue}) 0%, oklch(0.29 0.09 ${hue + 26}) 52%, oklch(0.16 0.04 ${hue + 48}) 100%)`,
    ].join(', '),
  };
}

function Plate({ index, title, room }: { index: number; title: string; room: string }) {
  return (
    <figure
      className="relative flex h-full w-full flex-col justify-end overflow-hidden rounded-md p-4 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.7)]"
      style={plateBackground(index)}
    >
      <span className="absolute -right-1 -top-4 font-mono text-[5.5rem] font-light leading-none tracking-tighter text-white/15">
        {String(index + 1).padStart(2, '0')}
      </span>
      <figcaption className="relative">
        <span className="block font-mono text-[0.625rem] uppercase tracking-[0.18em] text-white/55">
          {room}
        </span>
        <span className="mt-1 block text-balance text-base leading-tight text-white">
          {title}
        </span>
      </figcaption>
    </figure>
  );
}

export default function Demo() {
  const [index, setIndex] = useState(0);
  const active = PIECES[index] ?? PIECES[0];

  return (
    <div className="flex h-full w-full flex-col">
      <WrappingDrumCarousel
        className="min-h-0 flex-1"
        cardClassName="aspect-[3/4] w-[44%] min-w-[120px] max-w-[240px]"
        onIndexChange={setIndex}
      >
        {PIECES.map((piece, i) => (
          <Plate key={piece.title} index={i} title={piece.title} room={piece.room} />
        ))}
      </WrappingDrumCarousel>

      <div className="flex shrink-0 items-baseline justify-between border-t border-line px-4 py-3">
        <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-faint">
          Programme
        </span>
        <span className="text-xs text-muted">{active?.title}</span>
        <span className="font-mono text-[0.625rem] tracking-[0.18em] text-faint">
          {String(index + 1).padStart(2, '0')} / {String(PIECES.length).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}
