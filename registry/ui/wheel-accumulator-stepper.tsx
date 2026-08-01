'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';

/* ==========================================================================
   Wheel Accumulator Stepper
   --------------------------------------------------------------------------
   `wheel` is not one input device, it is four, and they disagree about
   everything.

   A mouse wheel emits one event per notch carrying a large delta — Chrome
   reports 100, older browsers 120. A trackpad emits thirty or forty events
   for the same gesture, each a handful of pixels, and then keeps emitting
   them after the fingers have left the surface: macOS synthesises a
   momentum tail that decays over roughly a second. Firefox on some platforms
   reports the delta in *lines* rather than pixels, and a page-scroll wheel
   reports it in *pages*. `deltaY: 3` therefore means three pixels, three
   lines, or three screenfuls depending on `deltaMode`, and code that reads
   `deltaY` without reading `deltaMode` is reading an uncalibrated number.

   Two transforms make the four devices behave the same:

   1. **Normalise.** Multiply by the scale implied by `deltaMode` so the
      accumulator is always counting pixels.

   2. **Accumulate to a threshold.** Sum the normalised delta and emit one
      step per `step` units. A mouse notch clears the threshold on its own;
      a trackpad swipe clears it after a dozen events. Same feel, no device
      sniffing.

   Which leaves the hard part: one physical flick must produce one step. The
   accumulator alone cannot do that, because a flick's momentum tail delivers
   hundreds more pixels after the gesture is physically over, and a carousel
   that spends them flings through four slides.

   The discriminator is not magnitude and not elapsed time — it is *decay*. A
   momentum tail is monotonically decreasing, so it can never match the
   magnitude it had at the instant the step fired. A second deliberate flick,
   or the next notch of a mouse wheel, matches or exceeds it immediately. So
   the stepper latches on firing, records that peak, and re-arms on the first
   event that fails to decay. A tail is absorbed in full; a fast mouse spin
   steps once per notch; a deliberate double flick 200 ms apart steps twice.
   ========================================================================== */

/** Which axis the widget listens on. */
export type WheelAxis = 'both' | 'x' | 'y';

export interface WheelStepDetail {
  /** 0 for the first step this one event produced. */
  index: number;
  /** This event's own delta after `deltaMode` normalisation, sign included. */
  delta: number;
  /** 0 pixel, 1 line, 2 page. Kept for instrumentation. */
  deltaMode: number;
  event: WheelEvent;
}

export interface UseWheelStepperOptions {
  /** Normalised pixels of travel per step. */
  step?: number;
  axis?: WheelAxis;
  /** Ceiling on steps emitted from a single event. See the constant note. */
  maxPerEvent?: number;
  /** Silence longer than this ends the gesture and clears the latch, in ms. */
  gestureGapMs?: number;
  /**
   * Whether to call `preventDefault` on every accepted event. When true the
   * listener is registered non-passive; when false it is registered passive.
   */
  preventDefault?: boolean;
  enabled?: boolean;
  /** Called once per step. `direction` is +1 for down/right, -1 for up/left. */
  onStep: (direction: 1 | -1, detail: WheelStepDetail) => void;
}

export interface WheelStepperState {
  /**
   * Signed normalised units banked toward the next step, always inside
   * `(-step, step)`. A ref, so a gauge can read it every frame without
   * re-rendering the widget once per wheel event.
   */
  units: RefObject<number>;
  /** True while a fired step is absorbing the rest of its gesture. */
  latched: RefObject<boolean>;
}

// #region critical
/** Normalised pixels per step. */
const STEP = 90;
/** Pixels per line for `deltaMode === 1`. */
const LINE_UNITS = 40;
/** Pixels per page for `deltaMode === 2`. */
const PAGE_UNITS = 800;
/** Milliseconds of silence that end a gesture. */
const GESTURE_GAP_MS = 140;
/** Steps allowed out of one event. */
const MAX_PER_EVENT = 1;

/** The pixel scale implied by `deltaMode`. Unknown modes are treated as pixels. */
export function wheelUnitScale(deltaMode: number): number {
  if (deltaMode === 1) return LINE_UNITS;
  if (deltaMode === 2) return PAGE_UNITS;
  return 1;
}

/**
 * One wheel event as normalised pixels on the chosen axis.
 *
 * `'both'` takes whichever axis dominates, so a two-finger sideways swipe and
 * a mouse wheel drive the same widget and the user never has to discover
 * which axis it wanted.
 */
