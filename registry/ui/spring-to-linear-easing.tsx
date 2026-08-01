'use client';

import { useMemo } from 'react';
import { CSS_EASING } from '@/registry/lib/easing';
import { clamp } from '@/registry/lib/damp';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';

/* ==========================================================================
   Spring To CSS linear()
   --------------------------------------------------------------------------
   A spring is a differential equation, so the usual way to run one on the web
   is a JavaScript loop that integrates it every frame. That loop lives on the
   main thread: a long task, a layout thrash or a garbage collection stalls it,
   and the spring visibly hitches.

   `linear()` removes the loop. It takes a list of output values and linearly
   interpolates between them, which means *any* curve can be expressed as a
   dense enough sample of itself — including one that overshoots past 1 and
   comes back. Solve the spring once, sample it at a fixed cadence, and emit
   the samples. The animation then runs entirely on the compositor and cannot
   be stalled by anything the main thread does.

   The whole trick is that `linear()` output values are not clamped to [0, 1].
   Clamping them is what turns a spring into an ease-out.
   ========================================================================== */

export interface SpringConfig {
  /** Restoring force per unit displacement. Higher is faster and tighter. */
  stiffness?: number;
  /** Resistance proportional to velocity. Higher settles sooner. */
  damping?: number;
  mass?: number;
  /**
   * Overshoot, 0-1, as a shorthand for `damping`. Sets the damping ratio to
   * `1 - bounce`, so 0 is critically damped (no overshoot at all) and 0.5 is
   * lively. Overrides `damping` when given.
   */
  bounce?: number;
  /** Starting velocity, in fractions of the total distance per second. */
  velocity?: number;
  /** Remaining distance, as a fraction, below which it counts as arrived. */
  restDelta?: number;
  /** Speed, in fractions per second, below which it counts as stopped. */
  restSpeed?: number;
}

export interface LinearEasingOptions {
  /** Milliseconds between samples. */
  resolutionMs?: number;
  /** Hard ceiling on the solved duration. */
  maxDurationMs?: number;
  /** Decimal places per sample. */
  precision?: number;
}

export interface SpringEasing {
  /** A CSS `linear()` string. Values above 1 are the overshoot. */
  easing: string;
  /**
   * A monotonic `cubic-bezier()` to declare on the line *before* `easing`.
   * An engine without `linear()` drops that declaration and keeps this one.
   */
  fallback: string;
  /** Solved settling time, rounded up to a whole millisecond. */
  durationMs: number;
  /** The sampled progress values, in order. First is 0, last is exactly 1. */
  samples: readonly number[];
}

// #region critical
/**
 * Upper bound on samples. The compositor can only show one value per frame, so
 * stops spaced closer than a frame are bytes with no visible effect: 200 stops
 * across a 1.6s spring is one every 8ms, already finer than a 120Hz frame.
 */
const MAX_STOPS = 200;
/** Integration step for the settle scan. 240Hz — four samples per 60Hz frame. */
const SCAN_STEP = 1 / 240;
/** A damping ratio of 0 never settles; this is the floor. */
const MIN_RATIO = 0.05;

/** Remaining distance and its derivative, at time `t` seconds. */
type Solver = (t: number) => readonly [distance: number, velocity: number];

/**
 * Closed-form solution of `d'' + 2*zeta*w0*d' + w0^2*d = 0` with `d(0) = 1`
 * and `d'(0) = -velocity`, i.e. the *remaining* distance to the target. All
 * three damping regimes have different solutions and picking the wrong branch
 * is silent: an overdamped spring evaluated with the underdamped formula
 * returns NaN the moment `sqrt(1 - zeta^2)` goes imaginary.
 */
function makeSolver(w0: number, zeta: number, v0: number): Solver {
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    const b = (zeta * w0 - v0) / wd;
    return (t) => {
      const decay = Math.exp(-zeta * w0 * t);
      const cos = Math.cos(wd * t);
      const sin = Math.sin(wd * t);
      const d = decay * (cos + b * sin);
      const dp = decay * (-zeta * w0 * (cos + b * sin) + (-wd * sin + b * wd * cos));
      return [d, dp];
    };
  }

  if (zeta === 1) {
    const a = w0 - v0;
    return (t) => {
      const decay = Math.exp(-w0 * t);
      return [decay * (1 + a * t), decay * (a - w0 * (1 + a * t))];
    };
  }

  const root = w0 * Math.sqrt(zeta * zeta - 1);
  const r1 = -zeta * w0 + root;
  const r2 = -zeta * w0 - root;
  const c1 = (-v0 - r2) / (r1 - r2);
  const c2 = 1 - c1;
  return (t) => {
    const e1 = Math.exp(r1 * t);
    const e2 = Math.exp(r2 * t);
    return [c1 * e1 + c2 * e2, c1 * r1 * e1 + c2 * r2 * e2];
  };
}

