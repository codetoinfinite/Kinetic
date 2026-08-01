'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useRaf } from '@/registry/hooks/use-raf';
import { scheduleTone, useWebAudioScheduler } from '@/registry/ui/web-audio-scheduler';

const STEPS = 8;
const BPM = 96;

/* Three pitches, eight steps. Written as strings so the starting pattern is
   readable and identical on the server and the client — no seeded RNG needed
   and no hydration mismatch possible. */
const ROWS = [
  { name: 'E5', frequency: 659.25, pattern: 'x...x...' },
  { name: 'C5', frequency: 523.25, pattern: '..x...xx' },
  { name: 'G4', frequency: 392.0, pattern: 'x..xx.x.' },
];

const HEAD_CSS = `
.kx-seq-head {
  position: absolute;
  top: -2px;
  bottom: -2px;
  width: 1px;
  left: calc(var(--kx-seq-p, 0) * 100%);
  background-color: var(--color-accent);
  opacity: 0.6;
  pointer-events: none;
}
`;

export default function Demo() {
  const [grid, setGrid] = useState<boolean[][]>(() =>
    ROWS.map((row) => Array.from(row.pattern, (c) => c === 'x')),
  );

  const gridRef = useRef(grid);
  gridRef.current = grid;

  const strip = useRef<HTMLDivElement>(null);

  const { start, stop, running, step, phase } = useWebAudioScheduler({
    bpm: BPM,
    steps: STEPS,
    onBeat: ({ ctx, time, step: index }) => {
      // Scheduled ahead of time against the audio clock, so a slow frame here
      // cannot move the note. Reads the live pattern from a ref: `onBeat` is
      // called by a timer that outlives any single render.
      ROWS.forEach((row, r) => {
        if (gridRef.current[r]?.[index] !== true) return;
        scheduleTone(ctx, { frequency: row.frequency, at: time, gain: 0.1, decay: 0.3 });
      });
    },
  });

  const stepRef = useRef(step);
  stepRef.current = step;

  useRaf(() => {
    const el = strip.current;
    if (!el) return;
    const current = stepRef.current;
    const progress = current === null ? 0 : (current + phase.current) / STEPS;
    el.style.setProperty('--kx-seq-p', progress.toFixed(4));
  }, running);

  const toggle = (row: number, col: number) => {
    setGrid((prev) =>
      prev.map((cells, r) => (r === row ? cells.map((on, c) => (c === col ? !on : on)) : cells)),
    );
  };

  return (
    <div className="flex h-full w-full flex-col gap-4 p-6">
      <style href="kinetic-demo-web-audio-scheduler" precedence="medium">
        {HEAD_CSS}
      </style>

      <header className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-3">
          <span className="text-sm tracking-tight text-fg">Pattern</span>
          <span className="meta">
            {BPM} bpm &middot; step {step === null ? '—' : step + 1}/{STEPS}
          </span>
        </div>
        <button
          type="button"
          onClick={() => (running ? stop() : start())}
          className="rounded-full border border-line-strong px-4 py-1 text-[11px] tracking-tight text-fg transition-colors hover:bg-surface"
        >
          {running ? 'Stop' : 'Play'}
        </button>
      </header>

      <div className="flex min-h-0 flex-1 gap-3">
        <div className="flex w-8 shrink-0 flex-col gap-1.5">
          {ROWS.map((row) => (
            <span
              key={row.name}
              className="flex flex-1 items-center font-mono text-[10px] text-faint"
            >
              {row.name}
            </span>
          ))}
        </div>

        <div ref={strip} className="relative flex min-h-0 flex-1 flex-col gap-1.5">
          {running ? <span className="kx-seq-head" aria-hidden="true" /> : null}

          {ROWS.map((row, r) => (
            <div key={row.name} className="flex min-h-0 flex-1 gap-1.5">
              {Array.from({ length: STEPS }, (_, c) => {
                const on = grid[r]?.[c] === true;
                const live = step === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggle(r, c)}
                    aria-label={`${row.name} step ${c + 1}`}
                    aria-pressed={on}
                    className={cn(
                      'flex-1 rounded-sm border transition-colors duration-150',
                      on ? 'border-accent bg-accent/25' : 'border-line bg-surface',
                      live && on && 'bg-accent/60',
                      live && !on && 'border-line-strong',
                    )}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
