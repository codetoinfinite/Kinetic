'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { clamp } from '@/registry/lib/damp';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Mixed Scrub Depth Layers
   --------------------------------------------------------------------------
   Parallax built only from distance is a flat trick: every layer arrives at
   its final offset on the same frame, so the moment scrolling stops the
   depth cue disappears and the composition reads as one plane again.

   The missing dimension is time. Giving each depth its own `scrub` value
   means each layer resolves toward its target at a different rate, so the
   layers separate under motion and converge at rest — which is exactly what
   depth of field does to a moving camera. A ladder of four values,
   0 / 0.25 / 0.5 / 1, is enough to read as four distinct distances.
   ========================================================================== */

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export interface MixedScrubLayersProps {
  /** Markup containing `[data-depth]` elements. 0 is nearest. */
  children: ReactNode;
  /** The scroll container the triggers read. Omit to use the document. */
  scroller?: RefObject<HTMLElement | null>;
  /**
   * Pass a horizontal strip's tween to measure along it instead. `null` means
   * "that tween is not built yet", and nothing is created this commit.
   */
  containerAnimation?: gsap.core.Animation | null;
  /** Seconds of catch-up per depth index. Its length defines the ladder. */
  ladder?: number[];
  /** yPercent travel at the deepest layer. Depth 0 never moves. */
  travel?: number;
  className?: string;
}

const DEFAULT_LADDER = [0, 0.25, 0.5, 1];

// #region critical
export function MixedScrubLayers({
  children,
  scroller,
  containerAnimation,
  ladder = DEFAULT_LADDER,
  travel = 26,
  className,
}: MixedScrubLayersProps) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  // Serialised so a fresh array literal from the caller does not rebuild
  // every trigger on every render.
  const ladderKey = ladder.join(',');

  useEffect(() => {
    const rootEl = root.current;
    if (!rootEl || reduced) return;
    if (containerAnimation === null) return;

    const steps = ladderKey.split(',').map(Number);
    const last = Math.max(1, steps.length - 1);
    const scrollerEl = scroller?.current ?? undefined;
    const horizontal = containerAnimation !== undefined;

    const ctx = gsap.context(() => {
      for (const el of Array.from(rootEl.querySelectorAll<HTMLElement>('[data-depth]'))) {
        const raw = Number.parseInt(el.dataset.depth ?? '0', 10);
        const depth = clamp(Number.isFinite(raw) ? raw : 0, 0, last);
        // Normalised depth drives distance; the ladder drives lag. Distance
        // alone collapses the moment the scroll stops — the lag is what keeps
        // the planes apart while the eye is still moving.
        const amount = (depth / last) * travel;
        const scrub = steps[depth] ?? 0;

        gsap.fromTo(
          el,
          { yPercent: -amount },
          {
            yPercent: amount,
            ease: 'none',
            scrollTrigger: {
              trigger: el,
              scroller: scrollerEl,
              // Full-crossing window: the layer starts moving as it enters
              // and stops as it leaves, so no layer is ever mid-jump on load.
              start: horizontal ? 'left right' : 'top bottom',
              end: horizontal ? 'right left' : 'bottom top',
              scrub: scrub === 0 ? true : scrub,
              ...(containerAnimation ? { containerAnimation } : {}),
            },
          },
        );
      }
    }, rootEl);

    return () => ctx.revert();
  }, [scroller, containerAnimation, ladderKey, travel, reduced]);
  // #endregion critical

  return (
    <div ref={root} className={cn(className)}>
      {children}
    </div>
  );
}
