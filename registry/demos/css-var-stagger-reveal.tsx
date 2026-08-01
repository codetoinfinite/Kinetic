'use client';

import { useRef } from 'react';
import { CssVarStaggerReveal } from '@/registry/ui/css-var-stagger-reveal';

const SECTIONS = [
  {
    label: 'Fieldwork',
    head: 'Nine harbours, one winter',
    lines: [
      'Measured at low tide, twice a day.',
      'Every reading logged by hand.',
      'The survey took eleven weeks.',
    ],
  },
  {
    label: 'Method',
    head: 'Timing lives in the stylesheet',
    lines: [
      'JavaScript writes one index.',
      'CSS multiplies it by a step.',
      'The delay is a calc, nothing more.',
    ],
  },
  {
    label: 'Result',
    head: 'Retuned without a rebuild',
    lines: [
      'Four custom properties.',
      'Overridable from any ancestor.',
      'No timeline object to keep in sync.',
    ],
  },
];

export default function Demo() {
  /* The demo owns its scroll container and hands the ref down, so the
     observer measures against this box and never against the page. */
  const scroller = useRef<HTMLDivElement>(null);

  return (
    <div ref={scroller} className="scrollbar-none h-full w-full overflow-y-auto bg-bg">
      <CssVarStaggerReveal scroller={scroller} className="flex flex-col">
        {SECTIONS.map((section, i) => (
          <section
            key={section.label}
            data-reveal-group
            className="flex min-h-full flex-col justify-center gap-3 border-b border-line px-6 py-10"
          >
            <p data-reveal className="meta">
              {String(i + 1).padStart(2, '0')} · {section.label}
            </p>
            <h3
              data-reveal
              className="max-w-[24ch] text-balance text-xl leading-tight tracking-tight text-fg"
            >
              {section.head}
            </h3>
            <div className="rule" />
            {section.lines.map((line) => (
              <p key={line} data-reveal className="max-w-[34ch] text-sm leading-relaxed text-muted">
                {line}
              </p>
            ))}
          </section>
        ))}
      </CssVarStaggerReveal>
    </div>
  );
}
