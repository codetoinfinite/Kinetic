'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import {
  PinnedHorizontalTrack,
  type PinnedTrack,
} from '@/registry/ui/pinned-horizontal-track';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { createRng } from '@/registry/lib/prng';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Pre-Scatter Horizontal Gallery
   --------------------------------------------------------------------------
   A pinned strip of media where nothing is quite on the grid. Each item sits
   at a small seeded horizontal offset from its slot, and as the strip travels
   it flies in from ahead and peels away behind — rotating through zero on the
   way past, so the whole gallery reads as one continuous drift rather than a
   sequence of arrivals.

   Two ideas do the work.

   The first is that the offsets are seeded, not random. `Math.random()` here
   would put the composition somewhere different on every reload, so a visual
   regression is invisible and the server and client disagree at hydration.

   The second is that every offset is a PERCENTAGE of the item's own width.
   The source measured its scatter in pixels off the container width, which
   has to be re-measured on every resize or the composition creeps. `xPercent`
   resolves against the element itself, so a resize moves nothing and there is
   nothing to invalidate.

   Position keywords are horizontal — `left 110%`, `right -10%` — because a
   trigger with a `containerAnimation` measures along the container's axis.
   Vertical keywords produce no error, no warning, and no animation.
   ========================================================================== */

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export interface PrescatterHorizontalGalleryProps {
  /** Panels. Give each a width and `shrink-0`; mark the media `data-scatter`. */
  children: ReactNode;
  /** The scroll container the triggers read. Omit to use the document. */
  scroller?: RefObject<HTMLElement | null>;
  /** Anything hashable. The same seed always rebuilds the same composition. */
  seed?: number | string;
  /** Total resting spread, as a percentage of each item's own width. */
  scatter?: number;
  /** Peak tilt in degrees, alternating by index. */
  rotation?: number;
  /** Vertical throw as a percentage of item height, alternating by index. */
  lift?: number;
  /** Horizontal lag and lead as a percentage of item width. */
  sweep?: number;
  /** Seconds of catch-up on the strip itself. */
  scrub?: number;
  className?: string;
  trackClassName?: string;
}

// #region critical
/**
 * The item's leading edge crosses the container from just off the right
 * (110%) to two thirds in (65%), and its trailing edge leaves from a third in
 * (35%) to just past the left (-10%). The two ranges cannot overlap for any
 * item narrower than 1.3 containers, so every item gets a settled window in
 * the middle where it is simply itself.
 */
const ENTER_START = 'left 110%';
const ENTER_END = 'left 65%';
const EXIT_START = 'right 35%';
const EXIT_END = 'right -10%';

export function PrescatterHorizontalGallery({
  children,
  scroller,
  seed = 'gallery',
  scatter = 32,
  rotation = 40,
  lift = 150,
  sweep = 400,
  scrub = 1,
  className,
  trackClassName,
}: PrescatterHorizontalGalleryProps) {
  const root = useRef<HTMLDivElement>(null);
  // The strip's tween is built in a child's effect, so it arrives one commit
  // late. State, not a ref: the arrival has to re-run the builder below.
  const [track, setTrack] = useState<PinnedTrack | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const rootEl = root.current;
    if (!rootEl) return;

    const containerAnimation = track?.animation;
    const scrollerEl = scroller?.current ?? undefined;

    const ctx = gsap.context(() => {
      const targets = Array.from(rootEl.querySelectorAll<HTMLElement>('[data-scatter]'));
      const rng = createRng(seed);

      targets.forEach((el, i) => {
        // Drawn for every item whether or not it animates, so adding motion
        // never shifts the resting composition.
        const rest = (rng() - 0.5) * scatter;
        // Parity, not the generator: alternating up/down and cw/ccw is a
        // rhythm, and a random sign clumps three the same way and looks broken.
        const dir = i % 2 === 0 ? 1 : -1;

        gsap.set(el, { xPercent: rest });
        // The resting scatter is layout. Under reduced motion the composition
        // survives and only the flight is dropped.
        if (reduced || !containerAnimation) return;

        gsap.fromTo(
          el,
          { xPercent: rest + sweep, yPercent: dir * lift, rotation: dir * rotation },
          {
            xPercent: rest,
            yPercent: 0,
            rotation: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: el,
              scroller: scrollerEl,
              containerAnimation,
              start: ENTER_START,
              end: ENTER_END,
              // `true`, not a number. The strip already scrubs with catch-up,
              // and these triggers read the strip's progress rather than the
              // scrollbar, so they inherit that smoothing. A second scrub
              // value smooths the smoothed signal and the items swim.
              scrub: true,
            },
          },
        );

        gsap.fromTo(
          el,
          { xPercent: rest, yPercent: 0, rotation: 0 },
          {
            xPercent: rest - sweep,
            yPercent: -dir * lift,
            rotation: -dir * rotation,
            ease: 'none',
            // The single most important line here. A `fromTo` renders its
            // from-state at creation, so without this the exit immediately
            // overwrites the entry's from-state — every item starts on the
            // grid instead of off-stage, and the entry appears not to exist.
            immediateRender: false,
            scrollTrigger: {
              trigger: el,
              scroller: scrollerEl,
              containerAnimation,
              start: EXIT_START,
              end: EXIT_END,
              scrub: true,
            },
          },
        );
      });
    }, rootEl);

    return () => ctx.revert();
  }, [track, scroller, seed, scatter, rotation, lift, sweep, reduced]);
  // #endregion critical

  return (
    <div ref={root} className={cn('relative h-full w-full', className)}>
      <PinnedHorizontalTrack
        scroller={scroller}
        scrub={scrub}
        // `null` on teardown, so the builder above drops a reverted tween
        // instead of handing it to a new set of triggers.
        onTrack={setTrack}
        trackClassName={trackClassName}
      >
        {children}
      </PinnedHorizontalTrack>
    </div>
  );
}
