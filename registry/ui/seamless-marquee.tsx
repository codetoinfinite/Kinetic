'use client';

import gsap from 'gsap';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useInView } from '@/registry/hooks/use-in-view';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { useVisibility } from '@/registry/hooks/use-visibility';

/* ==========================================================================
   Pixels-Per-Second Marquee
   --------------------------------------------------------------------------
   Speed is px/second and duration is derived from it — never the other way
   round. `duration: 20` means a 900 px strip crawls and a 4000 px strip
   sprints, so two marquees on the same page visibly disagree about how fast
   "scrolling" is, and adding one word to either changes its speed. Measure the
   content, divide by the speed you want, and every marquee on the site moves
   at the same rate regardless of what is in it.

     duration = setWidth / speed      (seconds = px / (px/s))

   Seamlessness comes from the loop distance being exactly one content set.
   The track translates from 0 to -setWidth and repeats; at the wrap, copy 2 is
   sitting precisely where copy 1 was, so the restart is invisible. Any other
   distance produces a jump on every cycle.

   Copies are computed, not guessed: `ceil(containerWidth / setWidth) + 1`. The
   `+ 1` is the copy that covers the gap opened up by the translation itself —
   with the exact ceiling you get a blank wedge at the right edge for the last
   frame of every cycle.
   ========================================================================== */

export interface SeamlessMarqueeProps {
  /** One content set. Cloned as many times as the container needs. */
  children: ReactNode;
  /** Pixels per second. Identical for every marquee, whatever its width. */
  speed?: number;
  direction?: 'left' | 'right';
  /** Pixels between items, and between the last item and the next copy. */
  gap?: number;
  pauseOnHover?: boolean;
  className?: string;
}

// #region critical
const SPEED = 60;
const GAP = 48;
const HOVER_RAMP = 0.35;

export function SeamlessMarquee({
  children,
  speed = SPEED,
  direction = 'left',
  gap = GAP,
  pauseOnHover = true,
  className,
}: SeamlessMarqueeProps) {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const tween = useRef<gsap.core.Tween | null>(null);

  const reduced = useReducedMotion();
  const visible = useVisibility();
  const { inView } = useInView(root);
  const { width: rootWidth } = useResizeObserver(root);
  const { width: copyWidth } = useResizeObserver(copy);

  // The loop distance is one copy *plus* the gap that follows it — the gap is
  // part of the repeating unit. Leave it out and the rhythm of the seam is one
  // gap tighter than the rhythm everywhere else, which reads as a stutter.
  const setWidth = copyWidth + gap;
  const measured = copyWidth > 0;
  const copies =
    reduced || !measured ? 1 : Math.max(2, Math.ceil(rootWidth / setWidth) + 1);

  useEffect(() => {
    const el = track.current;
    if (!el || reduced || !measured) return;

    const duration = setWidth / speed;
    const t = gsap.fromTo(
      el,
      { x: direction === 'left' ? 0 : -setWidth },
      {
        x: direction === 'left' ? -setWidth : 0,
        duration,
        ease: 'none',
        repeat: -1,
      },
    );
    tween.current = t;

    return () => {
      tween.current = null;
      // Kill the hover timeScale tweens too — they target the tween object
      // itself, so killTweensOf(el) would not reach them.
      gsap.killTweensOf(t);
      t.kill();
      gsap.set(el, { clearProps: 'transform' });
    };
  }, [setWidth, measured, speed, direction, reduced]);

  // Separate effect so a visibility flip pauses in place instead of rebuilding
  // the tween, which would snap the strip back to its start position.
  useEffect(() => {
    const t = tween.current;
    if (!t) return;
    t.paused(!(visible && inView));
  }, [visible, inView, setWidth, measured, speed, direction, reduced]);

  const ramp = useCallback(
    (to: number) => {
      const t = tween.current;
      if (!pauseOnHover || !t) return;
      gsap.to(t, { timeScale: to, duration: HOVER_RAMP, overwrite: true });
    },
    [pauseOnHover],
  );
  // #endregion critical

  return (
    <div
      ref={root}
      className={cn('relative w-full overflow-hidden', className)}
      onPointerEnter={() => ramp(0)}
      onPointerLeave={() => ramp(1)}
    >
      <div
        ref={track}
        className="flex w-max will-change-transform"
        style={{ gap }}
      >
        {Array.from({ length: copies }, (_, i) => (
          <div
            key={i}
            ref={i === 0 ? copy : undefined}
            // Only the first copy is real content. The clones are decoration
            // and would otherwise be read out three times in a row.
            aria-hidden={i > 0 || undefined}
            className="flex shrink-0 items-center"
            style={{ gap }}
          >
            {children}
          </div>
        ))}
      </div>
    </div>
  );
}
