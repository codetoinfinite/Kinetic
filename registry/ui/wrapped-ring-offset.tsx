'use client';

import { useCallback, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';
import { useDrag } from '@/registry/hooks/use-drag';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { damp, gaussian } from '@/registry/lib/damp';
import { shortestAngle, wrapIndex, wrappedOffset } from '@/registry/lib/wrap';

/* ==========================================================================
   Shortest Signed Ring Offset
   --------------------------------------------------------------------------
   A visualiser for one function. Every looping layout — drum carousel,
   infinite marquee, cylinder of planes — needs to answer "how far is item i
   from position p" as if the list were a circle. `i - p` answers it as if the
   list were a line, and the difference is a hard seam you can see.

   This renders both answers at once: the dots are laid out from the WRAPPED
   offset, and each dot carries the RAW difference beside it. Rotate the ring
   and the raw numbers jump by ±count while the dots do not move at all.
   ========================================================================== */

export interface WrappedRingOffsetProps {
  /** Items on the ring. The wrap threshold is count / 2. */
  count?: number;
  /** Ring positions per second before the first interaction. 0 to sit still. */
  drift?: number;
  className?: string;
}

const TAU = Math.PI * 2;

// #region critical
/** Fraction of the gap to the target that survives one second. */
const SMOOTHING = 0.0015;
/** Gaussian falloff on |offset|. At 0.45: 1.00 / 0.82 / 0.44 / 0.16 / 0.04. */
const FOCUS_FALLOFF = 0.45;
const RADIUS_RATIO = 0.36;
const IDLE_DRIFT = 0.22;

export function WrappedRingOffset({
  count = 10,
  drift = IDLE_DRIFT,
  className,
}: WrappedRingOffsetProps) {
  const root = useRef<HTMLDivElement>(null);
  const nodes = useRef<(HTMLLIElement | null)[]>([]);

  /** Where the ring is being pulled to. Fractional and unbounded. */
  const target = useRef(0);
  /** Where the ring actually is. Eased toward `target`. */
  const position = useRef(0);
  /** Suppresses the idle drift once a human has touched it. */
  const engaged = useRef(false);
  const grabAngle = useRef(0);
  const shown = useRef(0);

  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();
  const { width, height } = useResizeObserver(root);

  /** Pointer angle around the ring centre, measured fresh: the page scrolls. */
  const angleAt = useCallback((clientX: number, clientY: number) => {
    const box = root.current?.getBoundingClientRect();
    if (!box) return 0;
    return Math.atan2(clientY - (box.top + box.height / 2), clientX - (box.left + box.width / 2));
  }, []);

  useDrag(root, {
    threshold: 3,
    onDragStart: (s) => {
      engaged.current = true;
      grabAngle.current = angleAt(s.clientX, s.clientY);
    },
    onDrag: (s) => {
      const angle = angleAt(s.clientX, s.clientY);
      // shortestAngle, not `angle - grabAngle`: atan2 flips from +PI to -PI at
      // nine o'clock, and the raw difference there is a full turn of garbage
      // that spins the ring backwards every time the pointer crosses it.
      const step = (shortestAngle(grabAngle.current, angle) / TAU) * count;
      target.current -= step;
      grabAngle.current = angle;
    },
  });

  useRaf((dt) => {
    if (!engaged.current && !reduced) target.current += drift * dt;

    // Reduced motion still moves the ring — it just does not ease into place.
    position.current = reduced
      ? target.current
      : damp(position.current, target.current, SMOOTHING, dt);

    const p = position.current;
    const radius = Math.min(width, height) * RADIUS_RATIO;

    for (let i = 0; i < count; i++) {
      const el = nodes.current[i];
      if (!el) continue;

      // The one line the whole component exists to demonstrate. `offset` is
      // continuous in `p` even across the seam, because the ±count jump maps
      // to exactly one turn of the circle and lands on the same place.
      const offset = wrappedOffset(i, p, count);
      const angle = (offset / count) * TAU - Math.PI / 2;
      const focus = gaussian(Math.abs(offset), FOCUS_FALLOFF);

      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      // translate3d places the box origin, translate(-50%,-50%) re-centres it,
      // scale runs about that centre. One string, one composited property.
      el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) translate(-50%, -50%) scale(${(0.74 + focus * 0.46).toFixed(3)})`;
      el.style.opacity = (0.3 + focus * 0.7).toFixed(3);
      el.style.zIndex = String(10 + Math.round(focus * 40));
    }

    // Labels are integers, so they only need a render when the rounded ring
    // position changes — a couple of times a second, not sixty.
    const next = wrapIndex(Math.round(p), count);
    if (next !== shown.current) {
      shown.current = next;
      setIndex(next);
    }
  });
  // #endregion critical

  const onKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (step === 0) return;
    e.preventDefault();
    engaged.current = true;
    target.current += step;
  }, []);

  const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

  return (
    <div className={cn('relative flex h-full w-full flex-col', className)}>
      <div
        ref={root}
        role="slider"
        tabIndex={0}
        aria-label="Ring position"
        aria-valuemin={0}
        aria-valuemax={count - 1}
        aria-valuenow={index}
        onKeyDown={onKeyDown}
        className="relative min-h-0 flex-1 cursor-grab touch-none outline-none active:cursor-grabbing"
      >
        {/* The read head. Offset 0 is whatever sits under this notch. */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-full w-px -translate-x-1/2 -translate-y-1/2">
          <div className="absolute left-1/2 top-[7%] h-[36%] w-px -translate-x-1/2 bg-gradient-to-b from-accent/60 to-transparent" />
          <div className="absolute left-1/2 top-[5%] size-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-accent" />
        </div>

        <ul className="absolute left-1/2 top-1/2 size-0 list-none">
          {Array.from({ length: count }, (unused, i) => {
            const raw = i - index;
            const wrapped = wrappedOffset(i, index, count);
            const disagrees = raw !== wrapped;
            return (
              <li
                key={i}
                ref={(el) => {
                  nodes.current[i] = el;
                }}
                className="absolute left-0 top-0 will-change-transform"
              >
                <div
                  className={cn(
                    'relative grid size-9 place-items-center rounded-full border font-mono text-[11px] tabular-nums',
                    wrapped === 0
                      ? 'border-accent bg-accent text-bg'
                      : disagrees
                        ? 'border-line-strong bg-surface text-fg'
                        : 'border-line bg-bg-subtle text-muted',
                  )}
                >
                  {signed(wrapped)}
                  {disagrees && (
                    <span className="absolute -right-1 -top-2 rounded-sm bg-bg px-1 font-mono text-[9px] leading-tight text-faint line-through">
                      {signed(raw)}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-4 border-t border-line px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.08em]">
        <span className="text-muted">
          p <span className="text-fg tabular-nums">{index}</span>
          <span className="px-1.5 text-faint">/</span>n{' '}
          <span className="text-fg tabular-nums">{count}</span>
        </span>
        <span className="flex items-center gap-3">
          <span className="text-fg">wrapped</span>
          <span className="text-faint line-through">i − p</span>
        </span>
      </div>
    </div>
  );
}
