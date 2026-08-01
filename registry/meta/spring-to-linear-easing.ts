import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'spring-to-linear-easing',
  title: 'Spring To CSS linear()',
  category: 'primitive',
  tags: ['easing', 'spring', 'linear', 'css', 'compositor'],
  blurb: 'Solves a spring once, samples it into a CSS linear() string, and runs the whole bounce on the compositor.',
  cost: 'css',
  motif: 'wave',

  files: [{ path: 'registry/ui/spring-to-linear-easing.tsx', type: 'registry:ui', role: 'hook' }],
  dependencies: [],
  registryDependencies: [],

  summary:
    'A spring is a differential equation, and the usual way to run one on the web is a JavaScript loop that integrates it every frame — on the main thread, where a long task or a garbage collection makes it visibly hitch. `linear()` takes a list of output values and interpolates between them, and those values are not clamped to [0, 1], so a dense enough sample of a spring *is* the spring, overshoot included. Solve it once at author time, emit the samples, and the animation runs on the compositor where nothing on the main thread can reach it.',

  mechanism: [
    'The motion is the second-order system `d\'\' + 2*zeta*w0*d\' + w0^2*d = 0` on the *remaining* distance `d`, with `d(0) = 1` and `d\'(0) = -velocity`. The natural frequency is `w0 = sqrt(stiffness / mass)` and the damping ratio is `zeta = damping / (2 * sqrt(stiffness * mass))`.',
    'Each damping regime has its own closed form. Underdamped (`zeta < 1`) is `exp(-zeta*w0*t) * (cos(wd*t) + b*sin(wd*t))` with `wd = w0*sqrt(1 - zeta^2)` and `b = (zeta*w0 - v0) / wd`. Critically damped (`zeta = 1`) collapses to `exp(-w0*t) * (1 + (w0 - v0)*t)`. Overdamped (`zeta > 1`) is a sum of two real exponentials with roots `-zeta*w0 ± w0*sqrt(zeta^2 - 1)`. Picking the wrong branch is silent until `sqrt(1 - zeta^2)` goes imaginary and every sample is NaN.',
    '`bounce` is expressed against the critical damping coefficient `2*sqrt(stiffness*mass)` rather than as an absolute damping value, which is what makes `bounce: 0` mean exactly "no overshoot" at any stiffness. Without that normalisation the same damping number is bouncy at high stiffness and sluggish at low.',
    'Duration is not a parameter — it is solved. A 240 Hz scan walks the solution until the spring is both close enough (`|d| < restDelta`) and slow enough (`|d\'| < restSpeed`), and the first `t` that satisfies both becomes the duration. Both tests are needed: an underdamped spring crosses the target at full speed on every oscillation, so a distance-only test declares it settled half a bounce in.',
    'The solved duration is divided by `resolutionMs` to get a stop count, capped at 200, and the solution is evaluated at each stop. Samples are `1 - d(t)` — progress, not remaining distance — and are deliberately left unclamped, because values above 1 are the overshoot and clamping them is precisely how a spring degrades into an ease-out.',
    'The last sample is forced to exactly 1. The scan stopped within `restDelta` of the target, so it would otherwise be ~0.999 and every transition would end with a visible sub-pixel snap as the browser jumps from the final easing output to the real end value.',
    '`fallback` is a monotonic `cubic-bezier()` meant to be declared on the line *before* the `linear()` one. An engine that cannot parse `linear()` drops that declaration during parsing and the earlier one survives — the ordinary CSS cascade, with no feature query.',
  ],

  constants: [
    {
      name: 'MAX_STOPS',
      value: '200',
      why: 'Upper bound on samples. The compositor shows one value per frame, so stops closer together than a frame are bytes with no visible effect — 200 stops across a 1.6s spring is one every 8 ms, already finer than a 120 Hz frame. It also bounds the emitted string: a slow overdamped spring at 10 ms resolution would otherwise run past a thousand stops.',
    },
    {
      name: 'resolutionMs',
      value: '10',
      why: 'Milliseconds between samples. Below ~6 ms the string grows with no visual change even at 165 Hz; past ~20 ms the linear segments between stops become long enough that the interpolation reads as faceted rather than smooth, most visibly around the first peak where curvature is highest.',
    },
    {
      name: 'SCAN_STEP',
      value: '1 / 240',
      why: 'Integration step for the settle scan — four samples per 60 Hz frame. Coarser steps can step straight over the narrow window where an underdamped spring is simultaneously near the target and slow, which sends the duration to `maxDurationMs`.',
    },
    {
      name: 'MIN_RATIO',
      value: '0.05',
      why: 'Floor on the damping ratio. At zeta = 0 the spring is undamped and never satisfies the rest test, so the scan runs to `maxDurationMs` and emits a 200-stop string of a curve that oscillates forever. `bounce` is clamped to `1 - MIN_RATIO` for the same reason.',
    },
    {
      name: 'restDelta',
      value: '0.005',
      why: 'Distance, as a fraction of the total, that counts as arrived. At 0.005 a 400 px move stops 2 px out, under the forced final sample, so the snap is invisible. An order of magnitude tighter roughly doubles the duration of a bouncy spring for motion nobody can see.',
    },
    {
      name: 'restSpeed',
      value: '0.1',
      why: 'Speed, in fractions per second, that counts as stopped. Paired with `restDelta` so a fast pass through the target is not mistaken for arrival.',
    },
    {
      name: 'precision',
      value: '4',
      why: 'Decimal places per sample. Four is sub-pixel on any realistic distance (0.0001 of 2000 px is 0.2 px) and keeps a 200-stop string near 1.4 KB. Full float precision triples the byte count for nothing.',
    },
    {
      name: 'maxDurationMs',
      value: '10000',
      why: 'Hard ceiling so a pathological configuration returns a long easing rather than hanging the scan loop.',
    },
  ],

  pitfalls: [
    'Clamping the samples to [0, 1]. This is the one mistake that destroys the whole technique: the overshoot lives in the values above 1, and a clamped spring is an ease-out with extra bytes. It looks like the maths is wrong when the maths is fine.',
    'Reading the raw solution as progress. The closed form gives *remaining distance*, which starts at 1 and decays to 0; the easing needs `1 - d`. Emitting `d` directly produces an animation that runs backwards and every reviewer misdiagnoses it as an inverted easing.',
    'Using one formula for all damping ratios. `sqrt(1 - zeta^2)` is imaginary above zeta = 1, so an overdamped spring evaluated with the underdamped branch yields NaN, and `linear(0, NaN, NaN)` fails to parse — the transition silently reverts to `ease` with nothing in the console.',
    'Testing only distance for the settle time. An underdamped spring passes exactly through the target on every swing, so the scan stops on the first crossing and the emitted curve is cut off mid-bounce.',
    'Leaving the final sample at its solved value. It is ~0.999, and the browser jumps from there to the real end value in one frame — a visible tick at the end of every transition that reads as a rendering bug.',
    'Passing the `linear()` string through a CSS custom property. An unsupported value inside `var()` is invalid at computed-value time, which resolves the property to its *initial* value (`ease`) instead of falling back to the previous declaration. That silently defeats the two-declaration fallback in exactly the browsers that need it.',
    'Declaring the fallback after `linear()`. Later declarations win, so a supporting browser also uses the cubic-bezier and the spring never appears anywhere.',
    'Setting a duration by hand. Duration is an output of the spring, not an input; overriding it rescales the curve in time so a stiff spring animates slowly with a stiff shape, which looks wrong without looking obviously wrong.',
    'Recomputing the easing every render. The scan runs up to 2400 solver evaluations, so an unmemoised call inside a frequently-rendering component is measurable main-thread work to produce a string that never changes.',
    'Using this for anything interruptible. A `linear()` easing is a fixed curve of fixed length; a spring that must absorb a new target mid-flight, with its current velocity carried over, still needs a real per-frame integrator.',
  ],

  notes: [
    'Deterministic and pure, so it is safe to precompute at build time and inline the string into a stylesheet — the runtime cost then drops to zero. `springToLinear` is exported separately from the hook for that reason.',
    'Works for any animatable property, including ones a JavaScript spring handles badly: `linear()` on a `background-color` transition springs the colour without touching the main thread at all.',
    'A `linear()` easing applies to Web Animations and CSS animations identically. Passing `easing` as the `easing` option of `element.animate()` gets the same compositor handoff.',
    'The overshoot means the property leaves the 0-1 range, so a spring on `scale` momentarily exceeds the target scale. Anything clipped by an `overflow: hidden` parent should be sized with that headroom in mind — the demo\'s peak readout is the exact multiplier.',
  ],

  apiSignature:
    'function springToLinear(spring?: { stiffness?: number; damping?: number; mass?: number; bounce?: number; velocity?: number; restDelta?: number; restSpeed?: number }, options?: { resolutionMs?: number; maxDurationMs?: number; precision?: number }): { easing: string; fallback: string; durationMs: number; samples: readonly number[] }\nfunction useSpringEasing(spring?: SpringConfig, options?: LinearEasingOptions): SpringEasing',

  props: [
    { name: 'stiffness', type: 'number', default: '100', description: 'Restoring force per unit displacement. Higher is faster and tighter.' },
    { name: 'damping', type: 'number', default: '10', description: 'Resistance proportional to velocity. Ignored when `bounce` is given.' },
    { name: 'mass', type: 'number', default: '1', description: 'Inertia. Raising it lowers the natural frequency and lengthens the settle.' },
    { name: 'bounce', type: 'number', description: 'Overshoot 0-1, relative to critical damping. 0 is monotonic, 0.5 is lively. Overrides `damping`.' },
    { name: 'velocity', type: 'number', default: '0', description: 'Initial velocity in fractions of the distance per second, for handing off from a gesture.' },
    { name: 'restDelta', type: 'number', default: '0.005', description: 'Remaining distance, as a fraction, that counts as arrived.' },
    { name: 'restSpeed', type: 'number', default: '0.1', description: 'Speed, in fractions per second, that counts as stopped.' },
    { name: 'resolutionMs', type: 'number', default: '10', description: 'Milliseconds between emitted stops.' },
    { name: 'maxDurationMs', type: 'number', default: '10000', description: 'Ceiling on the solved duration.' },
    { name: 'precision', type: 'number', default: '4', description: 'Decimal places per sample.' },
  ],

  reducedMotion:
    '`useSpringEasing` recomputes with `bounce: 0` and `velocity: 0`, forcing the damping ratio to exactly 1. That removes the oscillation — the trigger for vestibular discomfort — while keeping the stiffness and therefore the pace, so the motion stays the same length and simply arrives once instead of settling. It is not shortened to zero: the curve is still a real ease, just monotonic, and the demo\'s peak readout drops to 100% to show it.',

  cleanup:
    'Nothing to clean up: `springToLinear` is a pure function and `useSpringEasing` only calls it inside `useMemo`. No timers, listeners, or animation frames are created. The reduced-motion subscription belongs to `useReducedMotion`, which removes its own media-query listener on unmount.',

  acceptance:
    'Press Run. The three squares cross their tracks and each one visibly passes its end position and settles back — Loose the most, Snap barely. The plotted curve beside each row rises above the dashed 100% line by the amount stated in the readout. Scroll or drag hard during the run and the motion does not hitch, because it is not on the main thread. Read the emitted string: it starts at 0, contains values greater than 1, and ends at exactly 1. Turn reduced motion on and re-run: every curve is monotonic, no square passes its end position, every peak reads 100%, and the durations are still hundreds of milliseconds rather than zero.',

  criticalRegion: 'critical',
};

export default meta;
