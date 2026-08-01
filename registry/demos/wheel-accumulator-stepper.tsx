'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { wrapIndex } from '@/registry/lib/wrap';
import { useRaf } from '@/registry/hooks/use-raf';
import { useWheelStepper } from '@/registry/ui/wheel-accumulator-stepper';

const STEP = 90;

const ITEMS = [
  { no: '01', title: 'Terrazzo Counter', year: '2024' },
  { no: '02', title: 'Kiln Room', year: '2024' },
  { no: '03', title: 'Folded Steel Bench', year: '2023' },
  { no: '04', title: 'Paper Lamp Study', year: '2023' },
  { no: '05', title: 'Cast Glass Door', year: '2022' },
  { no: '06', title: 'Rope Stair', year: '2022' },
];

/* The gauge grows out of the centre line in whichever direction the units are
   banked, so a swipe up and a swipe down read differently at a glance. */
const GAUGE_CSS = `
.kx-wheel-track {
  position: relative;
  overflow: hidden;
}
.kx-wheel-down,
.kx-wheel-up {
  position: absolute;
  top: 0;
  bottom: 0;
  background-color: var(--color-accent);
}
.kx-wheel-down {
  left: 50%;
  right: 0;
  transform-origin: left center;
  scale: var(--kx-wheel-down, 0) 1;
}
.kx-wheel-up {
  left: 0;
  right: 50%;
  transform-origin: right center;
  scale: var(--kx-wheel-up, 0) 1;
}
`;

function modeLabel(deltaMode: number): string {
  if (deltaMode === 1) return 'line';
  if (deltaMode === 2) return 'page';
  return 'px';
}

export default function Demo() {
  const [active, setActive] = useState(2);
  const [steps, setSteps] = useState(0);
  const [hovering, setHovering] = useState(false);

  const panel = useRef<HTMLDivElement>(null);
  const gauge = useRef<HTMLDivElement>(null);
  const banked = useRef<HTMLSpanElement>(null);
  const state = useRef<HTMLSpanElement>(null);
  const input = useRef<HTMLSpanElement>(null);

  const { units, latched } = useWheelStepper(panel, {
    step: STEP,
    onStep: (direction, detail) => {
      setActive((i) => wrapIndex(i + direction, ITEMS.length));
      setSteps((n) => n + 1);
      // The raw delta and its mode, printed so the normalisation is visible:
      // a mouse reports one event near 100 px, a trackpad reports a stream of
      // single digits, and a line-mode browser reports 3 of something else.
      if (input.current) {
        const raw = detail.event.deltaY || detail.event.deltaX;
        input.current.textContent = `${raw.toFixed(0)} ${modeLabel(detail.deltaMode)} → ${detail.delta.toFixed(0)}`;
      }
    },
  });

  // Runs only while the pointer is over the panel, which is the only time a
  // wheel event can reach it. The accumulator is a ref, so this is a DOM write
  // per frame rather than a re-render per wheel event.
  useRaf(() => {
    const el = gauge.current;
    if (!el) return;
    const value = units.current;
    el.style.setProperty('--kx-wheel-down', Math.max(0, value / STEP).toFixed(4));
    el.style.setProperty('--kx-wheel-up', Math.max(0, -value / STEP).toFixed(4));
    if (banked.current) {
      banked.current.textContent = `${value > 0 ? '+' : ''}${value.toFixed(0)}`;
    }
    if (state.current) {
      state.current.textContent = latched.current ? 'absorbing' : 'armed';
    }
  }, hovering);

  return (
    <div
      ref={panel}
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => setHovering(false)}
      className="flex h-full w-full flex-col gap-4 p-6"
    >
      <style href="kinetic-demo-wheel-accumulator-stepper" precedence="medium">
        {GAUGE_CSS}
      </style>

      <header className="flex items-baseline justify-between">
        <span className="text-sm tracking-tight text-fg">Selected works</span>
        <span className="meta font-mono tabular-nums">
          {steps} steps &middot; <span ref={state}>armed</span>
        </span>
      </header>

      <ul className="flex min-h-0 flex-1 flex-col justify-center gap-0.5">
        {ITEMS.map((item, i) => {
          const live = i === active;
          return (
            <li
              key={item.no}
              className={cn(
                'flex items-baseline gap-3 border-l-2 py-1 pl-3 transition-colors duration-200',
                live ? 'border-accent' : 'border-transparent',
              )}
            >
              <span
                className={cn(
                  'font-mono text-[10px] tabular-nums transition-colors duration-200',
                  live ? 'text-accent' : 'text-faint',
                )}
              >
                {item.no}
              </span>
              <span
                className={cn(
                  'flex-1 truncate text-sm tracking-tight transition-colors duration-200',
                  live ? 'text-fg' : 'text-muted',
                )}
              >
                {item.title}
              </span>
              <span
                className={cn(
                  'font-mono text-[10px] tabular-nums transition-colors duration-200',
                  live ? 'text-muted' : 'text-faint',
                )}
              >
                {item.year}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-2">
        <div ref={gauge} className="kx-wheel-track h-[3px] rounded-full bg-line">
          <span className="kx-wheel-up" aria-hidden="true" />
          <span className="kx-wheel-down" aria-hidden="true" />
        </div>
        <div className="meta flex justify-between font-mono tabular-nums">
          <span>
            <span ref={banked}>0</span>
            {` / ${STEP} units`}
          </span>
          <span ref={input} className="text-faint">
            —
          </span>
        </div>
      </div>
    </div>
  );
}
