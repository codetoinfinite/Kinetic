'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef, type ReactNode, type RefObject } from 'react';
import { cn } from '@/lib/cn';
import { useGsap } from '@/registry/hooks/use-gsap';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';

/* ==========================================================================
   Batched Blur Reveal
   --------------------------------------------------------------------------
   The naive page-wide reveal makes one ScrollTrigger per element. Sixty
   reveal targets is sixty independent start/end calculations on every
   refresh, and — the part that actually shows — sixty animations that cannot
   stagger relative to one another, because none of them knows the others
   exist. Two cards that enter the viewport in the same frame both start at
   t=0 and the row lands as a slab.

   `ScrollTrigger.batch` collects everything that crossed the start line
   within `interval` seconds and hands them to one callback as an array, so a
   single `stagger` runs across the group. One tween, one timeline, and the
   row arrives as a sequence.
   ========================================================================== */

// Registration is idempotent and this sits at module scope, so it runs once
// per module instance however many components import the file. The window
// guard is what keeps the module importable from a server component: the
// plugin touches `document` at registration time.
if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);

export interface BatchedBlurRevealProps {
  children: ReactNode;
  /** Which descendants reveal. Queried against this container, not the page. */
  selector?: string;
  /** ScrollTrigger `start`. Default fires slightly before the element is fully on screen. */
  start?: string;
  /** Pixels the element rises through. */
  distance?: number;
  /** Starting blur radius in pixels. 0 disables the focus-pull entirely. */
  blur?: number;
  /** Starting scale. */
  scale?: number;
  duration?: number;
  /** Seconds between elements *within one batch*. */
  stagger?: number;
  /** Reveal once and never replay. */
  once?: boolean;
  /** Largest group a single callback may receive. */
  batchMax?: number;
  /** The scroll container that owns the scroll position. Omit for the document. */
  scrollerRef?: RefObject<HTMLElement | null>;
  className?: string;
}

// #region critical
const BATCH_INTERVAL = 0.1;

export function BatchedBlurReveal({
  children,
  selector = '[data-reveal]',
  start = 'top 88%',
  distance = 90,
  blur = 12,
  scale = 0.94,
  duration = 1.1,
  stagger = 0.14,
  once = true,
  batchMax = 6,
  scrollerRef,
  className,
}: BatchedBlurRevealProps) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGsap(
    gsap,
    () => {
      const el = root.current;
      if (!el) return;

      // Query from the container, never `document`. Two instances of this
      // component on one page would otherwise each claim the other's targets
      // and fight over the same tweens.
      const targets = Array.from(el.querySelectorAll<HTMLElement>(selector));
      if (targets.length === 0) return;

      if (reduced) {
        // Not "duration 0" — no trigger at all. The content is simply already
        // in its final state on first paint.
        gsap.set(targets, { opacity: 1, y: 0, scale: 1, filter: 'none' });
        return;
      }

      gsap.set(targets, {
        opacity: 0,
        y: distance,
        scale,
        filter: `blur(${blur}px)`,
        // Promoting up front matters more than usual here: an animated
        // `filter` repaints the layer every frame, and without the hint the
        // first two or three frames of every batch are the browser deciding
        // whether to promote at all.
        willChange: 'transform, filter, opacity',
      });

      ScrollTrigger.batch(targets, {
        start,
        once,
        batchMax,
        interval: BATCH_INTERVAL,
        scroller: scrollerRef?.current ?? undefined,
        onEnter: (batch) => {
          gsap.to(batch, {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: 'blur(0px)',
            duration,
            ease: 'power3.out',
            stagger,
            // A fast flick can re-enter an element while its own reveal is
            // still running. Without overwrite the second tween interpolates
            // from wherever the first had got to and the two fight.
            overwrite: true,
            onComplete: () => {
              // A permanent `filter` keeps the element on its own composited
              // layer for the life of the page. Drop both hints once settled.
              gsap.set(batch, { clearProps: 'filter,willChange' });
            },
          });
        },
      });
    },
    root,
    [selector, start, distance, blur, scale, duration, stagger, once, batchMax, reduced],
  );
  // #endregion critical

  return (
    <div ref={root} className={cn(className)}>
      {children}
    </div>
  );
}
