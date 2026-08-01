'use client';

import gsap from 'gsap';
import { Fragment, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useInView } from '@/registry/hooks/use-in-view';
import { createRng, randInt } from '@/registry/lib/prng';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';

/* ==========================================================================
   Letter Scramble
   --------------------------------------------------------------------------
   The word assembles itself out of noise. Every character flips through a
   handful of wrong glyphs and then lands on the right one, each character
   starting 0.1 s after the one before it, so the resolution sweeps left to
   right across the word.

   The deceleration is what makes it read as *settling* rather than as a
   loading spinner: flip n holds for `0.08 + n * 0.025` seconds, so the first
   substitutions are a blur and the last is almost a beat. Constant-interval
   flipping reads as a slot machine that was switched off.

   Widths are frozen before the first substitution. Proportional type gives
   `i` and `W` wildly different advance widths, so a word scrambling through
   random glyphs visibly breathes — and every element after it on the line
   shudders in sympathy. Each character box is pinned to the width of its
   final glyph for the duration, then released.
   ========================================================================== */

export interface LetterScrambleProps {
  /** The resolved word. Rendered as-is for SSR, reduced motion, and AT. */
  text: string;
  /** Substitution pool. Keep it to glyphs of similar visual weight. */
  glyphs?: string;
  /** Wrong glyphs shown per character before it resolves. */
  flips?: number;
  /** Seconds between adjacent characters starting. */
  stagger?: number;
  /** Seconds the first wrong glyph is held. */
  baseFlip?: number;
  /** Seconds added to each successive hold. This is the deceleration. */
  flipGrowth?: number;
  /** Seconds of the fade that lands with the final glyph. */
  settle?: number;
  /** Re-run on pointer enter, on fine pointers only. */
  replayOnHover?: boolean;
  startOnView?: boolean;
  /** Any string or number. Same seed, same sequence, every render. */
  seed?: number | string;
  className?: string;
}

// #region critical
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&@$*';
const FLIPS = 7;
const STAGGER = 0.1;
const BASE_FLIP = 0.08;
const FLIP_GROWTH = 0.025;
const SETTLE = 0.45;
const START_DELAY = 0.25;
const DIM = 0.35;
const VIEW_THRESHOLD = 0.4;

export function LetterScramble({
  text,
  glyphs = GLYPHS,
  flips = FLIPS,
  stagger = STAGGER,
  baseFlip = BASE_FLIP,
  flipGrowth = FLIP_GROWTH,
  settle = SETTLE,
  replayOnHover = true,
  startOnView = true,
  seed,
  className,
}: LetterScrambleProps) {
  const root = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const { inView } = useInView(root, { threshold: VIEW_THRESHOLD, once: true });
  const [run, setRun] = useState(0);

  useEffect(() => {
    const el = root.current;
    if (!el || reduced) return;
    if (startOnView && !inView) return;

    const chars = Array.from(el.querySelectorAll<HTMLElement>('[data-char]'));
    if (chars.length === 0 || glyphs.length === 0) return;

    // Seeded, never Math.random: the glyph sequence decides what is painted
    // on the first client frame, and a server/client disagreement about that
    // is a hydration mismatch.
    const rng = createRng(seed ?? `${text}:${run}`);

    let cancelled = false;
    let tl: gsap.core.Timeline | null = null;

    const restore = () => {
      for (const c of chars) {
        c.textContent = c.dataset.final ?? '';
        c.style.width = '';
        c.style.opacity = '';
      }
    };

    const build = () => {
      if (cancelled) return;

      // Measured after fonts are ready, and measured from the *final* glyph,
      // which is what is in the DOM right now. Measuring a substituted glyph
      // would lock in the wrong box.
      for (const c of chars) {
        c.style.width = `${c.getBoundingClientRect().width}px`;
      }

      tl = gsap.timeline();

      chars.forEach((c, i) => {
        const final = c.dataset.final ?? '';
        let t = START_DELAY + i * stagger;

        for (let f = 0; f < flips; f += 1) {
          const g = glyphs.charAt(randInt(rng, 0, glyphs.length));
          tl?.call(
            () => {
              c.textContent = g;
            },
            undefined,
            t,
          );
          t += baseFlip + f * flipGrowth;
        }

        tl?.call(
          () => {
            c.textContent = final;
          },
          undefined,
          t,
        );
        // The fade is what separates "resolved" from "one more wrong glyph".
        tl?.fromTo(
          c,
          { opacity: DIM },
          { opacity: 1, duration: settle, ease: 'power3.out' },
          t,
        );
      });

      // Release the frozen widths once nothing is substituting any more, so
      // the word reflows normally if the viewport or the font changes later.
      tl?.call(
        () => {
          for (const c of chars) c.style.width = '';
        },
        undefined,
        '>',
      );
    };

    // Splitting or measuring before the webfont lands measures the fallback,
    // and every character box is then frozen to the wrong width.
    void document.fonts.ready.then(build);

    return () => {
      cancelled = true;
      tl?.kill();
      restore();
    };
  }, [
    text,
    glyphs,
    flips,
    stagger,
    baseFlip,
    flipGrowth,
    settle,
    seed,
    startOnView,
    inView,
    reduced,
    run,
  ]);
  // #endregion critical

  const replay = () => {
    if (!replayOnHover || reduced) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    setRun((n) => n + 1);
  };

  const words = text.split(' ');

  return (
    <span
      ref={root}
      className={cn('inline-block', className)}
      onPointerEnter={replay}
    >
      {/* The visible characters are mutated to garbage mid-flight, so they are
          hidden from assistive tech and the real word is exposed once. */}
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((w, wi) => (
          <Fragment key={`${wi}-${w}`}>
            <span className="inline-block whitespace-nowrap">
              {Array.from(w).map((ch, ci) => (
                <span
                  key={ci}
                  data-char
                  data-final={ch}
                  className="inline-block text-center"
                >
                  {ch}
                </span>
              ))}
            </span>
            {wi < words.length - 1 ? ' ' : null}
          </Fragment>
        ))}
      </span>
    </span>
  );
}
