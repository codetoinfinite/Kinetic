'use client';

import {
  Children,
  isValidElement,
  useCallback,
  useState,
  type ReactNode,
} from 'react';
import { clamp } from '@/registry/lib/damp';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { wrapIndex } from '@/registry/lib/wrap';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Percent Slide Carousel
   --------------------------------------------------------------------------
   The boring, correct one. A flex track whose slides are each 100% of the
   track's width; the track translates by `-100% * index`. One CSS transition,
   no library, no measurement, no listeners, nothing to clean up.

   Percentage translation works here for a reason worth understanding: the
   track is `width: 100%` of the viewport box, each slide is `width: 100%` of
   the *track*, and `flex-shrink: 0` lets them overflow instead of compressing.
   So one track-width is exactly one slide-width, and `-100%` is exactly one
   slide. Change any one of those three and the arithmetic breaks silently.
   ========================================================================== */

export interface PercentSlideCarouselProps {
  /** One slide per child. */
  children: ReactNode;
  /** Slide transition duration in ms. */
  duration?: number;
  /** Controlled index. Omit for uncontrolled. */
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Wrap from the last slide back to the first. Off by default — see notes. */
  loop?: boolean;
  className?: string;
  slideClassName?: string;
  'aria-label'?: string;
}

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

export function PercentSlideCarousel({
  children,
  duration = 600,
  index,
  defaultIndex = 0,
  onIndexChange,
  loop = false,
  className,
  slideClassName,
  'aria-label': ariaLabel = 'Carousel',
}: PercentSlideCarouselProps) {
  const items = Children.toArray(children);
  const count = items.length;
  const reduced = useReducedMotion();

  const [internal, setInternal] = useState(defaultIndex);
  const current = index ?? internal;

  const go = useCallback(
    (next: number) => {
      const resolved = loop
        ? wrapIndex(next, count)
        : clamp(next, 0, Math.max(0, count - 1));
      if (index === undefined) setInternal(resolved);
      onIndexChange?.(resolved);
    },
    [count, loop, index, onIndexChange],
  );

  const atStart = !loop && current <= 0;
  const atEnd = !loop && current >= count - 1;

  // #region critical
  const trackStyle = {
    // One slide is one track-width, so the step is exactly 100%. This is the
    // only carousel arithmetic that needs no numbers from layout at all.
    transform: `translateX(-${100 * current}%)`,
    // No transition under reduced motion: the slide still changes, it just
    // arrives instantly. Cutting the movement is the point; cutting the
    // navigation would be a bug.
    transition: reduced ? 'none' : `transform ${duration}ms ${EASE}`,
  };
  // #endregion critical

  return (
    <div
      className={cn('relative h-full w-full overflow-hidden', className)}
      role="group"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
    >
      <div className="flex h-full w-full" style={trackStyle}>
        {items.map((child, i) => (
          <div
            key={isValidElement(child) && child.key !== null ? child.key : i}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            // `w-full shrink-0`: full width of the TRACK, and no shrinking, so
            // the slides overflow rather than being squeezed to fit. Drop
            // `shrink-0` and every slide compresses to 1/count of the track,
            // the translate still moves a full track-width, and the carousel
            // jumps `count` slides per click.
            className={cn('h-full w-full shrink-0', slideClassName)}
          >
            {child}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => go(current - 1)}
        disabled={atStart}
        aria-label="Previous slide"
        className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-line-strong bg-surface/70 text-fg backdrop-blur-sm transition-opacity hover:bg-surface disabled:pointer-events-none disabled:opacity-30"
      >
        <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none">
          <path d="M14.5 5.5 8 12l6.5 6.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="square" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => go(current + 1)}
        disabled={atEnd}
        aria-label="Next slide"
        className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-line-strong bg-surface/70 text-fg backdrop-blur-sm transition-opacity hover:bg-surface disabled:pointer-events-none disabled:opacity-30"
      >
        <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none">
          <path d="M9.5 5.5 16 12l-6.5 6.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="square" />
        </svg>
      </button>
    </div>
  );
}
