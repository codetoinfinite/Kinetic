'use client';

import { useEffect, useRef, useState } from 'react';
import { SafePreloader } from '@/registry/ui/safe-preloader';

const CEILING = 2500;
const FLOOR = 700;

const WARM = {
  key: 'warm',
  label: 'Warm cache',
  at: 120,
  note: 'signal resolves in 120 ms — the floor holds the overlay to 700 ms so it cannot flash',
} as const;
const SLOW = {
  key: 'slow',
  label: 'Slow network',
  at: 1400,
  note: 'signal resolves in 1.4 s — revealed on the signal, well inside the ceiling',
} as const;
const HANG = {
  key: 'hang',
  label: 'Never resolves',
  at: -1,
  note: 'signal never fires — the ceiling reveals the page anyway at 2.5 s',
} as const;

const SCENARIOS = [WARM, SLOW, HANG] as const;

type Key = (typeof SCENARIOS)[number]['key'];

export default function Demo() {
  const [scenario, setScenario] = useState<Key>('hang');
  const [run, setRun] = useState(0);
  const [ready, setReady] = useState(false);
  const [shownFor, setShownFor] = useState<number | null>(null);
  const started = useRef(0);

  const current = SCENARIOS.find((s) => s.key === scenario) ?? HANG;

  useEffect(() => {
    setReady(false);
    setShownFor(null);
    started.current = performance.now();
    if (current.at < 0) return;
    const id = setTimeout(() => setReady(true), current.at);
    return () => clearTimeout(id);
  }, [current, run]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <nav className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="meta text-fg">Kern &amp; Co</span>
        <div className="flex gap-3">
          {SCENARIOS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                setScenario(s.key);
                setRun((n) => n + 1);
              }}
              className={
                s.key === scenario ? 'meta text-accent' : 'meta transition-colors hover:text-fg'
              }
            >
              {s.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="flex h-[calc(100%-3rem)] flex-col justify-between p-4">
        <p className="meta max-w-[34ch] text-muted">{current.note}</p>
        <div className="flex flex-col gap-2">
          <span className="meta text-accent">
            {shownFor === null ? '—' : `revealed after ${shownFor} ms`}
          </span>
          <h2 className="max-w-[15ch] text-3xl leading-[1.02] tracking-tight text-fg">
            The page is visible either way.
          </h2>
        </div>
      </div>

      {/* `once={false}` only so the demo can replay. In production the default
          `once` keeps it to one appearance per session. */}
      <SafePreloader
        key={run}
        ready={ready}
        once={false}
        ceilingMs={CEILING}
        floorMs={FLOOR}
        position="absolute"
        onDone={() => setShownFor(Math.round(performance.now() - started.current))}
      />
    </div>
  );
}
