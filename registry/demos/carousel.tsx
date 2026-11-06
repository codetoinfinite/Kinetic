'use client';

import type { ReactNode } from 'react';

import { Carousel, CarouselItem } from '@/registry/ui/carousel';

/* A "Recent work" gallery as it sits on a portfolio card: one slide in view,
   arrows in the header row, dots underneath. Swipe or trackpad-scroll the
   track, focus it and use the arrow keys, or click a dot. The artwork is
   inline SVG so the demo never fetches an image. */

function Sunrise() {
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="kc-carousel-sunrise-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="0.55" stopColor="#fb923c" />
          <stop offset="1" stopColor="#f472b6" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill="url(#kc-carousel-sunrise-sky)" />
      <circle cx="210" cy="112" r="38" fill="#fff7ed" opacity="0.9" />
      <path d="M0 130 C60 100 110 112 160 128 S260 150 320 118 V180 H0 Z" fill="#be185d" opacity="0.55" />
      <path d="M0 150 C70 132 130 146 190 156 S280 160 320 146 V180 H0 Z" fill="#831843" opacity="0.8" />
    </svg>
  );
}

function NightSwim() {
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="kc-carousel-night-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f172a" />
          <stop offset="1" stopColor="#1e3a8a" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill="url(#kc-carousel-night-sky)" />
      <circle cx="248" cy="48" r="18" fill="#e0e7ff" />
      <circle cx="256" cy="42" r="16" fill="#1e293b" />
      {[
        [40, 30],
        [92, 52],
        [140, 22],
        [186, 60],
        [300, 86],
        [62, 78],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill="#c7d2fe" />
      ))}
      <path d="M0 122 Q40 112 80 122 T160 122 T240 122 T320 122 V180 H0 Z" fill="#1d4ed8" opacity="0.7" />
      <path d="M0 142 Q40 132 80 142 T160 142 T240 142 T320 142 V180 H0 Z" fill="#1e40af" />
    </svg>
  );
}

function Greenhouse() {
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="kc-carousel-greenhouse-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ecfccb" />
          <stop offset="1" stopColor="#86efac" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill="url(#kc-carousel-greenhouse-bg)" />
      <ellipse cx="90" cy="120" rx="70" ry="28" transform="rotate(-28 90 120)" fill="#22c55e" opacity="0.75" />
      <ellipse cx="170" cy="96" rx="78" ry="26" transform="rotate(22 170 96)" fill="#15803d" opacity="0.7" />
      <ellipse cx="250" cy="130" rx="64" ry="24" transform="rotate(-14 250 130)" fill="#4d7c0f" opacity="0.65" />
      <path d="M40 180 L120 70 M170 180 L170 60 M280 180 L230 80" stroke="#166534" strokeWidth="3" opacity="0.5" />
    </svg>
  );
}

function Studio() {
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden="true">
      <rect width="320" height="180" fill="#e0e7ff" />
      <rect x="0" y="118" width="320" height="62" fill="#a5b4fc" />
      <rect x="36" y="44" width="92" height="74" rx="6" fill="#6366f1" />
      <rect x="44" y="52" width="76" height="50" rx="3" fill="#eef2ff" />
      <circle cx="214" cy="80" r="30" fill="#f59e0b" />
      <rect x="252" y="62" width="34" height="56" rx="4" fill="#4338ca" />
      <rect x="150" y="118" width="128" height="10" rx="2" fill="#4338ca" opacity="0.5" />
    </svg>
  );
}

const SLIDES: { title: string; meta: string; art: ReactNode }[] = [
  { title: 'Ridge Line', meta: 'Brand refresh · Mar 2026', art: <Sunrise /> },
  { title: 'Night Swim', meta: 'Campaign key art · Feb 2026', art: <NightSwim /> },
  { title: 'Greenhouse', meta: 'Packaging system · Jan 2026', art: <Greenhouse /> },
  { title: 'Studio 4', meta: 'Interior signage · Dec 2025', art: <Studio /> },
];

export default function Demo() {
  return (
    <div className="relative w-full max-w-[360px]">
      <p className="absolute start-0 top-0 flex h-8 items-center text-body-semibold text-text-primary">
        Recent work
      </p>
      <Carousel aria-label="Recent work">
        {SLIDES.map((slide) => (
          <CarouselItem key={slide.title}>
            <figure className="flex flex-col gap-3">
              <div className="aspect-[16/9] w-full overflow-hidden rounded-2lg border border-border-button-default">
                {slide.art}
              </div>
              <figcaption className="flex flex-col gap-0.5">
                <span className="text-body-semibold text-text-primary">{slide.title}</span>
                <span className="text-caption-1-regular text-text-tertiary">{slide.meta}</span>
              </figcaption>
            </figure>
          </CarouselItem>
        ))}
      </Carousel>
    </div>
  );
}
