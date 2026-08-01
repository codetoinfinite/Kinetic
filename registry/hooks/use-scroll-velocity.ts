'use client';

import { useRef } from 'react';
import { useRaf } from '@/registry/hooks/use-raf';
import { clamp, damp } from '@/registry/lib/damp';

/* ==========================================================================
   Smoothed scroll velocity.
   --------------------------------------------------------------------------
   Raw `scrollY` deltas are spiky: a trackpad emits bursts, a mouse wheel
   emits steps, and either one drives a geometry parameter into visible
   stutter. Two stages fix it — a one-pole low-pass on the delta itself, then
   a damped approach toward that filtered value, which is what produces the
   free ease-out when scrolling stops.

   Values are exposed through a ref, not state. A velocity that changes every
   frame must never re-render React.
   ========================================================================== */

export interface ScrollVelocity {
  /** Signed, in pixels per second, smoothed. */
  velocity: number;
  /** `velocity` normalised to roughly -1..1 for driving visual parameters. */
  normalized: number;
  /** -1 up, 1 down, 0 at rest. */
  direction: number;
  /** Current scroll offset in pixels. */
  scroll: number;
}

export interface UseScrollVelocityOptions {
  /** Velocity that maps to `normalized === 1`. Default 1500 px/s. */
  reference?: number;
  /** Fraction of the gap remaining after 1 s. Lower is snappier. */
  smoothing?: number;
  /** Read from this element instead of the window. */
  target?: HTMLElement | null;
}

export function useScrollVelocity(
  options: UseScrollVelocityOptions = {},
): { current: ScrollVelocity } {
  const { reference = 1500, smoothing = 0.0001, target = null } = options;

  const state = useRef<ScrollVelocity>({
    velocity: 0,
    normalized: 0,
    direction: 0,
    scroll: 0,
  });
  const last = useRef<number | null>(null);
  const raw = useRef(0);

  useRaf((dt) => {
    if (typeof window === 'undefined' || dt <= 0) return;

    const scroll = target ? target.scrollTop : window.scrollY;
    const previous = last.current;
    last.current = scroll;

    // First frame has no previous sample; a delta against 0 would read as a
    // full-page jump on any deep link.
    if (previous === null) {
      state.current.scroll = scroll;
      return;
    }

    const instant = (scroll - previous) / dt;
    // Stage 1: low-pass the instantaneous value so wheel steps stop ringing.
    raw.current = damp(raw.current, instant, 0.01, dt);
    // Stage 2: the value consumers read, softer again.
    const velocity = damp(state.current.velocity, raw.current, smoothing, dt);

    state.current = {
      velocity,
      normalized: clamp(velocity / reference, -1, 1),
      direction: Math.abs(velocity) < 1 ? 0 : Math.sign(velocity),
      scroll,
    };
  });

  return state;
}
