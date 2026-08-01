'use client';

import { useRef } from 'react';
import { IoReveal } from '@/registry/ui/io-reveal-lite';

const ENTRIES = [
  { year: '2019', title: 'Harbour survey', place: 'Aalborg' },
  { year: '2020', title: 'Tide tables, reprinted', place: 'Bergen' },
  { year: '2021', title: 'Ferry terminal, phase one', place: 'Gothenburg' },
  { year: '2022', title: 'Salt warehouse conversion', place: 'Malmö' },
  { year: '2023', title: 'Lighthouse keeper cottages', place: 'Skagen' },
  { year: '2024', title: 'Breakwater, rebuilt', place: 'Hirtshals' },
];

const STEP = 0.08;

export default function Demo() {
  /* The reveal measures against this box. Nothing here knows the page exists. */
  const scroller = useRef<HTMLDivElement>(null);

  return (
    <div ref={scroller} className="scrollbar-none h-full w-full overflow-y-auto bg-bg">
      <div className="px-6 pb-10 pt-[70%]">
        <IoReveal scroller={scroller} className="mb-6">
          <p className="meta mb-2">Selected works</p>
          <h3 className="max-w-[22ch] text-balance text-xl leading-tight tracking-tight text-fg">
            Six coastal projects, in order
          </h3>
        </IoReveal>

        <ul className="border-t border-line">
          {ENTRIES.map((entry, i) => (
            <IoReveal
              key={entry.year}
              as="li"
              scroller={scroller}
              /* Stagger is one number per sibling. There is no group object. */
              delay={(i % 3) * STEP}
              className="flex items-baseline justify-between gap-4 border-b border-line py-3"
            >
              <span className="font-mono text-[0.625rem] tracking-[0.18em] text-faint">
                {entry.year}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm tracking-tight text-fg">
                {entry.title}
              </span>
              <span className="shrink-0 text-xs text-muted">{entry.place}</span>
            </IoReveal>
          ))}
        </ul>

        <IoReveal scroller={scroller} distance={40} duration={0.9} className="mt-8">
          <p className="max-w-[34ch] text-sm leading-relaxed text-muted">
            Every row above shares one IntersectionObserver, keyed on this
            scroll container rather than on the page.
          </p>
        </IoReveal>
      </div>
    </div>
  );
}
