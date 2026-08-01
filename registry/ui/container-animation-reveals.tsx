'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { cn } from '@/lib/cn';

/* ==========================================================================
   One Reveal Engine, Two Axes
   --------------------------------------------------------------------------
   Most sites that mix a vertical page with a pinned horizontal section end up
   with two reveal systems: one that watches scroll position, and a second,
   parallel one that watches the horizontal timeline. They drift apart within
   a week — someone tunes the stagger on the vertical copy and forgets the
   horizontal copy exists.

   ScrollTrigger's `containerAnimation` removes the need for the second
   system. Given the tween that moves a strip sideways, a trigger measures its
   element against that tween's progress instead of against scroll position.
   The same builder therefore serves both axes: pass the strip's tween and the
   reveals fire as panels cross the container; pass nothing and they fire as
   sections cross the viewport. Identical choreography, one place to tune it.
   ========================================================================== */

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export interface AxisRevealsProps {
  children: ReactNode;
  /** The scroll container the triggers read. Omit to use the document. */
  scroller?: RefObject<HTMLElement | null>;
  /**
   * Three states, deliberately:
   *   `undefined` — the content is in vertical flow, build vertical triggers.
   *   `null`      — a horizontal timeline is coming but is not built yet; wait.
   *   an animation — measure against that timeline's progress instead.
   *
   * The `null` state exists because the tween is created in a sibling's
   * effect and arrives one render late. Treating it as "vertical" would build
   * a full set of wrong triggers and tear them down on the next commit.
   */
  containerAnimation?: gsap.core.Animation | null;
  /** Seconds of catch-up on the reveal itself. */
  scrub?: number;
  /** Start offset as a percentage of the element's own height. */
  lift?: number;
  /** Seconds between elements inside one group. */
  stagger?: number;
  className?: string;
}

const START_OPACITY = 0.15;

// #region critical
export function AxisReveals({
  children,
  scroller,
  containerAnimation,
  scrub = 0.4,
  lift = 110,
  stagger = 0.12,
  className,
}: AxisRevealsProps) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const rootEl = root.current;
    if (!rootEl || reduced) return;
    // Explicit "not ready": a sibling owns the timeline and has not built it.
    if (containerAnimation === null) return;

    const scrollerEl = scroller?.current ?? undefined;
    const horizontal = containerAnimation !== undefined;

    const ctx = gsap.context(() => {
      const groups = Array.from(rootEl.querySelectorAll<HTMLElement>('[data-reveal-group]'));
      // A subtree with no explicit groups reveals as one group.
      const scopes = groups.length > 0 ? groups : [rootEl];

      for (const group of scopes) {
        const targets = Array.from(group.querySelectorAll<HTMLElement>('[data-reveal]'));
        if (targets.length === 0) continue;

        gsap.fromTo(
          targets,
          { yPercent: lift, opacity: START_OPACITY },
          {
            yPercent: 0,
            opacity: 1,
            ease: 'power3.out',
            duration: 1,
            stagger,
            scrollTrigger: {
              trigger: group,
              scroller: scrollerEl,
              // The line everyone gets wrong. With `containerAnimation` the
              // trigger measures along the container's axis, so the position
              // keywords must be horizontal. "top 85%" against a horizontal
              // container resolves to a position the element never occupies,
              // and the reveal silently never fires.
              start: horizontal ? 'left 85%' : 'top 88%',
              end: horizontal ? 'left 45%' : 'top 45%',
              scrub,
              // Spreading rather than passing `undefined`: ScrollTrigger
              // branches on the key's presence, not on its value.
              ...(containerAnimation ? { containerAnimation } : {}),
            },
          },
        );
      }
    }, rootEl);

    return () => ctx.revert();
  }, [scroller, containerAnimation, scrub, lift, stagger, reduced]);
  // #endregion critical

  return (
    <div ref={root} className={cn(className)}>
      {children}
    </div>
  );
}
