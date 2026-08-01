'use client';

import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { cn } from '@/lib/cn';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { clamp, damp } from '@/registry/lib/damp';

/* ==========================================================================
   Inverse Scroll Scale
   --------------------------------------------------------------------------
   The usual scroll-scale grows an image as it rises. This one shrinks it:
   the media starts oversized at 1.25x and settles to exactly 1.0 as its top
   edge climbs through the first 60% of the scroller. It resolves *into* its
   frame instead of bursting out of it.

   Two details carry the whole effect.

   1. The 0.6 divisor. Scaling over the full viewport height means the image
      is still moving while you are already reading it. Finishing at 60%
      means it is at rest for the entire time it is the thing you are
      looking at — the motion is an arrival, not an ongoing state.

   2. It lands on exactly 1.0, so the frame is filled by construction. Any
      scale below 1 on an element sized to its frame would show a seam, so
      `from` must be >= 1 and the end of the ramp must be the identity.

   No GSAP. One rAF callback, gated by an IntersectionObserver so an
   off-screen instance costs nothing, and one transform write per frame.
   ========================================================================== */

export interface InverseScrollScaleProps {
  /** The media. Sized to fill the frame; it is what gets scaled. */
  children: ReactNode;
  /** Starting scale. Must be >= 1 or the frame shows through at the edges. */
  from?: number;
  /**
   * Fraction of the scroller height over which the scale resolves, measured
   * from the bottom edge upward. 0.6 finishes well before the top.
   */
  span?: number;
  /**
   * Fraction of the remaining gap left after one second. 0 writes the scroll
   * position straight through, which is the sharp, correct default.
   */
  smoothing?: number;
  /** The scroll container that owns the scroll position. Omit for the document. */
  scrollerRef?: RefObject<HTMLElement | null>;
  className?: string;
}

// #region critical
export function InverseScrollScale({
  children,
  from = 1.25,
  span = 0.6,
  smoothing = 0,
  scrollerRef,
  className,
}: InverseScrollScaleProps) {
  const frame = useRef<HTMLDivElement>(null);
  const media = useRef<HTMLDivElement>(null);
  const active = useRef(false);
  const scale = useRef(from);
  const written = useRef(-1);
  const reduced = useReducedMotion();

  // Gate the rAF work on visibility. Hand-rolled rather than `useInView`
  // because the observer needs a custom `root` — the demo's own scroller —
  // and a pooled observer keyed only by threshold would hand back one rooted
  // at the document.
  useEffect(() => {
    const el = frame.current;
    if (!el || reduced) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) active.current = entry.isIntersecting;
      },
      { root: scrollerRef?.current ?? null, rootMargin: '20% 0px 20% 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reduced, scrollerRef]);

  useRaf(
    (dt) => {
      const el = frame.current;
      const target = media.current;
      if (!el || !target || !active.current) return;

      // One read pass, then one write pass. Reading the rect after writing a
      // transform in the same frame forces a synchronous layout.
      const scroller = scrollerRef?.current ?? null;
      const rect = el.getBoundingClientRect();
      const height = scroller ? scroller.clientHeight : window.innerHeight;
      const top = scroller ? rect.top - scroller.getBoundingClientRect().top : rect.top;

      // t is 0 while the frame's top edge is at the bottom of the scroller and
      // reaches 1 once it has risen `span` of the scroller's height.
      const t = clamp((height - top) / (span * height), 0, 1);
      const wanted = from - (from - 1) * t;

      scale.current =
        smoothing > 0 ? damp(scale.current, wanted, smoothing, dt) : wanted;

      // Four decimals is below one device pixel on a 4000px element, and the
      // equality check skips the style write on the many frames where nothing
      // changed — an idle instance then costs a rect read and nothing else.
      const next = Number(scale.current.toFixed(4));
      if (next === written.current) return;
      written.current = next;
      target.style.transform = `scale(${next})`;
    },
    !reduced,
  );
  // #endregion critical

  return (
    <div ref={frame} className={cn('relative overflow-hidden', className)}>
      <div
        ref={media}
        className="h-full w-full will-change-transform"
        // Reduced motion renders the resolved state: scale 1, frame filled.
        style={{ transform: `scale(${reduced ? 1 : from})` }}
      >
        {children}
      </div>
    </div>
  );
}
