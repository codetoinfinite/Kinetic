'use client';

import gsap from 'gsap';
import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useGsap } from '@/registry/hooks/use-gsap';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';

/* ==========================================================================
   Hinged Container Intro
   --------------------------------------------------------------------------
   The page body arrives from below the fold already tipped back in X and
   hinged from its own bottom edge, so it reads as a lid tilting up toward the
   viewer rather than a card sliding in. Secondary copy follows on a stagger
   that starts before the panel has landed, and a single cue fires partway
   through the flight for whatever expensive thing (a WebGL scene, a video)
   should start while the panel is still moving.

   The three beats are deliberately unequal in length: 1.4 s panel, 0.9 s
   detail, and a cue at 0.8 s. Equal beats read as one long move; unequal ones
   read as choreography.
   ========================================================================== */

export interface HingedContainerIntroProps {
  children: ReactNode;
  /**
   * Change this to replay the intro. In an App Router layout pass
   * `usePathname()`; in a modal pass the record id. Left undefined the intro
   * plays once on mount.
   */
  routeKey?: string;
  /** Panel flight time in seconds. */
  duration?: number;
  /** Starting X rotation in degrees. Negative tips the top edge away. */
  tilt?: number;
  /** Starting offset as a percentage of the panel's own height. */
  travel?: number;
  /** Perspective on the wrapper, in px. Smaller is a wider lens. */
  perspective?: number;
  /** Elements matching this selector inside the panel stagger in after it. */
  detailSelector?: string;
  /** Fired `sceneCue` seconds into the timeline — start heavy work here. */
  onSceneCue?: () => void;
  /** When the cue fires, in seconds from timeline start. */
  sceneCue?: number;
  className?: string;
}

const DETAIL_DURATION = 0.9;
const DETAIL_STAGGER = 0.1;
const DETAIL_OVERLAP = 0.6;

/* The start state lives in CSS, not in the effect. A `fromTo` alone leaves a
   window between first paint and the passive effect in which the panel is
   painted in its final position — one frame of the finished page, then a jump
   back below the fold. Reduced motion re-reveals it here so the content is
   never gated on JS running at all. */
const CSS = `
[data-hinged-panel] { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  [data-hinged-panel] { opacity: 1; }
}
`;

// #region critical
export function HingedContainerIntro({
  children,
  routeKey,
  duration = 1.4,
  tilt = -45,
  travel = 120,
  perspective = 1200,
  detailSelector = '[data-hinge-detail]',
  onSceneCue,
  sceneCue = 0.8,
  className,
}: HingedContainerIntroProps) {
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // Held in a ref so a caller passing an inline arrow does not have to
  // memoise it to avoid replaying the whole intro on every parent render.
  const cue = useRef(onSceneCue);
  cue.current = onSceneCue;

  useGsap(
    gsap,
    () => {
      const el = panel.current;
      if (!el || reduced) return;

      const details = Array.from(el.querySelectorAll<HTMLElement>(detailSelector));
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

      // transformOrigin bottom + negative rotateX is the whole trick: the
      // panel pivots on the edge it is about to sit on, so the top edge
      // travels much further than the bottom and the move reads as a hinge
      // instead of a translation with a tilt bolted on.
      tl.fromTo(
        el,
        {
          yPercent: travel,
          rotateX: tilt,
          opacity: 0,
          transformOrigin: 'center bottom',
          transformPerspective: perspective,
        },
        { yPercent: 0, rotateX: 0, opacity: 1, duration },
      );

      // Guarded: GSAP logs "target not found" for an empty array, and a
      // component that warns on every mount trains people to ignore the
      // console.
      if (details.length > 0) {
        tl.fromTo(
          details,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: DETAIL_DURATION, stagger: DETAIL_STAGGER },
          `-=${DETAIL_OVERLAP}`,
        );
      }

      // A number position is absolute on the timeline, so the cue stays at
      // 0.8 s no matter how the two tweens above are retimed.
      tl.call(
        () => {
          cue.current?.();
        },
        undefined,
        sceneCue,
      );
    },
    root,
    [routeKey, reduced],
  );
  // #endregion critical

  // Reduced motion still needs the cue — the scene, video or fetch behind it
  // is content, not decoration.
  useEffect(() => {
    if (!reduced) return;
    cue.current?.();
  }, [reduced, routeKey]);

  return (
    <div
      ref={root}
      className={cn('relative h-full w-full', className)}
      style={{ perspective: `${perspective}px` }}
    >
      <style>{CSS}</style>
      <div
        ref={panel}
        data-hinged-panel=""
        className="h-full w-full will-change-transform"
      >
        {children}
      </div>
    </div>
  );
}
