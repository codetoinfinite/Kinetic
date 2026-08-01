# Build: Self-Parking RAF

An eased value never arrives. Closing 12% of the remaining gap each frame closes it 100% never — the distance decays asymptotically and `current !== target` stays true for the life of the page, so a loop conditioned on that comparison never stops. One line fixes it: below a threshold, assign the target outright. The equality test can now succeed, the loop reaches its own stopping condition, and it unsubscribes itself. The frame callback exists only while something is genuinely moving.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

An epsilon snap lets a damped value reach its target exactly, so the frame loop hits its exit test and dies.

- Category: primitive
- Runtime cost: dom
- Dependencies: none beyond React

## How it works

1. The damped step is `damp(current, target, smoothing, dt)`, which is `current + (target - current) * (1 - smoothing^dt)`. The exponent is what makes it frame-rate independent: the naked `* 0.12` from the source converges twice as fast at 120 Hz as at 60 Hz, so the same code feels different on different hardware and visibly speeds up whenever the browser drops frames.
2. After the step, `Math.abs(target - next) < epsilon` assigns `next = target` exactly. This is the entire technique. Without it the loop's exit condition — `next === target` — is unreachable, because exponential decay produces 1e-8, then 1e-9, then a denormal, and never a clean zero.
3. Parking is expressed as React state, not as a local flag: `setRunning(false)` drops the `useRaf` subscription, and when the last subscriber leaves the shared loop calls `cancelAnimationFrame` and stops scheduling frames at all. The saving is the whole callback plus the paint it would have dirtied, not merely the arithmetic.
4. Waking is driven by a `target` change in an effect, guarded by `value.current === target`. The guard is load-bearing: without it any unrelated re-render that happens to pass the same target restarts a loop that had already parked, which is how "self-parking" quietly degrades back into an always-on loop.
5. Because `perFrameToSmoothing(0.12)` is `0.88^60 ≈ 0.00047`, the value retains 0.047% of its gap after a second — so the settle time is a few hundred milliseconds and the epsilon is crossed within roughly twenty frames rather than being an escape hatch from a genuinely long tail.
6. A hidden tab and reduced motion both take the same short path: `park()` assigns the target, emits one `onFrame`, and never starts a loop. No observer means no reason to interpolate, and the value stays correct either way.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `per-frame rate = 0.12`
  Fraction of the remaining gap closed per frame at 60fps, converted through `perFrameToSmoothing`. It settles in about 300 ms — fast enough that a scrubber feels attached to the click, slow enough to read as motion. Above ~0.3 the damping is barely visible and the loop may as well be a jump; below ~0.05 the tail is long enough that a user beats it with the next click.
- `EPSILON = 0.0002`
  Snap threshold, in the units of the value. For the 0-1 normalised scrub position of the source this is a fifth of a pixel on a 1000 px track — invisible. Set it to 0 and the loop never parks, which is the exact bug this component exists to fix. Set it far too large and the last visible fraction of the travel is skipped as a jump.
- `MAX_DT = 0.1`
  Inherited from `useRaf`. A tab returning from the background delivers a multi-second delta; unclamped, `smoothing^dt` underflows to 0, the damp closes the entire gap in one frame, and the "settle" is a teleport.

## API

```ts
function useSelfParkingRaf(target: number, options: { smoothing?: number; epsilon?: number; onFrame: (value: number) => void }): { running: boolean; value: RefObject<number>; park: () => void }
```

- `target: number`
  The value to settle toward. Changing it wakes the loop; it is the only trigger.
- `smoothing: number` — default `perFrameToSmoothing(0.12)`
  Fraction of the gap remaining after one second. Smaller is snappier.
- `epsilon: number` — default `0.0002`
  Distance below which the value snaps to the target and the loop parks. Must match the unit of the value.
- `onFrame: (value: number) => void`
  Called with the damped value every frame while running, and once when it parks. For DOM writes.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/**
 * `0.12` of the gap per frame, measured at 60fps, expressed as the retention
 * factor `damp` wants. Using the raw 0.12 with a per-frame multiply would run
 * twice as fast on a 120 Hz display; this converges in the same wall-clock
 * time on any refresh rate.
 */
const SMOOTHING = perFrameToSmoothing(0.12);
/** The snap threshold. This single line is what allows the loop to end. */
const EPSILON = 0.0002;

/**
 * A damped value that runs a frame loop only while it is moving.
 *
 * `target` is a plain prop: changing it wakes the loop, and the loop parks
 * itself once it arrives. There is no `start`, and there is no
 * `requestAnimationFrame` running when the value is at rest.
 */
