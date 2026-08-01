'use client';

import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { Fragment, useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';

/* ==========================================================================
   Scrubbed Character Colour Reveal
   --------------------------------------------------------------------------
   A paragraph sitting at 16% strength resolves character by character as it
   crosses the viewport, the reveal position pinned to the scrollbar rather
   than to a clock. Scroll back up and the characters ghost out again in
   reverse, because a scrubbed timeline is a function of position, not a
   playback.

   The stagger and the durations are *ratios*, not seconds. ScrollTrigger maps
   the timeline's total length onto the distance between `start` and `end`, so
   `stagger: 0.1` with `duration: 0.35` means "each character begins 0.1/total
   of the way through the scroll range and takes 0.35/total to resolve". Change
   the paragraph length and the pacing per character is unchanged; change the
   scroll range and everything rescales together.

   `scrub: 0.75` rather than `scrub: true`. `true` welds the reveal to the
   scrollbar exactly, which on a trackpad exposes every jitter in the input.
   Three quarters of a second of catch-up smooths the input without ever
   feeling like the text is animating on its own.
   ========================================================================== */

export interface ScrubCharColorRevealProps {
  /** Body copy. Split to words then characters in JSX. */
  text: string;
  /** Resting strength of an unrevealed character, 0-1. */
  dim?: number;
  /** Timeline units between adjacent characters. */
  stagger?: number;
  /** Timeline units for one character to resolve. */
  charDuration?: number;
  /** Seconds of catch-up between the scrollbar and the reveal. */
  scrub?: number;
  start?: string;
  end?: string;
  /** Scroll container, when the text is not in the document scroller. */
  scroller?: Element | null;
  className?: string;
}

// #region critical
const DIM = 0.16;
const STAGGER = 0.1;
const CHAR_DURATION = 0.35;
const SCRUB = 0.75;
const START = 'top 78%';
const END = 'bottom 55%';

export function ScrubCharColorReveal({
  text,
  dim = DIM,
  stagger = STAGGER,
  charDuration = CHAR_DURATION,
  scrub = SCRUB,
  start = START,
  end = END,
  scroller = null,
  className,
}: ScrubCharColorRevealProps) {
  const root = useRef<HTMLParagraphElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = root.current;
    if (!el || reduced) return;

    gsap.registerPlugin(ScrollTrigger);

    const chars = Array.from(el.querySelectorAll<HTMLElement>('[data-char]'));
    if (chars.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.to(chars, {
        opacity: 1,
        duration: charDuration,
        ease: 'power1.out',
        stagger,
        scrollTrigger: {
          trigger: el,
          scroller: scroller ?? undefined,
          start,
          end,
          scrub,
        },
      });
    }, el);

    return () => ctx.revert();
  }, [text, dim, stagger, charDuration, scrub, start, end, scroller, reduced]);
  // #endregion critical

  const idle = reduced ? 1 : dim;
  const words = text.split(' ');

  return (
    <p
      ref={root}
      className={cn('text-balance', className)}
      // The characters are decoration; the paragraph is read once, whole.
      // Without this a screen reader announces two hundred single letters.
      aria-label={text}
    >
      <span aria-hidden>
        {words.map((w, wi) => (
          <Fragment key={`${wi}-${w}`}>
            {/* Word boxes keep line breaks between words. Splitting straight
                to characters lets a line break land inside a word. */}
            <span className="inline-block whitespace-nowrap">
              {Array.from(w).map((ch, ci) => (
                <span
                  key={ci}
                  data-char
                  className="inline-block"
                  style={{ opacity: idle }}
                >
                  {ch}
                </span>
              ))}
            </span>
            {wi < words.length - 1 ? ' ' : null}
          </Fragment>
        ))}
      </span>
    </p>
  );
}
