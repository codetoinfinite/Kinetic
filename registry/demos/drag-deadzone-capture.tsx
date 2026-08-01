'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { clamp } from '@/registry/lib/damp';
import { useRaf } from '@/registry/hooks/use-raf';
import { useDragDeadzone } from '@/registry/ui/drag-deadzone-capture';

/* 12 rather than the hook's default 8, only so the ring is legible at preview
   size. Both sit inside the 6-14 px band where a click still reads as a click. */
const THRESHOLD = 12;
const TOUCH_THRESHOLD = 18;

const SHELF = [
  { no: '01', title: 'Ash Stool', place: 'Kyoto' },
  { no: '02', title: 'Slab Table', place: 'Porto' },
  { no: '03', title: 'Wire Shelf', place: 'Leipzig' },
  { no: '04', title: 'Clay Sconce', place: 'Oaxaca' },
  { no: '05', title: 'Linen Screen', place: 'Ghent' },
  { no: '06', title: 'Brass Hook', place: 'Osaka' },
];

/* The ring is drawn at the press point at its true radius, so the dead zone is
   not a described quantity but a visible one. The core fills as the pointer
   approaches the edge; crossing it is the commit. */
const DRAG_CSS = `
.kx-dz-row {
  translate: calc(var(--kx-dz-x, 0) * 1px) 0;
}
.kx-dz-ring {
  position: absolute;
  left: calc(var(--kx-dz-px, 0) * 1px);
  top: calc(var(--kx-dz-py, 0) * 1px);
  translate: -50% -50%;
  border-radius: 9999px;
  border: 1px dashed var(--color-line-strong);
  pointer-events: none;
}
.kx-dz-ring[data-committed='true'] {
  border-style: solid;
  border-color: var(--color-accent);
}
.kx-dz-core {
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  background-color: var(--color-accent);
  opacity: 0.3;
  scale: var(--kx-dz-p, 0);
}
`;

type Phase = 'idle' | 'press' | 'drag';

export default function Demo() {
  const [selected, setSelected] = useState(1);
  const [phase, setPhase] = useState<Phase>('idle');
  const [last, setLast] = useState('—');
  const [taps, setTaps] = useState(0);
  const [drags, setDrags] = useState(0);

  const panel = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const distOut = useRef<HTMLSpanElement>(null);
  const travelOut = useRef<HTMLSpanElement>(null);

  const offset = useRef(0);
  const maxOffset = useRef(0);
  const travel = useRef(0);
  /** Which card the press landed on, for the tap case. */
  const pressedIndex = useRef(0);

  const { distance } = useDragDeadzone(panel, {
    axis: 'x',
    threshold: THRESHOLD,
    touchThreshold: TOUCH_THRESHOLD,
    onPress: (state) => {
      // One layout read per gesture, at the only moment the answer can change.
      const box = panel.current?.getBoundingClientRect();
      const ringEl = ring.current;
      if (box && ringEl) {
        ringEl.style.setProperty('--kx-dz-px', String(Math.round(state.clientX - box.left)));
        ringEl.style.setProperty('--kx-dz-py', String(Math.round(state.clientY - box.top)));
        ringEl.style.setProperty('--kx-dz-p', '0');
      }
      const track = row.current;
      const frame = viewport.current;
      maxOffset.current = track && frame ? Math.max(0, track.scrollWidth - frame.clientWidth) : 0;
      travel.current = 0;
      setPhase('press');
    },
    onDragStart: () => setPhase('drag'),
    onDrag: (state) => {
      travel.current = state.travel;
      offset.current = clamp(offset.current + state.deltaX, -maxOffset.current, 0);
      row.current?.style.setProperty('--kx-dz-x', offset.current.toFixed(1));
    },
    onDragEnd: (state, end) => {
      travel.current = state.travel;
      setPhase('idle');
      ring.current?.style.setProperty('--kx-dz-p', '0');

      if (end.cancelled) {
        setLast('cancelled by the browser');
        return;
      }
      if (end.moved) {
        setDrags((n) => n + 1);
        setLast(`drag · ${state.distance.toFixed(0)}px out, ${state.travel.toFixed(0)}px walked`);
        return;
      }
      // Under the threshold, so this was a click that happened to wobble. The
      // selection is made here rather than from a click handler, which is what
      // the dead zone buys: no click needs suppressing because none was a drag.
      setTaps((n) => n + 1);
      setSelected(pressedIndex.current);
      setLast(`tap · ${state.distance.toFixed(1)}px of wobble`);
    },
  });

  useRaf(() => {
    const value = distance.current;
    ring.current?.style.setProperty('--kx-dz-p', Math.min(1, value / THRESHOLD).toFixed(3));
    if (distOut.current) distOut.current.textContent = value.toFixed(1);
    if (travelOut.current) travelOut.current.textContent = travel.current.toFixed(0);
  }, phase !== 'idle');

  return (
    <div ref={panel} className="relative flex h-full w-full flex-col gap-4 p-6">
      <style href="kinetic-demo-drag-deadzone-capture" precedence="medium">
        {DRAG_CSS}
      </style>

      <header className="flex items-baseline justify-between">
        <span className="text-sm tracking-tight text-fg">Shelf, drag to browse</span>
        <span className="meta font-mono tabular-nums">
          {drags} drags &middot; {taps} taps
        </span>
      </header>

      <div ref={viewport} className="min-h-0 flex-1 overflow-hidden">
        <div ref={row} className="kx-dz-row flex h-full gap-2">
          {SHELF.map((item, i) => {
            const live = i === selected;
            return (
              <button
                key={item.no}
                type="button"
                onPointerDown={() => {
                  pressedIndex.current = i;
                }}
                onKeyDown={(e) => {
                  // No `onClick`: the pointer path is classified by the hook, so
                  // only keyboard activation needs handling here — and it needs
                  // it explicitly, since a tap never produces a keydown.
                  if (e.key !== 'Enter' && e.key !== ' ') return;
                  e.preventDefault();
                  setSelected(i);
                }}
                aria-pressed={live}
                className={cn(
                  'flex w-28 shrink-0 flex-col justify-between rounded-sm border p-3 text-left transition-colors duration-200',
                  live ? 'border-accent bg-accent/10' : 'border-line bg-surface',
                )}
              >
                <span
                  className={cn(
                    'font-mono text-[10px] tabular-nums',
                    live ? 'text-accent' : 'text-faint',
                  )}
                >
                  {item.no}
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-xs tracking-tight text-fg">{item.title}</span>
                  <span className="text-[10px] text-muted">{item.place}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="meta flex items-baseline justify-between gap-4 font-mono tabular-nums">
        <span>
          <span ref={distOut}>0.0</span>
          {` / ${THRESHOLD}px dead zone · `}
          <span ref={travelOut}>0</span>
          {'px walked'}
        </span>
        <span className={phase === 'drag' ? 'text-accent' : 'text-faint'}>{last}</span>
      </div>

      <div
        ref={ring}
        data-committed={phase === 'drag'}
        aria-hidden="true"
        className="kx-dz-ring"
        style={{
          width: THRESHOLD * 2,
          height: THRESHOLD * 2,
          opacity: phase === 'idle' ? 0 : 1,
        }}
      >
        <span className="kx-dz-core" />
      </div>
    </div>
  );
}
