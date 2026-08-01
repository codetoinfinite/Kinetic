'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useBurstAudioSync } from '@/registry/ui/burst-audio-sync';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';

/* Eight strings, split into two banks of four. A strike runs outward toward
   the nearest edge and stops there, so the strings near an end play fewer
   notes than the ones in the middle — and you hear exactly as many notes as
   you see strings light up. */
const BAR_HEIGHTS = [38, 54, 72, 90, 90, 72, 54, 38];
const NOTE_NAMES = ['C4', 'E4', 'G4', 'C5'];
const BANK = BAR_HEIGHTS.length / 2;

const POP_CSS = `
@keyframes kx-bas-pop {
  from { opacity: 0.7; scale: 1 1; }
  to   { opacity: 0;   scale: 1 1.4; }
}
.kx-bas-pop {
  transform-origin: bottom center;
  animation: kx-bas-pop 480ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  pointer-events: none;
}
`;

function planStrike(origin: number): number[] {
  const upper = origin >= BANK;
  const low = upper ? BANK : 0;
  const high = upper ? BAR_HEIGHTS.length : BANK;
  const direction = upper ? 1 : -1;

  const plan: number[] = [];
  for (let i = 0; i < NOTE_NAMES.length; i++) {
    const index = origin + i * direction;
    if (index < low || index >= high) break;
    plan.push(index);
  }
  return plan;
}

export default function Demo() {
  const reduced = useReducedMotion();
  const [muted, setMuted] = useState(false);
  const [lit, setLit] = useState<number[]>([]);
  const [pulses, setPulses] = useState<number[]>(() => BAR_HEIGHTS.map(() => 0));
  const plan = useRef<number[]>([]);

  const { fire, unlocked } = useBurstAudioSync({
    muted,
    onStep: (index) => {
      const bar = plan.current[index];
      if (bar === undefined) return;
      setLit((prev) => (prev.includes(bar) ? prev : [...prev, bar]));
      setPulses((prev) => prev.map((n, i) => (i === bar ? n + 1 : n)));
    },
  });

  const strike = (origin: number) => {
    plan.current = planStrike(origin);
    setLit([]);
    fire(plan.current.length);
  };

  return (
    <div className="flex h-full w-full flex-col gap-4 p-6">
      <style href="kinetic-demo-burst-audio-sync" precedence="medium">
        {POP_CSS}
      </style>

      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-3">
          <span className="text-sm tracking-tight text-fg">C major</span>
          <span className="meta">arpeggio &middot; 0.46s</span>
        </div>
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          className="flex items-center gap-2 text-[11px] tracking-tight text-muted transition-colors hover:text-fg"
        >
          <span
            className={cn('size-1.5 rounded-full', muted ? 'bg-line-strong' : 'bg-accent')}
          />
          {muted ? 'Muted' : unlocked ? 'Sound on' : 'Sound'}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-end gap-1.5">
        {BAR_HEIGHTS.map((height, i) => {
          const step = lit.indexOf(i);
          const pulse = pulses[i] ?? 0;
          return (
            <button
              key={i}
              type="button"
              onClick={() => strike(i)}
              aria-label={`Strike string ${i + 1}`}
              style={{ height: `${height}%` }}
              className={cn(
                'relative flex-1 overflow-hidden rounded-t border border-b-0 transition-colors duration-200',
                step === -1
                  ? 'border-line bg-surface hover:border-line-strong'
                  : 'border-accent bg-accent/20',
              )}
            >
              {/* Remounted on every strike via its key, so the keyframe restarts
                  from 0 without a timer resetting a class. */}
              {!reduced && pulse > 0 && step !== -1 ? (
                <span key={pulse} className="kx-bas-pop absolute inset-0 bg-accent" />
              ) : null}

              {step === -1 ? null : (
                <span className="absolute inset-x-0 bottom-1.5 text-center font-mono text-[9px] text-accent">
                  {NOTE_NAMES[step]}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
