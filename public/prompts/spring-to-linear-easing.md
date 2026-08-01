# Build: Spring To CSS linear()

A spring is a differential equation, and the usual way to run one on the web is a JavaScript loop that integrates it every frame — on the main thread, where a long task or a garbage collection makes it visibly hitch. `linear()` takes a list of output values and interpolates between them, and those values are not clamped to [0, 1], so a dense enough sample of a spring *is* the spring, overshoot included. Solve it once at author time, emit the samples, and the animation runs on the compositor where nothing on the main thread can reach it.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Solves a spring once, samples it into a CSS linear() string, and runs the whole bounce on the compositor.

- Category: primitive
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. The motion is the second-order system `d'' + 2*zeta*w0*d' + w0^2*d = 0` on the *remaining* distance `d`, with `d(0) = 1` and `d'(0) = -velocity`. The natural frequency is `w0 = sqrt(stiffness / mass)` and the damping ratio is `zeta = damping / (2 * sqrt(stiffness * mass))`.
2. Each damping regime has its own closed form. Underdamped (`zeta < 1`) is `exp(-zeta*w0*t) * (cos(wd*t) + b*sin(wd*t))` with `wd = w0*sqrt(1 - zeta^2)` and `b = (zeta*w0 - v0) / wd`. Critically damped (`zeta = 1`) collapses to `exp(-w0*t) * (1 + (w0 - v0)*t)`. Overdamped (`zeta > 1`) is a sum of two real exponentials with roots `-zeta*w0 ± w0*sqrt(zeta^2 - 1)`. Picking the wrong branch is silent until `sqrt(1 - zeta^2)` goes imaginary and every sample is NaN.
3. `bounce` is expressed against the critical damping coefficient `2*sqrt(stiffness*mass)` rather than as an absolute damping value, which is what makes `bounce: 0` mean exactly "no overshoot" at any stiffness. Without that normalisation the same damping number is bouncy at high stiffness and sluggish at low.
4. Duration is not a parameter — it is solved. A 240 Hz scan walks the solution until the spring is both close enough (`|d| < restDelta`) and slow enough (`|d'| < restSpeed`), and the first `t` that satisfies both becomes the duration. Both tests are needed: an underdamped spring crosses the target at full speed on every oscillation, so a distance-only test declares it settled half a bounce in.
5. The solved duration is divided by `resolutionMs` to get a stop count, capped at 200, and the solution is evaluated at each stop. Samples are `1 - d(t)` — progress, not remaining distance — and are deliberately left unclamped, because values above 1 are the overshoot and clamping them is precisely how a spring degrades into an ease-out.
6. The last sample is forced to exactly 1. The scan stopped within `restDelta` of the target, so it would otherwise be ~0.999 and every transition would end with a visible sub-pixel snap as the browser jumps from the final easing output to the real end value.
7. `fallback` is a monotonic `cubic-bezier()` meant to be declared on the line *before* the `linear()` one. An engine that cannot parse `linear()` drops that declaration during parsing and the earlier one survives — the ordinary CSS cascade, with no feature query.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `MAX_STOPS = 200`
  Upper bound on samples. The compositor shows one value per frame, so stops closer together than a frame are bytes with no visible effect — 200 stops across a 1.6s spring is one every 8 ms, already finer than a 120 Hz frame. It also bounds the emitted string: a slow overdamped spring at 10 ms resolution would otherwise run past a thousand stops.
- `resolutionMs = 10`
  Milliseconds between samples. Below ~6 ms the string grows with no visual change even at 165 Hz; past ~20 ms the linear segments between stops become long enough that the interpolation reads as faceted rather than smooth, most visibly around the first peak where curvature is highest.
- `SCAN_STEP = 1 / 240`
  Integration step for the settle scan — four samples per 60 Hz frame. Coarser steps can step straight over the narrow window where an underdamped spring is simultaneously near the target and slow, which sends the duration to `maxDurationMs`.
- `MIN_RATIO = 0.05`
  Floor on the damping ratio. At zeta = 0 the spring is undamped and never satisfies the rest test, so the scan runs to `maxDurationMs` and emits a 200-stop string of a curve that oscillates forever. `bounce` is clamped to `1 - MIN_RATIO` for the same reason.
- `restDelta = 0.005`
  Distance, as a fraction of the total, that counts as arrived. At 0.005 a 400 px move stops 2 px out, under the forced final sample, so the snap is invisible. An order of magnitude tighter roughly doubles the duration of a bouncy spring for motion nobody can see.
- `restSpeed = 0.1`
  Speed, in fractions per second, that counts as stopped. Paired with `restDelta` so a fast pass through the target is not mistaken for arrival.
- `precision = 4`
  Decimal places per sample. Four is sub-pixel on any realistic distance (0.0001 of 2000 px is 0.2 px) and keeps a 200-stop string near 1.4 KB. Full float precision triples the byte count for nothing.
- `maxDurationMs = 10000`
  Hard ceiling so a pathological configuration returns a long easing rather than hanging the scan loop.

## API

