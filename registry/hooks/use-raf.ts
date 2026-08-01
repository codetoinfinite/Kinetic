'use client';

import { useEffect, useRef } from 'react';

/* ==========================================================================
   One shared requestAnimationFrame loop.
   --------------------------------------------------------------------------
   Forty components each calling requestAnimationFrame means forty callbacks
   the browser schedules separately and forty chances to read layout after a
   write. One loop, one ordered pass, one place to clamp delta time.

   Delta is clamped to 100 ms. Without that, returning to a backgrounded tab
   delivers a multi-second dt and every physics integration in the page
   explodes on the first frame back.
   ========================================================================== */

export type RafCallback = (dt: number, elapsed: number) => void;

const callbacks = new Set<RafCallback>();
let frame = 0;
let last = 0;
let start = 0;

const MAX_DT = 0.1;
const DEFAULT_DT = 1 / 60;

function tick(now: number) {
  frame = requestAnimationFrame(tick);
  const dt = last === 0 ? DEFAULT_DT : Math.min((now - last) / 1000, MAX_DT);
  last = now;
  const elapsed = (now - start) / 1000;
  // Copy: a callback may unsubscribe itself (or another) mid-iteration.
  for (const cb of Array.from(callbacks)) {
    if (callbacks.has(cb)) cb(dt, elapsed);
  }
}

function subscribe(cb: RafCallback) {
  callbacks.add(cb);
  if (frame === 0) {
    start = performance.now();
    last = 0;
    frame = requestAnimationFrame(tick);
  }
  return () => {
    callbacks.delete(cb);
    if (callbacks.size === 0 && frame !== 0) {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
    }
  };
}

/**
 * Run `cb` every frame while `enabled`.
 *
 * The callback is held in a ref, so it does not need to be memoised and the
 * subscription is never torn down just because the closure changed identity.
 */
export function useRaf(cb: RafCallback, enabled = true): void {
  const ref = useRef(cb);
  ref.current = cb;

  useEffect(() => {
    if (!enabled) return;
    return subscribe((dt, elapsed) => ref.current(dt, elapsed));
  }, [enabled]);
}
