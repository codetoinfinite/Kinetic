'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef, type ReactNode, type RefObject } from 'react';
import { cn } from '@/lib/cn';
import { useGsap } from '@/registry/hooks/use-gsap';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';

/* ==========================================================================
   Dataset-Driven Parallax
   --------------------------------------------------------------------------
   The parallax rate lives in the markup, not in the JavaScript. One effect
   walks the container for `[data-parallax]`, reads the depth off the
   attribute, and builds a scrub tween per element. Adding a new layer is an
   attribute; there is no registry of selectors to keep in sync and no
   component that has to be told about every element it will ever move.

   The whole trick is `yPercent: -(100 * depth)`. Percent-of-own-height rather
   than pixels means an element that is 2000px tall on desktop and 400px tall
   on mobile travels a proportional distance at both sizes, with no media
   query and no re-measurement.
   ========================================================================== */

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);

export interface DatasetParallaxProps {
  children: ReactNode;
  /** Attribute carrying the depth. Its value is parsed as a float. */
  attribute?: string;
  /** Depth used when the attribute is missing, empty, or not a number. */
  fallback?: number;
  /** ScrollTrigger `scrub`. `true` is locked to the wheel; a number adds lag in seconds. */
  scrub?: boolean | number;
  /** The scroll container that owns the scroll position. Omit for the document. */
  scrollerRef?: RefObject<HTMLElement | null>;
  className?: string;
}

// #region critical
const DEFAULT_DEPTH = 0.15;

export function DatasetParallax({
  children,
  attribute = 'data-parallax',
  fallback = DEFAULT_DEPTH,
  scrub = true,
  scrollerRef,
  className,
}: DatasetParallaxProps) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGsap(
    gsap,
    () => {
      const el = root.current;
      if (!el || reduced) return;

      const scroller = scrollerRef?.current ?? undefined;

      for (const layer of Array.from(el.querySelectorAll<HTMLElement>(`[${attribute}]`))) {
        // Double fallback, and both halves are load-bearing. `?? ''` handles a
        // bare `data-parallax` with no value; `|| fallback` handles
        // `parseFloat` returning NaN on anything non-numeric. A NaN reaching
        // `yPercent` does not throw — it silently pins the layer at its
        // untransformed position, which looks like the effect simply not
        // working on that one element.
        const raw = layer.getAttribute(attribute) ?? '';
        const depth = parseFloat(raw) || fallback;

        gsap.to(layer, {
          yPercent: -(100 * depth),
          ease: 'none',
          scrollTrigger: {
            trigger: layer,
            scroller,
            // The widest possible window: begins the instant the layer's top
            // touches the bottom of the scroller and ends when its bottom
            // leaves the top. Any narrower range concentrates the same travel
            // into less scroll, which is what makes cheap parallax feel like
            // the page is sliding apart.
            start: 'top bottom',
            end: 'bottom top',
            scrub,
            // Percent-based travel is recomputed from element height; without
            // this a resize leaves every layer measured against the old one.
            invalidateOnRefresh: true,
          },
        });
      }
    },
    root,
    [attribute, fallback, scrub, reduced],
  );
  // #endregion critical

  return (
    <div ref={root} className={cn(className)}>
      {children}
    </div>
  );
}
