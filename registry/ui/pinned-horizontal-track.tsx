'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Pinned Horizontal Track
   --------------------------------------------------------------------------
   Vertical scroll drives horizontal travel. One element is pinned, a strip
   inside it translates on x, and the pin lasts exactly as many scroll pixels
   as the strip has to travel — so one wheel notch moves the track by the
   same distance it would have moved the page.

   The whole construction rests on one measurement, `scrollWidth -
   clientWidth`, and the only way to get it wrong is to take it once. Fonts
   swap after first paint, images decode late, the container resizes: every
   one of those changes the number. It is therefore read through a function
   that ScrollTrigger re-invokes on refresh, for both the tween target and
   the pin duration, so the two can never disagree.
   ========================================================================== */

// Registering twice is a no-op inside GSAP, but module evaluation also
// happens during prerender, where ScrollTrigger has no document to measure.
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/** Handed to the parent so sibling systems can drive off the same pin. */
export interface PinnedTrack {
  /** The x tween. Pass as `containerAnimation` to reveal triggers. */
  animation: gsap.core.Tween;
  /** The pin itself. `trigger.end - trigger.start` is the scroll span. */
  trigger: ScrollTrigger;
  /** Live horizontal travel in px. Re-measured on call, never cached. */
  getDistance: () => number;
}

export interface PinnedHorizontalTrackProps {
  /** Panels. Give them a width and `shrink-0`; the track is a flex row. */
  children: ReactNode;
  /**
   * The scroll container the trigger reads. Omit to use the document.
   * Required whenever the component lives inside its own scroll box.
   */
  scroller?: RefObject<HTMLElement | null>;
  /** Seconds of catch-up. 0 locks to the scrollbar, 1 glides behind it. */
  scrub?: number;
  /** Receives the tween and trigger on build, `null` on teardown. */
  onTrack?: (track: PinnedTrack | null) => void;
  className?: string;
  trackClassName?: string;
}

// #region critical
export function PinnedHorizontalTrack({
  children,
  scroller,
  scrub = 1,
  onTrack,
  className,
  trackClassName,
}: PinnedHorizontalTrackProps) {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const onTrackRef = useRef(onTrack);
  onTrackRef.current = onTrack;
  const reduced = useReducedMotion();

  useEffect(() => {
    const rootEl = root.current;
    const trackEl = track.current;
    if (!rootEl || !trackEl || reduced) return;

    // `undefined` means "the document" to ScrollTrigger. Passing `null` would
    // be read as an explicit scroller and throw on the first refresh.
    const scrollerEl = scroller?.current ?? undefined;

    // The single source of truth. Both the tween's end value and the pin's
    // duration call it, so a refresh that changes one changes the other.
    const distanceOf = () => Math.max(0, trackEl.scrollWidth - rootEl.clientWidth);

    let cancelled = false;

    const ctx = gsap.context(() => {
      const animation = gsap.to(trackEl, {
        // Function-based value: re-evaluated by `invalidateOnRefresh`.
        x: () => -distanceOf(),
        ease: 'none',
        scrollTrigger: {
          trigger: rootEl,
          scroller: scrollerEl,
          pin: true,
          anticipatePin: 1,
          scrub,
          start: 'top top',
          // 1 px of scroll buys 1 px of track. Expressing the end as a
          // percentage of viewport height instead makes the mapping depend
          // on window shape, and the track finishes early on a short screen.
          end: () => `+=${Math.max(1, distanceOf())}`,
          invalidateOnRefresh: true,
        },
      });

      const trigger = animation.scrollTrigger;
      if (trigger) {
        onTrackRef.current?.({ animation, trigger, getDistance: distanceOf });
      }
    }, rootEl);

    // The most-forgotten line in scroll-driven layout. A font swap changes
    // `scrollWidth` after the pin has already been measured, and the last
    // panel becomes unreachable because the pin ends before the track does.
    void document.fonts?.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    });

    return () => {
      cancelled = true;
      onTrackRef.current?.(null);
      // revert(), not kill(): it also removes the pin-spacer GSAP injected
      // into the DOM and restores the inline transform on the strip.
      ctx.revert();
    };
  }, [scroller, scrub, reduced]);
  // #endregion critical

  return (
    <div
      ref={root}
      className={cn(
        'relative h-full w-full overflow-hidden',
        // Reduced motion keeps every panel reachable — by thumb, trackpad
        // and keyboard — instead of stranding them behind a dead pin.
        reduced && 'overflow-x-auto',
        className,
      )}
    >
      <div
        ref={track}
        className={cn('flex h-full items-stretch will-change-transform', trackClassName)}
      >
        {children}
      </div>
    </div>
  );
}