```ts
function springToLinear(spring?: { stiffness?: number; damping?: number; mass?: number; bounce?: number; velocity?: number; restDelta?: number; restSpeed?: number }, options?: { resolutionMs?: number; maxDurationMs?: number; precision?: number }): { easing: string; fallback: string; durationMs: number; samples: readonly number[] }
function useSpringEasing(spring?: SpringConfig, options?: LinearEasingOptions): SpringEasing
```

- `stiffness: number` — default `100`
  Restoring force per unit displacement. Higher is faster and tighter.
- `damping: number` — default `10`
  Resistance proportional to velocity. Ignored when `bounce` is given.
- `mass: number` — default `1`
  Inertia. Raising it lowers the natural frequency and lengthens the settle.
- `bounce: number`
  Overshoot 0-1, relative to critical damping. 0 is monotonic, 0.5 is lively. Overrides `damping`.
- `velocity: number` — default `0`
  Initial velocity in fractions of the distance per second, for handing off from a gesture.
- `restDelta: number` — default `0.005`
  Remaining distance, as a fraction, that counts as arrived.
- `restSpeed: number` — default `0.1`
  Speed, in fractions per second, that counts as stopped.
- `resolutionMs: number` — default `10`
  Milliseconds between emitted stops.
- `maxDurationMs: number` — default `10000`
  Ceiling on the solved duration.
- `precision: number` — default `4`
  Decimal places per sample.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
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
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up: `springToLinear` is a pure function and `useSpringEasing` only calls it inside `useMemo`. No timers, listeners, or animation frames are created. The reduced-motion subscription belongs to `useReducedMotion`, which removes its own media-query listener on unmount.

**Reduced motion.** `useSpringEasing` recomputes with `bounce: 0` and `velocity: 0`, forcing the damping ratio to exactly 1. That removes the oscillation — the trigger for vestibular discomfort — while keeping the stiffness and therefore the pace, so the motion stays the same length and simply arrives once instead of settling. It is not shortened to zero: the curve is still a real ease, just monotonic, and the demo's peak readout drops to 100% to show it.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Clamping the samples to [0, 1]. This is the one mistake that destroys the whole technique: the overshoot lives in the values above 1, and a clamped spring is an ease-out with extra bytes. It looks like the maths is wrong when the maths is fine.
- Reading the raw solution as progress. The closed form gives *remaining distance*, which starts at 1 and decays to 0; the easing needs `1 - d`. Emitting `d` directly produces an animation that runs backwards and every reviewer misdiagnoses it as an inverted easing.
- Using one formula for all damping ratios. `sqrt(1 - zeta^2)` is imaginary above zeta = 1, so an overdamped spring evaluated with the underdamped branch yields NaN, and `linear(0, NaN, NaN)` fails to parse — the transition silently reverts to `ease` with nothing in the console.
- Testing only distance for the settle time. An underdamped spring passes exactly through the target on every swing, so the scan stops on the first crossing and the emitted curve is cut off mid-bounce.
- Leaving the final sample at its solved value. It is ~0.999, and the browser jumps from there to the real end value in one frame — a visible tick at the end of every transition that reads as a rendering bug.
- Passing the `linear()` string through a CSS custom property. An unsupported value inside `var()` is invalid at computed-value time, which resolves the property to its *initial* value (`ease`) instead of falling back to the previous declaration. That silently defeats the two-declaration fallback in exactly the browsers that need it.
- Declaring the fallback after `linear()`. Later declarations win, so a supporting browser also uses the cubic-bezier and the spring never appears anywhere.
- Setting a duration by hand. Duration is an output of the spring, not an input; overriding it rescales the curve in time so a stiff spring animates slowly with a stiff shape, which looks wrong without looking obviously wrong.
- Recomputing the easing every render. The scan runs up to 2400 solver evaluations, so an unmemoised call inside a frequently-rendering component is measurable main-thread work to produce a string that never changes.
- Using this for anything interruptible. A `linear()` easing is a fixed curve of fixed length; a spring that must absorb a new target mid-flight, with its current velocity carried over, still needs a real per-frame integrator.

## Notes

- Deterministic and pure, so it is safe to precompute at build time and inline the string into a stylesheet — the runtime cost then drops to zero. `springToLinear` is exported separately from the hook for that reason.
- Works for any animatable property, including ones a JavaScript spring handles badly: `linear()` on a `background-color` transition springs the colour without touching the main thread at all.
- A `linear()` easing applies to Web Animations and CSS animations identically. Passing `easing` as the `easing` option of `element.animate()` gets the same compositor handoff.
- The overshoot means the property leaves the 0-1 range, so a spring on `scale` momentarily exceeds the target scale. Anything clipped by an `overflow: hidden` parent should be sized with that headroom in mind — the demo's peak readout is the exact multiplier.

## Definition of done

Press Run. The three squares cross their tracks and each one visibly passes its end position and settles back — Loose the most, Snap barely. The plotted curve beside each row rises above the dashed 100% line by the amount stated in the readout. Scroll or drag hard during the run and the motion does not hitch, because it is not on the main thread. Read the emitted string: it starts at 0, contains values greater than 1, and ends at exactly 1. Turn reduced motion on and re-run: every curve is monotonic, no square passes its end position, every peak reads 100%, and the durations are still hundreds of milliseconds rather than zero.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
