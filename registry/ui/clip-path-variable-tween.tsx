'use client';

import gsap from 'gsap';
import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useGsap } from '@/registry/hooks/use-gsap';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';

/* ==========================================================================
   CSS Variable Clip-Path Tween
   --------------------------------------------------------------------------
   Tween a CSS custom property, not a CSS property:

     gsap.to(el, { '--kx-clip': '0% 0% 0% 0%', ease: 'power3.inOut' })

   The element clips itself with `inset(var(--kx-clip))` — and so does anything
   else that wants to. Custom properties inherit, so one tween on the stage
   drives every descendant carrying `.kx-clip-follow`: a caption, a rule, a
   second panel, all clipping in lockstep with no extra tweens and no chance of
   drift. Tweening `clipPath` on each of them instead means N tweens that agree
   only as long as nobody edits one of them.

   GSAP handles this because CSSPlugin special-cases any property starting with
   `--`: it reads the start value with `getComputedStyle().getPropertyValue()`
   and writes with `style.setProperty()`, and because neither end of the tween
   is a plain number it routes through the complex-string interpolator, which
   walks both strings and interpolates every number it finds pairwise. Four
   percentages in, four percentages out.

   The whole reveal is ONE paused timeline played forward and reversed, which is
   not laziness — reversing is exactly the behaviour the source had for its
   exit. A reversed positive stagger runs last-element-first, and a reversed
   `scale: 1.4 -> 1` runs `1 -> 1.4`, so the panel leaves with the lines peeling
   off in reverse and the media still pushing in.
   ========================================================================== */

// #region critical
/** `inset(top right bottom left)`. Top at 100% collapses the box entirely. */
const CLIP_SHUT = '100% 0% 0% 0%';
const CLIP_OPEN = '0% 0% 0% 0%';

/**
 * Media scale outlives the clip by half again. The clip is the event; the push
 * continuing past it is what stops the panel feeling like it stopped dead.
 */
const MEDIA_DURATION_RATIO = 1.5;
const LINE_DURATION_RATIO = 0.6;
/** Lines start when the clip is a third open — before that they are hidden. */
const LINE_OFFSET_RATIO = 0.35;

const CLIP_CSS = `
.kx-clip-stage {
  /* Declared in CSS, never in React's inline style: GSAP writes the tweened
     value to the inline style, and a React re-render would reset it mid-tween.
     It also has to be declared SOMEWHERE — an undeclared custom property
     computes to the empty string, and a tween with no start value snaps. */
  --kx-clip: ${CLIP_SHUT};
  clip-path: inset(var(--kx-clip));
}
/* Any descendant clipped by the same inherited variable. */
.kx-clip-follow {
  clip-path: inset(var(--kx-clip));
}
`;

export interface ClipPathVariableTweenProps {
  /** `true` reveals, `false` clips away. Every change plays or reverses. */
  open: boolean;
  /**
   * Content. Two opt-in hooks:
   * `[data-clip-media]` is pushed from `mediaScale` to 1, and
   * `[data-clip-line]` slides up from 120% with a stagger.
   */
  children: ReactNode;
  /** Seconds for the clip itself. Media and lines are derived ratios of it. */
  duration?: number;
  /** Scale the media starts at. 1 disables the push. */
  mediaScale?: number;
  /** Seconds between lines. Reversed on exit, so the last line leaves first. */
  lineStagger?: number;
  className?: string;
}

export function ClipPathVariableTween({
  open,
  children,
  duration = 1.2,
  mediaScale = 1.4,
  lineStagger = 0.125,
  className,
}: ClipPathVariableTweenProps) {
  const root = useRef<HTMLDivElement>(null);
  const timeline = useRef<ReturnType<typeof gsap.timeline> | null>(null);
  const reduced = useReducedMotion();

  // Built once and held paused. Rebuilding it per `open` change would be
  // wrong twice over: `gsap.context().revert()` strips the inline value GSAP
  // wrote, so a closing tween would read the CSS default — fully shut — as its
  // start and animate from nowhere to nowhere.
  useGsap(
    gsap,
    () => {
      const el = root.current;
      if (!el) return;

      const media = el.querySelectorAll<HTMLElement>('[data-clip-media]');
      const lines = el.querySelectorAll<HTMLElement>('[data-clip-line]');

      const tl = gsap.timeline({ paused: true });

      tl.fromTo(
        el,
        { '--kx-clip': CLIP_SHUT },
        { '--kx-clip': CLIP_OPEN, duration, ease: 'power3.inOut' },
        0,
      );

      if (media.length > 0) {
        tl.fromTo(
          media,
          { scale: mediaScale },
          {
            scale: 1,
            duration: duration * MEDIA_DURATION_RATIO,
            ease: 'power2.out',
          },
          0,
        );
      }

      if (lines.length > 0) {
        tl.fromTo(
          lines,
          { yPercent: 120 },
          {
            yPercent: 0,
            duration: duration * LINE_DURATION_RATIO,
            ease: 'power3.out',
            stagger: lineStagger,
          },
          duration * LINE_OFFSET_RATIO,
        );
      }

      timeline.current = tl;
      return () => {
        timeline.current = null;
      };
    },
    root,
    [duration, mediaScale, lineStagger],
  );

  // Same dependency list plus `open`, so this always runs after the effect
  // above has rebuilt the timeline rather than driving a stale one.
  useEffect(() => {
    const tl = timeline.current;
    if (!tl) return;

    if (reduced) {
      // A jump, not a zero-duration tween: the timeline is seeked to the
      // correct end state and stays paused there. Clip, scale and line offsets
      // all land correctly because they are all on this one timeline.
      tl.progress(open ? 1 : 0).pause();
      return;
    }

    if (open) tl.play();
    else tl.reverse();
  }, [open, reduced, duration, mediaScale, lineStagger]);

  return (
    <div ref={root} className={cn('kx-clip-stage', className)}>
      <style href="kinetic-clip-path-variable-tween" precedence="medium">
        {CLIP_CSS}
      </style>
      {children}
    </div>
  );
}
// #endregion critical
