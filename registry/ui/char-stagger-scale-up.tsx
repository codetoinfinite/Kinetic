'use client';

import gsap from 'gsap';
import { Fragment, useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useInView } from '@/registry/hooks/use-in-view';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';

/* ==========================================================================
   Char Stagger Then Scale-Up
   --------------------------------------------------------------------------
   The order is the whole trick. The word is already on screen — small and
   ghosted, reading as a label rather than a headline. Characters resolve one
   at a time, left to right. Then, just as the last character lands, the whole
   word scales to full size with an overshoot. It assembles itself, and then
   it asserts itself.

   Three timeline positions do the choreography:

     `">-0.05"`  the scale starts 50 ms *before* the last character finishes,
                 so the two phases overlap and read as one gesture.
     `"<0.25"`   the supporting copy starts 250 ms after the *scale began*,
                 so the page is never doing only one thing at a time.

   The dim state is opacity on `currentColor`, not a literal grey. A hardcoded
   `#3d3d3d` is invisible on a light background and wrong the moment the
   component is dropped into a themed page; 24% of whatever the text colour
   already is composites correctly against anything.
   ========================================================================== */

export interface CharStaggerScaleUpProps {
  /** Headline. Split per character in JSX — React owns every span. */
  text: string;
  /** Supporting copy. Fades up after the scale has started. */
  children?: ReactNode;
  /** Starting scale of the whole word. */
  scaleFrom?: number;
  /** Starting opacity of each character. */
  dimOpacity?: number;
  /** Seconds between character reveals. */
  charStagger?: number;
  /** Seconds for one character to resolve. */
  charDuration?: number;
  /** Seconds for the scale-up. */
  scaleDuration?: number;
  /** `back.out(overshoot)`. How far past 100% the word travels. */
  overshoot?: number;
  delay?: number;
  startOnView?: boolean;
  className?: string;
  textClassName?: string;
}

// #region critical
const SCALE_FROM = 0.42;
const DIM_OPACITY = 0.24;
const CHAR_STAGGER = 0.07;
const CHAR_DURATION = 0.28;
const SCALE_DURATION = 0.9;
const OVERSHOOT = 1.3;
const FADE_DURATION = 0.7;
const FADE_STAGGER = 0.12;
const FADE_Y = 18;
const VIEW_THRESHOLD = 0.35;

export function CharStaggerScaleUp({
  text,
  children,
  scaleFrom = SCALE_FROM,
  dimOpacity = DIM_OPACITY,
  charStagger = CHAR_STAGGER,
  charDuration = CHAR_DURATION,
  scaleDuration = SCALE_DURATION,
  overshoot = OVERSHOOT,
  delay = 0,
  startOnView = true,
  className,
  textClassName,
}: CharStaggerScaleUpProps) {
  const root = useRef<HTMLDivElement>(null);
  const word = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const { inView } = useInView(root, { threshold: VIEW_THRESHOLD, once: true });

  useEffect(() => {
    const el = root.current;
    const wordEl = word.current;
    // Reduced motion needs no branch here: the idle state written into the
    // JSX below is already the finished state, so doing nothing is correct.
    if (!el || !wordEl || reduced) return;
    if (startOnView && !inView) return;

    const chars = Array.from(el.querySelectorAll<HTMLElement>('[data-char]'));
    const fades = Array.from(el.querySelectorAll<HTMLElement>('[data-fade]'));

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay });

      tl.to(chars, {
        opacity: 1,
        duration: charDuration,
        ease: 'power1.out',
        stagger: charStagger,
      }).to(
        wordEl,
        {
          scale: 1,
          duration: scaleDuration,
          ease: `back.out(${overshoot})`,
          // Set explicitly even though it is the default: a block-level
          // heading inside a flex column can inherit an origin from an
          // earlier transform, and the word then grows out of one corner.
          transformOrigin: '50% 50%',
        },
        '>-0.05',
      );

      if (fades.length > 0) {
        tl.to(
          fades,
          {
            opacity: 1,
            y: 0,
            duration: FADE_DURATION,
            ease: 'power3.out',
            stagger: FADE_STAGGER,
          },
          '<0.25',
        );
      }
    }, el);

    // revert(), not kill(): it also strips the inline transform and opacity
    // GSAP wrote, handing the nodes back in exactly the state React rendered.
    return () => ctx.revert();
  }, [
    text,
    reduced,
    inView,
    startOnView,
    delay,
    charDuration,
    charStagger,
    scaleDuration,
    overshoot,
  ]);
  // #endregion critical

  const idleScale = reduced ? 1 : scaleFrom;
  const idleChar = reduced ? 1 : dimOpacity;
  const words = text.split(' ');

  return (
    <div ref={root} className={cn('flex flex-col items-center', className)}>
      <span
        ref={word}
        className={cn('inline-block will-change-transform', textClassName)}
        style={{ transform: `scale(${idleScale})`, transformOrigin: '50% 50%' }}
      >
        {words.map((w, wi) => (
          <Fragment key={`${wi}-${w}`}>
            {/* One inline-block per word so a line break never lands between
                two characters of the same word. The space between words is a
                real text node outside the box, so lines still wrap. */}
            <span className="inline-block whitespace-nowrap">
              {Array.from(w).map((ch, ci) => (
                <span
                  key={ci}
                  data-char
                  className="inline-block"
                  style={{ opacity: idleChar }}
                >
                  {ch}
                </span>
              ))}
            </span>
            {wi < words.length - 1 ? ' ' : null}
          </Fragment>
        ))}
      </span>

      {children ? (
        <div
          data-fade
          style={{
            opacity: reduced ? 1 : 0,
            transform: reduced ? undefined : `translateY(${FADE_Y}px)`,
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
