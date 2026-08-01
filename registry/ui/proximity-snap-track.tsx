'use client';

import {
  Children,
  isValidElement,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Proximity Snap Track
   --------------------------------------------------------------------------
   A horizontal rail of variable-width items that snaps only when you were
   already close to a snap point, and refuses to be skipped past by a fling.
   Two CSS properties do the whole job:

     scroll-snap-type: x proximity   — snap if near, otherwise leave me alone
     scroll-snap-stop: always        — never pass more than one item per gesture

   No JavaScript participates in the motion. The browser owns momentum, the
   rubber band, keyboard paging and the snap animation, and it does all of it
   off the main thread.
   ========================================================================== */

export interface ProximitySnapTrackProps {
  /** One item per child. Widths may differ — that is the point. */
  children: ReactNode;
  /**
   * `proximity` snaps only from nearby and is right for variable-width items.
   * `mandatory` is offered so the difference can be felt, not because it is
   * usually correct here.
   */
  snapType?: 'proximity' | 'mandatory';
  snapAlign?: 'start' | 'center';
  /** `always` stops a fast fling from flying past items. */
  snapStop?: 'normal' | 'always';
  /** Pixels of inset. Applied as both padding and `scroll-padding`. */
  gutter?: number;
  /** Gap between items in pixels. */
  gap?: number;
  className?: string;
  itemClassName?: string;
  'aria-label'?: string;
}

export function ProximitySnapTrack({
  children,
  snapType = 'proximity',
  snapAlign = 'start',
  snapStop = 'always',
  gutter = 16,
  gap = 12,
  className,
  itemClassName,
  'aria-label': ariaLabel = 'Track',
}: ProximitySnapTrackProps) {
  const reduced = useReducedMotion();
  const items = Children.toArray(children);

  // #region critical
  const trackStyle: CSSProperties = {
    scrollSnapType: `x ${snapType}`,
    // `scroll-padding` is what a snap position is measured against, and it is
    // a separate property from `padding`. With padding alone, a `start`-aligned
    // item snaps flush to the container's border and the inset the design asked
    // for silently disappears at every rest position.
    scrollPaddingInline: `${gutter}px`,
    paddingInline: `${gutter}px`,
    gap: `${gap}px`,
    // Programmatic scrolls (anchor jumps, `scrollIntoView`, arrow keys in some
    // engines) animate unless told not to. Snapping itself is not affected —
    // it is the browser's own transition and honours the OS setting already.
    scrollBehavior: reduced ? 'auto' : 'smooth',
  };

  const itemStyle: CSSProperties = {
    scrollSnapAlign: snapAlign,
    scrollSnapStop: snapStop,
  };
  // #endregion critical

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
      className={cn(
        'flex h-full w-full items-stretch overflow-x-auto overflow-y-hidden',
        '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        'overscroll-x-contain',
        className,
      )}
      style={trackStyle}
    >
      {items.map((child, i) => (
        <div
          key={isValidElement(child) && child.key !== null ? child.key : i}
          className={cn('shrink-0', itemClassName)}
          style={itemStyle}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
