'use client';

import { useState } from 'react';
import { PercentSlideCarousel } from '@/registry/ui/percent-slide-carousel';

const SLIDES = [
  { title: 'Salt Flats', place: 'Uyuni' },
  { title: 'Cold Storage', place: 'Rotterdam' },
  { title: 'Terraces', place: 'Yuanyang' },
  { title: 'Quarry No. 4', place: 'Carrara' },
];

const HUE_START = 92;
const HUE_STEP = 33;

function plateBackground(index: number) {
  const hue = HUE_START + index * HUE_STEP;
  return {
    backgroundImage: [
      `radial-gradient(120% 80% at 78% 8%, oklch(0.78 0.13 ${hue} / 0.5), transparent 62%)`,
      `linear-gradient(200deg, oklch(0.46 0.13 ${hue}) 0%, oklch(0.26 0.07 ${hue + 18}) 58%, oklch(0.14 0.03 ${hue + 34}) 100%)`,
    ].join(', '),
  };
}

export default function Demo() {
  const [index, setIndex] = useState(0);
  const active = SLIDES[index] ?? SLIDES[0];

  return (
    <div className="flex h-full w-full flex-col gap-3 p-4">
      <div className="min-h-0 flex-1 overflow-hidden rounded-md">
        <PercentSlideCarousel
          className="h-full w-full"
          index={index}
          onIndexChange={setIndex}
          aria-label="Field notes"
        >
          {SLIDES.map((slide, i) => (
            <figure
              key={slide.title}
              className="relative flex h-full w-full flex-col justify-end overflow-hidden p-5"
              style={plateBackground(i)}
            >
              <span
                aria-hidden
                className="absolute -top-2 left-3 font-mono text-[7rem] font-light leading-none tracking-tighter text-white/12"
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <figcaption className="relative">
                <span className="block font-mono text-[0.625rem] uppercase tracking-[0.2em] text-white/60">
                  {slide.place}
                </span>
                <span className="block text-lg leading-tight text-white">{slide.title}</span>
              </figcaption>
            </figure>
          ))}
        </PercentSlideCarousel>
      </div>

      <div className="flex shrink-0 items-baseline justify-between border-t border-line pt-3">
        <span className="text-xs text-fg">{active?.title}</span>
        <span className="font-mono text-[0.625rem] tracking-[0.16em] text-faint">
          {String(index + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}
