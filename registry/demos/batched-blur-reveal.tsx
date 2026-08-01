'use client';

import { useRef } from 'react';
import { BatchedBlurReveal } from '@/registry/ui/batched-blur-reveal';

const ENTRIES = [
  { year: '2024', title: 'Northline Ferry', kind: 'Identity' },
  { year: '2024', title: 'Harbour Index', kind: 'Editorial' },
  { year: '2023', title: 'Field Recorder', kind: 'Product' },
  { year: '2023', title: 'Salt & Cedar', kind: 'Packaging' },
  { year: '2022', title: 'Quiet Hours', kind: 'Film' },
  { year: '2022', title: 'Meridian Type', kind: 'Typeface' },
  { year: '2021', title: 'Low Tide Press', kind: 'Identity' },
  { year: '2021', title: 'Second Signal', kind: 'Web' },
];

export default function Demo() {
  const scroller = useRef<HTMLDivElement>(null);

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <div
        ref={scroller}
        className="scrollbar-none h-full w-full overflow-y-auto overscroll-contain"
      >
        <BatchedBlurReveal scrollerRef={scroller} className="px-5 py-6">
          <header className="pb-8">
            <p className="meta">Selected work</p>
            <h2 className="mt-3 max-w-[18ch] text-2xl leading-tight tracking-tight text-fg">
              Eight years of quiet, considered output.
            </h2>
          </header>

          <div className="grid grid-cols-2 gap-3">
            {ENTRIES.map((entry) => (
              <article
                key={entry.title}
                data-reveal
                className="rounded-md border border-line bg-surface p-3"
              >
                <div
                  className="mb-3 h-16 rounded-sm border border-line"
                  style={{
                    backgroundImage:
                      'linear-gradient(135deg, color-mix(in oklab, var(--color-accent) 26%, transparent), transparent 70%)',
                  }}
                />
                <p className="meta">{entry.year}</p>
                <h3 className="mt-1.5 text-sm tracking-tight text-fg">{entry.title}</h3>
                <p className="mt-0.5 text-xs text-muted">{entry.kind}</p>
              </article>
            ))}
          </div>

          <p data-reveal className="mt-8 max-w-[38ch] pb-10 text-sm leading-relaxed text-muted">
            Everything above entered in rows. Each row is one batch, one tween, one stagger —
            which is why the second card in a row is always a beat behind the first.
          </p>
        </BatchedBlurReveal>
      </div>
    </div>
  );
}
