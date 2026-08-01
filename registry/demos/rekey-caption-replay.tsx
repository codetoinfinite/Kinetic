'use client';

import { useState } from 'react';
import { RekeyCaptionReplay } from '@/registry/ui/rekey-caption-replay';

const SLIDES = [
  {
    eyebrow: 'Identity',
    title: 'Northfield Press',
    meta: ['Type, print, web', '2024'],
    angle: 148,
    accent: 24,
    glow: '22% 18%',
  },
  {
    eyebrow: 'Exhibition',
    title: 'Room For One Idea',
    meta: ['Signage, catalogue', '2024'],
    angle: 32,
    accent: 16,
    glow: '76% 26%',
  },
  {
    eyebrow: 'Packaging',
    title: 'Half Measures Ferments',
    meta: ['Labels, structure', '2025'],
    angle: 96,
    accent: 30,
    glow: '48% 74%',
  },
  {
    eyebrow: 'Report',
    title: 'Annual, Unabridged',
    meta: ['Editorial, 210pp', '2025'],
    angle: 210,
    accent: 12,
    glow: '18% 66%',
  },
] as const;

export default function Demo() {
  const [index, setIndex] = useState(0);
  // The caption enters from below going forward and from above going back, so
  // a step backward reads as a step backward.
  const [direction, setDirection] = useState<'up' | 'down'>('up');

  const slide = SLIDES[index] ?? SLIDES[0];

  const go = (delta: number) => {
    setDirection(delta > 0 ? 'up' : 'down');
    setIndex((i) => (i + delta + SLIDES.length) % SLIDES.length);
  };

  return (
    <div className="flex h-full w-full flex-col gap-3 bg-bg p-4">
      {/* Height-first stage: the box owns the height and the aspect follows, so
          the piece never overflows vertically in a short preview frame. */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-md border border-line">
        <div
          className="absolute inset-0 transition-[background] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            background: [
              `linear-gradient(${slide.angle}deg, color-mix(in oklab, var(--k-accent) ${slide.accent}%, var(--k-bg)), var(--k-bg) 64%)`,
              `radial-gradient(110% 90% at ${slide.glow}, color-mix(in oklab, var(--k-fg) 9%, transparent), transparent 68%)`,
            ].join(', '),
          }}
        />
        <span className="meta absolute right-3 top-3 rounded-full border border-line-strong bg-bg/60 px-2 py-0.5 text-fg backdrop-blur-sm">
          {String(index + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
        </span>
      </div>

      <div className="flex items-end justify-between gap-4">
        <RekeyCaptionReplay entryKey={index} direction={direction} className="min-w-0">
          <div className="meta text-accent">{slide.eyebrow}</div>
          <h3 className="truncate text-xl leading-tight tracking-tight text-fg sm:text-2xl">
            {slide.title}
          </h3>
          <div className="mt-1 flex gap-3">
            {slide.meta.map((m) => (
              <span key={m} className="meta">
                {m}
              </span>
            ))}
          </div>
        </RekeyCaptionReplay>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            aria-label="Previous"
            onClick={() => go(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-accent hover:text-fg"
          >
            &#8592;
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => go(1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-accent hover:text-fg"
          >
            &#8594;
          </button>
        </div>
      </div>
    </div>
  );
}
