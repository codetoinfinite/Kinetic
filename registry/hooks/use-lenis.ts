'use client';

import Lenis from 'lenis';
import { useEffect, useRef } from 'react';

/* ==========================================================================
   One Lenis instance, driven by whichever clock is already running.
   --------------------------------------------------------------------------
   Two failure modes this exists to prevent:

   1. Two rAF loops. Lenis self-drives via `autoRaf` by default. If GSAP's
      ticker is also running, scroll position advances on one clock while
      ScrollTrigger reads it on another, and pinned sections jitter by a
      frame. Passing a `ticker` disables `autoRaf` and hands Lenis to that
      clock instead — the documented integration.

   2. Two Lenis instances. Mount a second one and both listen on `wheel`,
      both call `preventDefault`, and scrolling runs at double speed. The
      module-level refcount below makes a second mount reuse the first
      instance rather than build a rival.
   ========================================================================== */

export interface LenisTicker {
  add: (fn: (time: number) => void) => void;
  remove: (fn: (time: number) => void) => void;
  /**
   * `threshold` is required, matching `gsap.ticker`, which types it as
   * `number | boolean`. Declaring it optional here made the parameter
   * `number | undefined` and no longer satisfiable by GSAP's own ticker.
   */
  lagSmoothing?: (threshold: number, adjustedLag?: number) => void;
}

export interface UseLenisOptions {
  /** Seconds to settle. Ignored when `easing` drives duration. */
  duration?: number;
  easing?: (t: number) => number;
  orientation?: 'vertical' | 'horizontal';
  smoothWheel?: boolean;
  wheelMultiplier?: number;
  touchMultiplier?: number;
  infinite?: boolean;
  /**
   * Drive Lenis from this clock instead of its own rAF. Pass `gsap.ticker`
   * when the page also uses ScrollTrigger.
   */
  ticker?: LenisTicker;
  /** Called on every scroll frame. Held in a ref, so it needs no memo. */
  onScroll?: (lenis: Lenis) => void;
  /** Skip entirely — for `prefers-reduced-motion`, or on touch devices. */
  enabled?: boolean;
}

let shared: Lenis | null = null;
let refCount = 0;

export function useLenis(options: UseLenisOptions = {}): { current: Lenis | null } {
  const {
    duration,
    easing,
    orientation = 'vertical',
    smoothWheel = true,
    wheelMultiplier,
    touchMultiplier,
    infinite = false,
    ticker,
    onScroll,
    enabled = true,
  } = options;

  const instance = useRef<Lenis | null>(null);
  const onScrollRef = useRef(onScroll);
  onScrollRef.current = onScroll;

  useEffect(() => {
    if (!enabled) return;

    if (shared === null) {
      shared = new Lenis({
        ...(duration === undefined ? {} : { duration }),
        ...(easing === undefined ? {} : { easing }),
        orientation,
        smoothWheel,
        ...(wheelMultiplier === undefined ? {} : { wheelMultiplier }),
        ...(touchMultiplier === undefined ? {} : { touchMultiplier }),
        infinite,
        // A ticker owns the clock; `autoRaf` would be the second one.
        autoRaf: ticker === undefined,
      });
    }

    const lenis = shared;
    refCount += 1;
    instance.current = lenis;

    const handleScroll = () => onScrollRef.current?.(lenis);
    lenis.on('scroll', handleScroll);

    const update = (time: number) => lenis.raf(time * 1000); // ticker is in seconds
    if (ticker) {
      ticker.add(update);
      // Default lag smoothing freezes GSAP's clock after a 500 ms stall while
      // Lenis keeps its own time, so the two desync exactly when the page is
      // busiest. 0 disables it.
      ticker.lagSmoothing?.(0);
    }

    return () => {
      lenis.off('scroll', handleScroll);
      if (ticker) ticker.remove(update);
      instance.current = null;
      refCount -= 1;
      if (refCount === 0) {
        // Put lag smoothing back. `lagSmoothing(0)` above is process-wide state
        // on GSAP's ticker, not something scoped to this hook, so leaving it off
        // means every tween anywhere on the page — long after the last Lenis
        // consumer has gone — replays the whole stall after a tab switch or a
        // long task, which is the jump lag smoothing exists to absorb. 500/33
        // are GSAP's own defaults (gsap-core.js:1270-1271).
        //
        // Only at refcount zero: restoring while another consumer is still
        // driving Lenis from this ticker would reintroduce the desync the
        // disable is there to fix.
        ticker?.lagSmoothing?.(500, 33);
        lenis.destroy();
        shared = null;
      }
    };
  }, [
    duration,
    easing,
    orientation,
    smoothWheel,
    wheelMultiplier,
    touchMultiplier,
    infinite,
    ticker,
    enabled,
  ]);

  return instance;
}