export function springToLinear(
  spring: SpringConfig = {},
  options: LinearEasingOptions = {},
): SpringEasing {
  const {
    stiffness = 100,
    mass = 1,
    velocity = 0,
    restDelta = 0.005,
    restSpeed = 0.1,
  } = spring;
  const { resolutionMs = 10, maxDurationMs = 10000, precision = 4 } = options;

  const w0 = Math.sqrt(stiffness / mass);
  // The critical damping coefficient. `bounce` is expressed against it, which
  // is what makes "bounce: 0" mean exactly "no overshoot" for any stiffness.
  const critical = 2 * Math.sqrt(stiffness * mass);
  const damping =
    spring.bounce === undefined
      ? (spring.damping ?? 10)
      : critical * (1 - clamp(spring.bounce, 0, 1 - MIN_RATIO));
  const zeta = Math.max(damping / critical, MIN_RATIO);

  const solve = makeSolver(w0, zeta, velocity);

  // Scan for the first moment the spring is both close enough and slow enough.
  // Distance alone is not sufficient: an underdamped spring passes through the
  // target at full speed on every oscillation, and a distance-only test would
  // declare it settled on the first crossing, half a bounce in.
  const maxSeconds = maxDurationMs / 1000;
  let settled = maxSeconds;
  for (let t = 0; t <= maxSeconds; t += SCAN_STEP) {
    const [d, dp] = solve(t);
    if (Math.abs(d) < restDelta && Math.abs(dp) < restSpeed) {
      settled = t;
      break;
    }
  }
  const durationMs = Math.max(Math.ceil(settled * 1000), 1);

  const stops = clamp(Math.round(durationMs / resolutionMs), 2, MAX_STOPS);
  const factor = 10 ** precision;
  const samples: number[] = [];
  for (let i = 0; i < stops; i++) {
    const t = (i / (stops - 1)) * (durationMs / 1000);
    // Progress, not remaining distance. NOT clamped: values above 1 are the
    // overshoot, and clamping them is exactly how a spring becomes an ease-out.
    samples.push(Math.round((1 - solve(t)[0]) * factor) / factor);
  }
  // The scan stops within `restDelta` of the target, so the final sample is
  // ~0.999. Left alone, every transition ends with a sub-pixel snap as the
  // browser jumps from the last easing output to the real end value.
  samples[stops - 1] = 1;

  return {
    easing: `linear(${samples.join(', ')})`,
    // Declared first so a browser without linear() support keeps it: the
    // unparseable longhand is dropped, the previous declaration survives.
    fallback: CSS_EASING.outQuart,
    durationMs,
    samples,
  };
}

/**
 * `springToLinear` with memoisation and a reduced-motion variant.
 *
 * Reduced motion does not shorten the animation to nothing — it removes the
 * oscillation. The damping ratio is forced to 1 and the initial velocity to 0,
 * which keeps the spring's stiffness and therefore its pace, and produces a
 * monotonic curve that arrives once and stays.
 */
export function useSpringEasing(
  spring: SpringConfig = {},
  options: LinearEasingOptions = {},
): SpringEasing {
  const reduced = useReducedMotion();
  const { stiffness, damping, mass, bounce, velocity, restDelta, restSpeed } = spring;
  const { resolutionMs, maxDurationMs, precision } = options;

  return useMemo(
    () =>
      springToLinear(
        reduced
          ? { stiffness, mass, bounce: 0, velocity: 0, restDelta, restSpeed }
          : { stiffness, damping, mass, bounce, velocity, restDelta, restSpeed },
        { resolutionMs, maxDurationMs, precision },
      ),
    [
      reduced,
      stiffness,
      damping,
      mass,
      bounce,
      velocity,
      restDelta,
      restSpeed,
      resolutionMs,
      maxDurationMs,
      precision,
    ],
  );
}
// #endregion critical