export function useSelfParkingRaf(
  target: number,
  options: SelfParkingOptions,
): SelfParkingValue {
  const { smoothing = SMOOTHING, epsilon = EPSILON } = options;
  const reduced = useReducedMotion();
  const visible = useVisibility();

  const value = useRef(target);
  const [running, setRunning] = useState(false);

  const config = useRef({ smoothing, epsilon, target, options });
  config.current = { smoothing, epsilon, target, options };

  const park = useCallback(() => {
    const cfg = config.current;
    value.current = cfg.target;
    cfg.options.onFrame(value.current);
    setRunning(false);
  }, []);

  // Waking the loop is the only thing a target change does. The guard matters:
  // without it, any unrelated re-render that happens to pass the same target
  // restarts a loop that had already parked.
  useEffect(() => {
    if (value.current === target) return;
    // Nothing to interpolate: reduced motion wants the end state, and a hidden
    // tab has no observer, so both arrive in one write instead of a loop.
    if (reduced || !visible) {
      park();
      return;
    }
    setRunning(true);
  }, [target, reduced, visible, park]);

  useRaf((dt) => {
    const cfg = config.current;
    let next = damp(value.current, cfg.target, cfg.smoothing, dt);

    // The whole technique. Asymptotic approach means `next` would otherwise
    // never equal `cfg.target`, so the exit test below could never pass.
    if (Math.abs(cfg.target - next) < cfg.epsilon) next = cfg.target;

    value.current = next;
    cfg.options.onFrame(next);

    // Parking flips `running`, which drops the `useRaf` subscription. When the
    // last subscriber goes, the shared loop cancels its frame entirely.
    if (next === cfg.target) setRunning(false);
  }, running);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `useRaf` removes the subscription when `running` goes false or the component unmounts, and cancels the shared frame when it was the last subscriber — so an unmount mid-settle leaves nothing scheduled. The visibility and media-query listeners belong to `useVisibility` and `useReducedMotion`, which detach their own. No timers and no direct `requestAnimationFrame` handles are held.

**Reduced motion.** No loop is started at all. A target change calls `park()`, which assigns the target and emits a single `onFrame`, so the value lands on its final position in one write. That is the still, correct state rather than a zero-duration animation: `onFrame` still fires, so the DOM the consumer writes is identical to the end of a full settle, and `running` never goes true.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Omitting the epsilon snap. The value approaches the target forever, the exit test never passes, and one hover or one scrub leaves a rAF running for the rest of the session. It is invisible in a demo and shows up as a battery complaint.
- Expressing epsilon in the wrong unit. The threshold is compared against the value, so 0.0002 is correct for a 0-1 progress value and absurd for a pixel offset — at pixel scale it costs dozens of extra frames to cross, and the loop appears not to park.
- Keeping the loop alive to "avoid the cost of restarting it". Subscribing to a shared rAF is a `Set.add`; a frame callback plus the paint it dirties is orders of magnitude more. Restarting is free, running is not.
- Using `current += (target - current) * 0.12` directly. Frame-rate dependent: the same settle takes 300 ms at 60 Hz and 150 ms at 120 Hz, and speeds up mid-motion whenever a long task drops frames — the animation gets faster precisely when the page is struggling.
- Waking the loop without comparing against the current value. Every re-render that re-supplies the same target restarts the loop, which parks on its first frame and restarts on the next render — a loop that thrashes instead of resting.
- Calling `setState` from `onFrame`. That re-renders on every frame of the settle, which costs far more than the loop being parked ever saved. `onFrame` is for DOM writes.
- Reading the returned `value` ref during render. It changes between renders without notifying React, so the rendered output and the ref disagree; read it inside a frame callback or an event handler only.
- Forgetting that the loop is asleep when the target is set imperatively. Anything that mutates the underlying source without changing the `target` prop leaves the value stale, because nothing is polling — the trade for not running a loop is that changes must be declared.

## Notes

- The natural pairing is with an invalidate-driven renderer: a WebGL scene that renders only on demand plus a value that only moves on demand gives a page that is genuinely idle at rest, not merely cheap.
- The `park()` escape hatch exists for handoffs — a drag that takes over the value, or a route change that should not animate the old position. It emits one final `onFrame` so the DOM is left in the correct end state rather than mid-travel.
- `running` is exposed because parking is otherwise unobservable, and a component that claims to park should be able to prove it. The demo prints it beside a frame count that freezes.
- For several values settling together, one hook per value is fine — they all share the single `useRaf` loop, and the last one to park is the one that stops it.

## Definition of done

Click a timecode. The bar and the readout race to it and stop, and the status line goes from "rAF live" to "rAF parked" with the frame count frozen at roughly twenty — not climbing. Leave it alone for a minute: the count does not move. Open DevTools performance and record while idle after a seek; there are no animation frames. Click the timecode that is already active and nothing wakes. Switch tabs mid-settle and come back — the bar is already at its target with no catch-up sweep. With reduced motion on, a seek moves the bar in one step, the count reads 1, and the status never leaves "parked".

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
