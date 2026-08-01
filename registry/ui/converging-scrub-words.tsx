'use client';

import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';

/* ==========================================================================
   Converging Headline Words
   --------------------------------------------------------------------------
   A two-word headline assembles out of the margins as you approach it. The
   first word enters from -120% of its own width, the second from +120%, and
   both land on zero at the same scrub position — they cross the frame in
   opposite directions and lock into a sentence.

   `ease: 'none'` on both tweens, deliberately. Under `scrub` the scroll
   position *is* the easing curve; layering `power2.out` on top means the words
   accelerate away from the scrollbar and then wait for it, which is the exact
   sensation people describe as "the scroll feels sticky".

   ±120%, not ±100%: at exactly 100% a word starts flush against the frame
   edge and is already peeking in on the first pixel of scroll. The extra 20%
   buys a moment of empty margin before it arrives.
   ========================================================================== */

export interface ConvergingScrubWordsProps {
  /** Even indices enter from the left, odd from the right. */
  words: string[];
  /** Percent of each word's own width. */
  travel?: number;
  /** Seconds of catch-up between the scrollbar and the words. */
  scrub?: number;
  /** ScrollTrigger `start`. */
  start?: string;
  /** ScrollTrigger `end`. */
  end?: string;
  /** Scroll container, when the headline is not in the document scroller. */
  scroller?: Element | null;
  className?: string;
}

// #region critical
const TRAVEL = 120;
const SCRUB = 1;
const START = 'top bottom';
const END = 'top 25%';

export function ConvergingScrubWords({
  words,
  travel = TRAVEL,
  scrub = SCRUB,
  start = START,
  end = END,
  scroller = null,
  className,
}: ConvergingScrubWordsProps) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = root.current;
    // Reduced motion: the JSX below already renders the assembled headline at
    // its final position, so declining to attach the trigger is the whole
    // implementation. Nothing is hidden and nothing is left off-screen.
    if (!el || reduced) return;

    // Registered here rather than at module scope: registerPlugin touches
    // window, and this file is still evaluated during server rendering.
    gsap.registerPlugin(ScrollTrigger);

    const wordEls = Array.from(el.querySelectorAll<HTMLElement>('[data-word]'));
    if (wordEls.length === 0) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          scroller: scroller ?? undefined,
          start,
          end,
          scrub,
        },
      });

      wordEls.forEach((w, i) => {
        // fromTo, not to. A bare `to` would read the start value off the DOM,
        // and the DOM already says 0 because the inline style below is the
        // final position for the no-JS and reduced-motion renders.
        tl.fromTo(
          w,
          { xPercent: i % 2 === 0 ? -travel : travel },
          { xPercent: 0, ease: 'none' },
          0,
        );
      });
    }, el);

    return () => ctx.revert();
  }, [words, travel, scrub, start, end, scroller, reduced]);
  // #endregion critical

  return (
    // overflow-x: clip, not hidden. Both stop a word translated 120% to the
    // right from adding a horizontal scrollbar to the whole document; only
    // `clip` leaves vertical overflow alone, so descenders and any sticky
    // ancestor keep working. `hidden` on one axis forces `auto` on the other.
    <div
      ref={root}
      className={cn(
        'w-full overflow-x-clip text-[clamp(44px,12vw,160px)] leading-[0.95] tracking-[-0.04em]',
        className,
      )}
    >
      {words.map((word, i) => (
        <span
          key={`${i}-${word}`}
          data-word
          className={cn(
            'block will-change-transform',
            i % 2 === 0 ? 'text-left' : 'text-right',
          )}
        >
          {word}
        </span>
      ))}
    </div>
  );
}
