'use client';

import { useEffect, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLenis } from '@/registry/hooks/use-lenis';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';

/* ==========================================================================
   Lenis On The GSAP Ticker
   --------------------------------------------------------------------------
   Smooth scroll and ScrollTrigger both work. Together, unwired, they tear:
   Lenis advances the scroll position on its own rAF, ScrollTrigger samples
   it on GSAP's, and a pinned section is a frame behind the page it is
   pinned to. You see it as a hairline seam that shivers under the pin.

   The fix is three lines, and the third is the one everybody omits:

     gsap.ticker.add((t) => lenis.raf(t * 1000));   // one clock, not two
     lenis.on('scroll', ScrollTrigger.update);      // sample on write, not on rAF
     gsap.ticker.lagSmoothing(0);                   // stop GSAP lying about time

   `lagSmoothing` normally clamps a large `deltaTime` after a stall so tweens
   do not jump. But Lenis is being driven BY that deltaTime and integrates
   real elapsed time internally. If GSAP under-reports, Lenis's idea of the
   scroll position drifts away from ScrollTrigger's — permanently, because
   nothing ever resyncs them. Disabling lag smoothing makes the two agree.

   Mount this once, near the root, above everything that uses ScrollTrigger.
   ========================================================================== */

// Registering twice is harmless, but the guard keeps it off the server, where
// ScrollTrigger touches `document` on registration.
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Lenis's own default: a decaying exponential that is ~99.9% settled at t=1.
 * Module scope on purpose — `useLenis` keys its effect on this identity, and
 * an inline arrow would rebuild the whole instance on every render.
 */
const DEFAULT_EASING = (t: number): number => Math.min(1, 1.001 - Math.pow(2, -10 * t));

export interface LenisGsapTickerProps {
  children?: ReactNode;
  /** Seconds for a wheel step to settle. */
  duration?: number;
  /** Must be a stable reference — see `DEFAULT_EASING`. */
  easing?: (t: number) => number;
  /**
   * Hold input without tearing the instance down. This is the preloader gate:
   * construct on mount so everything is ready, but refuse wheel events until
   * the intro is off screen.
   */
  paused?: boolean;
  /** Set false to opt a subtree out entirely — native scrolling is restored. */
  enabled?: boolean;
}

// #region critical
export function LenisGsapTicker({
  children,
  duration = 1.05,
  easing = DEFAULT_EASING,
  paused = false,
  enabled = true,
}: LenisGsapTickerProps) {
  const reduced = useReducedMotion();
  // Smooth scrolling is the motion. Under `prefers-reduced-motion` the
  // instance is never built at all, so the page scrolls natively and
  // ScrollTrigger reads the native position — which it already does correctly.
  const active = enabled && !reduced;

  const lenis = useLenis({
    duration,
    easing,
    smoothWheel: true,
    enabled: active,
    // One clock. `useLenis` turns off Lenis's `autoRaf` when a ticker is
    // present and calls `lagSmoothing(0)` on it.
    ticker: gsap.ticker,
    // Sampled on scroll rather than every frame: ScrollTrigger then updates on
    // the same tick the position changed, instead of one frame later.
    onScroll: () => ScrollTrigger.update(),
  });

  useEffect(() => {
    const instance = lenis.current;
    if (!instance) return;
    if (paused) {
      instance.stop();
      return;
    }
    instance.start();
    // Whatever was covering the page while paused was almost certainly holding
    // layout at a different height.
    ScrollTrigger.refresh();
  }, [lenis, paused]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const refresh = () => {
      if (!cancelled) ScrollTrigger.refresh();
    };

    // Images and fonts change document height after hydration. Without a
    // refresh here, every trigger below the fold is measured against a height
    // that no longer exists, and they all fire early by the difference.
    if (document.readyState === 'complete') refresh();
    else window.addEventListener('load', refresh, { once: true });
    void document.fonts?.ready.then(refresh);

    return () => {
      cancelled = true;
      window.removeEventListener('load', refresh);
    };
  }, [active]);
  // #endregion critical

  return <>{children}</>;
}
