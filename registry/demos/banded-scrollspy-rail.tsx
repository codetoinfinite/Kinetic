'use client';

import { useRef } from 'react';
import { BandedScrollspyRail } from '@/registry/ui/banded-scrollspy-rail';

const SECTIONS = [
  { id: 'brief', label: 'Brief' },
  { id: 'approach', label: 'Approach' },
  { id: 'system', label: 'System' },
  { id: 'result', label: 'Result' },
  { id: 'colophon', label: 'Colophon' },
];

const BODY: Record<string, string> = {
  brief: 'A regional ferry operator with eleven routes and no consistent way of naming any of them.',
  approach: 'We started from the timetable, because that is the only artefact every passenger actually reads.',
  system: 'One grid, two weights, and a set of route marks that survive being printed at 8mm on a ticket.',
  result: 'Wayfinding complaints dropped by a third in the first season. The timetable fits on one side.',
  colophon: 'Set in a grotesque of our own drawing. Photography by the harbourmaster, under duress.',
};

export default function Demo() {
  const scroller = useRef<HTMLDivElement>(null);

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <div
        ref={scroller}
        className="scrollbar-none h-full w-full overflow-y-auto overscroll-contain"
      >
        <div className="pb-24 pl-28 pr-6 pt-6">
          <p className="meta">Case study</p>
          <h2 className="mt-3 max-w-[16ch] text-xl leading-tight tracking-tight text-fg">
            Northline Ferry, 2024
          </h2>

          {SECTIONS.map((section) => (
            <section
              key={section.id}
              data-scrollspy={section.id}
              className="mt-10 border-t border-line pt-4"
            >
              <p className="meta">{section.label}</p>
              <p className="mt-2 max-w-[34ch] text-sm leading-relaxed text-muted">
                {BODY[section.id] ?? ''}
              </p>
              <div className="mt-4 h-28 rounded-sm border border-line bg-surface" />
            </section>
          ))}
        </div>
      </div>

      <BandedScrollspyRail
        sections={SECTIONS}
        rootRef={scroller}
        endId="colophon"
        className="absolute left-6 top-1/2 -translate-y-1/2"
      />
    </div>
  );
}
