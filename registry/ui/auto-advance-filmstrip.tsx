'use client';

import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useVisibility } from '@/registry/hooks/use-visibility';
import { wrapIndex } from '@/registry/lib/wrap';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Auto-Advance Filmstrip
   --------------------------------------------------------------------------
   A centred filmstrip where the whole track is one transform and the maths is
   one expression. Panels are `W` container-width units wide; the track sits at
   `(100 - W) / 2 - W * index` container-width units. The first term centres a
   panel, the second steps one panel per index. No measurement, no
   `getBoundingClientRect`, no resize handler — the relationship is expressed
   in units that already track the container.

   The original of this pattern used `vw`. `cqw` is the same idea done against
   the component's own box, so the strip is still correct inside a card, a
   modal or a split layout.
   ========================================================================== */

export interface AutoAdvanceFilmstripProps {
  /** One panel per child. */
  children: ReactNode;
  /** Panel width in container-width units (`cqw`). */
  panelWidth?: number;
  /** Milliseconds each panel is held before advancing. */
  interval?: number;
  /** Slide transition duration in milliseconds. */
  duration?: number;
  autoPlay?: boolean;
  /** Opacity of the panels either side of the active one. */
  inactiveOpacity?: number;
  /** Scale of the panels either side of the active one. */
  inactiveScale?: number;
  className?: string;
  panelClassName?: string;
  'aria-label'?: string;
}

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

function Chevron({ direction }: { direction: 'prev' | 'next' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none">
      <path
        d={direction === 'prev' ? 'M14.5 5.5 8 12l6.5 6.5' : 'M9.5 5.5 16 12l-6.5 6.5'}
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="square"
      />
    </svg>
  );
}

export function AutoAdvanceFilmstrip({
  children,
  panelWidth = 46,
  interval = 3000,
  duration = 500,
  autoPlay = true,
  inactiveOpacity = 0.35,
  inactiveScale = 0.8,
  className,
  panelClassName,
  'aria-label': ariaLabel = 'Filmstrip',
}: AutoAdvanceFilmstripProps) {
  const items = Children.toArray(children);
  const count = items.length;

  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);

  const reduced = useReducedMotion();
  const visible = useVisibility();

  const go = useCallback(
    (next: number) => setIndex(wrapIndex(next, count)),
    [count],
  );

  // #region critical
  // (100 - W) / 2 centres a panel of width W; W * index steps one panel per
  // index. Both terms are in the same unit as the panel width, so the strip
  // stays centred at every container size with no measurement at all.
  const offset = (100 - panelWidth) / 2 - panelWidth * index;

  const running = autoPlay && !reduced && visible && !held && count > 1;

  useEffect(() => {
    if (!running) return;
    // setTimeout keyed on `index`, not setInterval: any manual navigation
    // re-arms a full dwell. With an interval, tapping "next" one tick before
    // it fires advances twice in a row.
    const id = window.setTimeout(() => {
      setIndex((current) => wrapIndex(current + 1, count));
    }, interval);
    return () => window.clearTimeout(id);
  }, [running, index, interval, count]);
  // #endregion critical

  return (
    <div
      className={cn('relative h-full w-full overflow-hidden', className)}
      // `inline-size` rather than `size`: containing the block axis too would
      // require the strip to have a definite height, which it does not.
      style={{ containerType: 'inline-size' }}
      role="group"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={() => setHeld(false)}
    >
      <div
        className="flex h-full items-center"
        style={{
          transform: `translateX(${offset}cqw)`,
          transition: reduced ? 'none' : `transform ${duration}ms ${EASE}`,
        }}
      >
        {items.map((child, i) => {
          const active = i === index;
          return (
            <div
              key={isValidElement(child) && child.key !== null ? child.key : i}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              className={cn('shrink-0', panelClassName)}
              style={{
                width: `${panelWidth}cqw`,
                // Both cues together. Opacity alone reads as a loading state
                // and scale alone reads as a layout bug; together they read as
                // depth, which is the only interpretation that is correct.
                opacity: active ? 1 : inactiveOpacity,
                transform: active ? 'scale(1)' : `scale(${inactiveScale})`,
                transition: reduced
                  ? 'none'
                  : `opacity ${duration}ms ${EASE}, transform ${duration}ms ${EASE}`,
              }}
            >
              {child}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => go(index - 1)}
        aria-label="Previous"
        className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-line-strong bg-surface/70 text-fg backdrop-blur-sm transition-colors hover:bg-surface"
      >
        <Chevron direction="prev" />
      </button>
      <button
        type="button"
        onClick={() => go(index + 1)}
        aria-label="Next"
        className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-line-strong bg-surface/70 text-fg backdrop-blur-sm transition-colors hover:bg-surface"
      >
        <Chevron direction="next" />
      </button>

      <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
        {items.map((child, i) => (
          <button
            key={isValidElement(child) && child.key !== null ? `dot-${child.key}` : `dot-${i}`}
            type="button"
            onClick={() => go(i)}
            aria-label={`Go to ${i + 1}`}
            aria-current={i === index}
            className={cn(
              'h-1 rounded-full transition-all duration-300',
              i === index ? 'w-5 bg-fg' : 'w-1 bg-fg/30 hover:bg-fg/60',
            )}
          />
        ))}
      </div>
    </div>
  );
}