export function wheelDelta(e: WheelEvent, axis: WheelAxis = 'both'): number {
  const raw =
    axis === 'x'
      ? e.deltaX
      : axis === 'y'
        ? e.deltaY
        : Math.abs(e.deltaX) > Math.abs(e.deltaY)
          ? e.deltaX
          : e.deltaY;
  return raw * wheelUnitScale(e.deltaMode);
}

/**
 * Turn continuous wheel input into discrete steps, one per physical gesture.
 *
 * Attaches to `ref`, so the widget owns the wheel only while the pointer is
 * over it. Nothing is published as state: `onStep` fires on the event and the
 * live accumulator is a ref.
 */
export function useWheelStepper(
  ref: RefObject<HTMLElement | null>,
  options: UseWheelStepperOptions,
): WheelStepperState {
  const {
    step = STEP,
    axis = 'both',
    maxPerEvent = MAX_PER_EVENT,
    gestureGapMs = GESTURE_GAP_MS,
    preventDefault = true,
    enabled = true,
  } = options;

  const reduced = useReducedMotion();

  const units = useRef(0);
  const latched = useRef(false);

  const config = useRef({ step, axis, maxPerEvent, gestureGapMs, reduced, options });
  config.current = { step, axis, maxPerEvent, gestureGapMs, reduced, options };

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    /** `timeStamp` of the previous accepted event, for the gesture gap. */
    let lastTime = 0;
    /** Largest magnitude seen since the latch closed. */
    let peak = 0;

    const onWheel = (e: WheelEvent) => {
      // ctrl+wheel is pinch-zoom on a trackpad and page zoom on a mouse.
      // Swallowing it takes away the user's only way to enlarge the page, so
      // it is passed through untouched — no preventDefault, no accumulation.
      if (e.ctrlKey) return;

      const cfg = config.current;
      const delta = wheelDelta(e, cfg.axis);
      // A pure cross-axis event on a single-axis widget, or the zero-delta
      // event some drivers emit at the end of a gesture. Neither is input.
      if (delta === 0) return;

      // Before the latch check, not after: while the widget is absorbing a
      // momentum tail the page must not scroll underneath it instead.
      if (preventDefault) e.preventDefault();

      const magnitude = Math.abs(delta);
      const gap = e.timeStamp - lastTime;
      lastTime = e.timeStamp;

      // Silence long enough to outlast a momentum tail's frame interval means
      // the previous gesture is over in every sense. Start clean.
      if (gap > cfg.gestureGapMs) {
        units.current = 0;
        latched.current = false;
      }

      // A reversal is always deliberate — no momentum tail changes sign — so
      // it clears both the latch and any units banked in the other direction.
      if (units.current !== 0 && Math.sign(delta) !== Math.sign(units.current)) {
        units.current = 0;
        latched.current = false;
      }

      if (latched.current) {
        // The whole technique. A tail decays, so it never reaches the peak it
        // had when the step fired; a new flick or the next wheel notch does,
        // on its first event. Magnitude alone cannot tell them apart and a
        // fixed cooldown either eats the second flick or leaks the tail.
        if (magnitude < peak) return;
        latched.current = false;
      }

      units.current += delta;

      // Reduced motion caps the burst at one step regardless of the option:
      // travelling several items from one flick is the motion-heavy part.
      const limit = cfg.reduced ? 1 : Math.max(1, cfg.maxPerEvent);
      let fired = 0;

      while (Math.abs(units.current) >= cfg.step && fired < limit) {
        const direction: 1 | -1 = units.current > 0 ? 1 : -1;
        units.current -= cfg.step * direction;
        cfg.options.onStep(direction, {
          index: fired,
          delta,
          deltaMode: e.deltaMode,
          event: e,
        });
        fired += 1;
      }

      if (fired > 0) {
        // Zeroed, not left with the remainder: a flick's overshoot belongs to
        // the flick that is now finished, and banking it means the next
        // gesture starts part-way to a step and fires early.
        units.current = 0;
        latched.current = true;
        peak = magnitude;
      }
    };

    // Non-passive only when it actually calls preventDefault. Registering
    // non-passive unconditionally opts the element out of the scrolling fast
    // path for nothing; calling preventDefault inside a passive listener is
    // ignored with a console error, which is the same bug from the other end.
    el.addEventListener('wheel', onWheel, { passive: !preventDefault });
    return () => {
      el.removeEventListener('wheel', onWheel);
      units.current = 0;
      latched.current = false;
    };
  }, [ref, enabled, preventDefault]);
  // #endregion critical

  return { units, latched };
}
