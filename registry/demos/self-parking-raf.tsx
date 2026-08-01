'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useSelfParkingRaf } from '@/registry/ui/self-parking-raf';

const DURATION = 214;

const CHAPTERS = [
  { label: 'Cold open', at: 0 },
  { label: 'The commission', at: 38 },
  { label: 'Casting bronze', at: 96 },
  { label: 'Install', at: 158 },
  { label: 'Credits', at: 205 },
];

const SCRUB_CSS = `
.kx-park-track {
  position: relative;
  container-type: inline-size;
}
.kx-park-fill {
  position: absolute;
  inset: 0;
  transform-origin: left center;
  scale: var(--kx-park-p, 0) 1;
  background-color: var(--color-accent);
}
.kx-park-thumb {
  position: absolute;
  top: -5px;
  bottom: -5px;
  left: 0;
  width: 2px;
  translate: calc(var(--kx-park-p, 0) * (100cqw - 2px)) 0;
  background-color: var(--color-fg);
}
`;

/** `2:14.0` — tenths, so a settling value is visibly still settling. */
function timecode(seconds: number): string {
  const m = Math.floor(seconds / 60);
  return `${m}:${(seconds - m * 60).toFixed(1).padStart(4, '0')}`;
}

export default function Demo() {
  const [index, setIndex] = useState(0);

  const scrub = useRef<HTMLDivElement>(null);
  const code = useRef<HTMLSpanElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const frames = useRef(0);

  const target = (CHAPTERS[index]?.at ?? 0) / DURATION;

  const { running } = useSelfParkingRaf(target, {
    // Per-frame work writes straight to the DOM. Routing this through state
    // would re-render the whole demo sixty times a second to move one bar.
    onFrame: (v) => {
      frames.current += 1;
      scrub.current?.style.setProperty('--kx-park-p', v.toFixed(4));
      if (code.current) code.current.textContent = timecode(v * DURATION);
      if (count.current) count.current.textContent = String(frames.current);
    },
  });

  const seek = (next: number) => {
    frames.current = 0;
    setIndex(next);
  };

  return (
    <div className="flex h-full w-full flex-col justify-between p-6">
      <style href="kinetic-demo-self-parking-raf" precedence="medium">
        {SCRUB_CSS}
      </style>

      <header className="flex items-baseline justify-between">
        <span className="text-sm tracking-tight text-fg">Foundry, part two</span>
        <span className="meta font-mono">
          <span className={running ? 'text-accent' : 'text-faint'}>
            {running ? 'rAF live' : 'rAF parked'}
          </span>
          {' · '}
          <span ref={count} className="tabular-nums">
            0
          </span>
          {' frames'}
        </span>
      </header>

      <div className="flex items-end justify-between gap-4">
        <span className="text-2xl tracking-tight text-fg">{CHAPTERS[index]?.label}</span>
        <span
          ref={code}
          className="shrink-0 font-mono text-2xl tabular-nums tracking-tight text-accent"
        >
          {timecode(0)}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        <div ref={scrub} className="kx-park-track h-1 rounded-full bg-line">
          <span className="kx-park-fill rounded-full" aria-hidden="true" />
          <span className="kx-park-thumb rounded-full" aria-hidden="true" />
        </div>

        <div className="flex justify-between gap-2">
          {CHAPTERS.map((chapter, i) => (
            <button
              key={chapter.label}
              type="button"
              onClick={() => seek(i)}
              className={cn(
                'font-mono text-[10px] tabular-nums transition-colors',
                i === index ? 'text-fg' : 'text-faint hover:text-fg',
              )}
            >
              {timecode(chapter.at)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
