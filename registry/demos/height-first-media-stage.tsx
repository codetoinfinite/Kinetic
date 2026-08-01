'use client';

import { HeightFirstMediaStage } from '@/registry/ui/height-first-media-stage';

const PLATES = [
  { title: 'Weather Station', place: 'Ísafjörður', hue: 236 },
  { title: 'Long Exposure', place: 'Setúbal', hue: 28 },
  { title: 'Cold Room', place: 'Trondheim', hue: 168 },
];

/* Placeholder artwork, generated rather than fetched: a two-stop gradient at
   the plate's hue with a soft highlight in one corner. */
function plateBackground(hue: number) {
  return {
    backgroundImage: [
      `radial-gradient(110% 75% at 82% 12%, oklch(0.82 0.11 ${hue} / 0.45), transparent 60%)`,
      `linear-gradient(196deg, oklch(0.44 0.11 ${hue}) 0%, oklch(0.24 0.06 ${hue + 16}) 62%, oklch(0.13 0.03 ${hue + 30}) 100%)`,
    ].join(', '),
  };
}

export default function Demo() {
  return (
    <div className="h-full w-full p-4">
      <HeightFirstMediaStage
        height="min(72dvh, 100%)"
        aspectRatio="3 / 2"
        aria-label="Field plates"
        caption={(i) => {
          const plate = PLATES[i] ?? PLATES[0];
          if (!plate) return null;
          return (
            <>
              <span className="block font-mono text-[0.625rem] uppercase tracking-[0.2em] text-white/60">
                {plate.place}
              </span>
              <span className="block truncate text-lg leading-tight text-white">
                {plate.title}
              </span>
            </>
          );
        }}
      >
        {PLATES.map((plate, i) => (
          <div key={plate.title} className="h-full w-full" style={plateBackground(plate.hue)}>
            <span
              aria-hidden
              className="absolute -top-3 left-4 font-mono text-[7rem] font-light leading-none tracking-tighter text-white/10"
            >
              {String(i + 1).padStart(2, '0')}
            </span>
          </div>
        ))}
      </HeightFirstMediaStage>
    </div>
  );
}
