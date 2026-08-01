'use client';

import { ProximitySnapTrack } from '@/registry/ui/proximity-snap-track';

/* Deliberately uneven widths — the case `mandatory` snapping handles badly and
   `proximity` handles well. Widths are in container-width units so the rail
   overflows at any container size. */
const CHAPTERS = [
  { title: 'Ground Plane', span: 'I', width: 56 },
  { title: 'Weather', span: 'II', width: 38 },
  { title: 'The Long Room', span: 'III', width: 72 },
  { title: 'Salt', span: 'IV', width: 34 },
  { title: 'Counterweight', span: 'V', width: 60 },
  { title: 'Tide Tables', span: 'VI', width: 44 },
  { title: 'Return', span: 'VII', width: 50 },
];

const HUE_START = 152;
const HUE_STEP = 23;

function plateBackground(index: number) {
  const hue = HUE_START + index * HUE_STEP;
  return {
    backgroundImage: [
      `radial-gradient(110% 100% at 90% 0%, oklch(0.76 0.11 ${hue} / 0.4), transparent 62%)`,
      `linear-gradient(174deg, oklch(0.44 0.12 ${hue}) 0%, oklch(0.25 0.07 ${hue + 18}) 60%, oklch(0.15 0.03 ${hue + 30}) 100%)`,
    ].join(', '),
  };
}

export default function Demo() {
  return (
    // `container-type` here is what makes the `cqw` widths below resolve
    // against this box rather than the viewport.
    <div className="flex h-full w-full flex-col" style={{ containerType: 'inline-size' }}>
      <div className="flex shrink-0 items-baseline justify-between px-4 pb-3 pt-4">
        <span className="text-sm text-fg">Contents</span>
        <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-faint">
          Seven parts
        </span>
      </div>

      <ProximitySnapTrack className="min-h-0 flex-1 pb-4" aria-label="Contents">
        {CHAPTERS.map((chapter, index) => (
          <article
            key={chapter.title}
            className="relative flex h-full flex-col justify-between overflow-hidden rounded-md p-3"
            style={{ ...plateBackground(index), width: `${chapter.width}cqw`, minWidth: '128px' }}
          >
            <span className="font-mono text-[0.625rem] tracking-[0.2em] text-white/55">
              {chapter.span}
            </span>
            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-3 right-1 font-mono text-[4.5rem] font-light leading-none tracking-tighter text-white/12"
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            <h3 className="relative text-balance text-sm leading-tight text-white">
              {chapter.title}
            </h3>
          </article>
        ))}
      </ProximitySnapTrack>
    </div>
  );
}
