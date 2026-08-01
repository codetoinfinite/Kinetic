'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef, type ReactNode, type RefObject } from 'react';
import { cn } from '@/lib/cn';
import { useGsap } from '@/registry/hooks/use-gsap';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';

/* ==========================================================================
   Dual-Direction Scrub Entrance
   --------------------------------------------------------------------------
   Two elements entering on the *same* scrub from different directions: the
   copy rises, the card slides in from the side. One trigger, one timeline,
   both tweens at position 0 — so their progress is identical at every scroll
   position and the pair reads as one composed arrival rather than two
   animations that happen to overlap.

   The other half is `scrub: 0.6`. A boolean scrub is welded to the wheel:
   stop scrolling and the animation stops in the same millisecond, which
   feels like dragging a slider. 0.6 seconds of catch-up lets the elements
   keep arriving briefly after the wheel stops, which is what "weight" is.
   ========================================================================== */

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);

export interface DualDirectionScrubEntranceProps {
  /** Rises from below. The reading order anchor — usually the copy. */
  primary: ReactNode;
  /** Slides in horizontally. Usually the card, figure or panel. */
  secondary: ReactNode;
  /** Which edge the secondary enters from. */
  from?: 'left' | 'right';
  /** Pixels the primary rises through. */
  rise?: number;
  /** Secondary travel as a percentage of its own width. */
  slide?: number;
  /** Seconds of catch-up behind the scroll position. */
  scrub?: number;
  start?: string;
  end?: string;
  /** The scroll container that owns the scroll position. Omit for the document. */
  scrollerRef?: RefObject<HTMLElement | null>;
  className?: string;
}

// #region critical
export function DualDirectionScrubEntrance({
  primary,
  secondary,
  from = 'right',
  rise = 60,
  slide = 55,
  scrub = 0.6,
  start = 'top 82%',
  end = 'top 38%',
  scrollerRef,
  className,
}: DualDirectionScrubEntranceProps) {
  const root = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLDivElement>(null);
  const secondaryRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGsap(
    gsap,
    () => {
      const container = root.current;
      const a = primaryRef.current;
      const b = secondaryRef.current;
      if (!container || !a || !b || reduced) return;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          scroller: scrollerRef?.current ?? undefined,
          start,
          end,
          // The number, not `true`. `true` welds the timeline to the wheel and
          // the section stops moving in the same millisecond the wheel does.
          scrub,
          invalidateOnRefresh: true,
        },
      });

      // `fromTo`, deliberately, and not `from`. A `from` tween on a scrubbed
      // trigger renders its start state immediately at build time and then
      // treats the element's *current* values as the destination — so a second
      // tween, a resize, or React re-applying a style mid-scroll silently
      // rewrites where the animation is heading. Stating both ends makes the
      // timeline idempotent.
      tl.fromTo(
        a,
        { autoAlpha: 0, y: rise },
        { autoAlpha: 1, y: 0, ease: 'none', duration: 1 },
        0,
      );

      tl.fromTo(
        b,
        { autoAlpha: 0, xPercent: from === 'right' ? slide : -slide },
        { autoAlpha: 1, xPercent: 0, ease: 'none', duration: 1 },
        // Position 0: both tweens share one progress value. Offsetting them
        // would make the pair read as a queue instead of a single arrival.
        0,
      );
    },
    root,
    [from, rise, slide, scrub, start, end, reduced],
  );
  // #endregion critical

  return (
    <div
      ref={root}
      className={cn(
        'grid items-center gap-6 md:grid-cols-2',
        from === 'left' && 'md:[&>*:first-child]:order-2',
        className,
      )}
    >
      <div ref={primaryRef} className="will-change-transform">
        {primary}
      </div>
      {/* The clip is what stops the sliding panel from widening the page: at
          xPercent 55 it starts more than half its own width outside the grid
          cell, and without an overflow guard that is a horizontal scrollbar. */}
      <div className="overflow-hidden">
        <div ref={secondaryRef} className="will-change-transform">
          {secondary}
        </div>
      </div>
    </div>
  );
}
