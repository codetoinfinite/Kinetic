# Build: Wheel Accumulator Stepper

`wheel` is four input devices wearing one event name. A mouse notch is a single event carrying 100 units; a trackpad swipe is forty events of four units each, followed by a synthesised momentum tail that keeps arriving for about a second after the fingers lift; and `deltaMode` decides whether those numbers are pixels, lines, or whole pages. This hook scales the delta by `deltaMode`, sums it, and emits one step per 90 normalised pixels — then latches, and re-arms only when the incoming magnitude stops decaying, which is the one signal that separates a fresh flick from the tail of the last one.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Wheel input normalised by deltaMode and accumulated to a threshold, so one flick of any device moves exactly one step.

- Category: primitive
- Runtime cost: dom
- Dependencies: none beyond React

## How it works

1. `wheelDelta(e, axis)` picks the axis — `Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY` for `both`, so a sideways two-finger swipe and a mouse wheel drive the same widget — then multiplies by the scale `deltaMode` implies: 1 for pixel mode, 40 for line mode, 800 for page mode. Everything downstream counts pixels.
2. A signed accumulator sums the normalised deltas. While `Math.abs(units) >= step` it subtracts one signed `step` and calls `onStep(direction, detail)`, capped at `maxPerEvent` iterations. One mouse notch (100 units) clears the 90-unit threshold on its own; a trackpad swipe clears it after roughly a dozen events. No device detection anywhere.
3. After any step the accumulator is zeroed rather than left holding the remainder, and a latch closes. `peak` records the magnitude of the event that fired the step.
4. While latched, an event whose magnitude is below `peak` is absorbed: no accumulation, no step, but `preventDefault` still runs so the page does not scroll underneath the widget. The first event whose magnitude reaches `peak` re-arms. macOS momentum is monotonically decreasing, so a tail can never reach its own peak and is swallowed entirely; the next notch of a mouse wheel has an identical magnitude and re-arms immediately; a second deliberate flick exceeds it on its first event.
5. Two further resets bypass the latch: a gap greater than `gestureGapMs` since the previous accepted event, which means the gesture and its tail are finished, and a change of sign, since no momentum tail reverses direction.
6. `e.ctrlKey` events return before `preventDefault` and before accumulation — that combination is pinch-zoom on a trackpad and page zoom on a mouse, and swallowing it removes the only way to enlarge the page.
7. The listener is registered `{ passive: !preventDefault }`, so it is non-passive exactly when it intends to cancel. The live accumulator is exposed as a `RefObject`, not state, so a gauge can read it every frame without re-rendering the widget forty times per swipe.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `STEP = 90`
  Normalised pixels per step. It has to sit below one mouse notch so a single notch always moves exactly one item — Chrome reports 100 per notch and legacy browsers 120, so anything above 100 makes a mouse feel broken. Going much below ~60 puts it inside the range of a small trackpad twitch and the widget steps when the user meant to scroll past it.
- `LINE_UNITS = 40`
  Pixels assumed per line for `deltaMode === 1`. Firefox reports line mode on several platforms, where `deltaY` is typically 3 — 3 x 40 = 120 units, which matches what the same physical notch reports as pixels in Chrome. Using 1 here (i.e. not normalising at all) makes the stepper need thirty notches per step in Firefox and one in Chrome.
- `PAGE_UNITS = 800`
  Pixels assumed per page for `deltaMode === 2`. Roughly one viewport. The exact figure barely matters because any page-mode event is far past the threshold; what matters is that it is not 1, which would make a full-page wheel event register as almost no movement.
- `GESTURE_GAP_MS = 140`
  Silence that ends a gesture. Momentum tail events arrive at frame rate, so ~8-17 ms apart; sustained finger input is similar. 140 ms is far above both and far below the ~250 ms a person needs to lift, reposition, and flick again, so it never splits one gesture in two and never merges two.
- `MAX_PER_EVENT = 1`
  Steps emitted from a single event. One event should mean at most one step, and with the latch in place the only thing this guards is a single enormous delta — a page-mode wheel worth 800 units, or a synthetic event from an automation script, either of which would otherwise advance eight items in one frame. Raise it to 2 or 3 if a violent flick should travel further; the demo keeps it at 1.

## API

```ts
function useWheelStepper(ref: RefObject<HTMLElement | null>, options: { step?: number; axis?: 'both' | 'x' | 'y'; maxPerEvent?: number; gestureGapMs?: number; preventDefault?: boolean; enabled?: boolean; onStep: (direction: 1 | -1, detail: { index: number; delta: number; deltaMode: number; event: WheelEvent }) => void }): { units: RefObject<number>; latched: RefObject<boolean> }
function wheelDelta(e: WheelEvent, axis?: 'both' | 'x' | 'y'): number
function wheelUnitScale(deltaMode: number): number
```

- `step: number` — default `90`
  Normalised pixels of travel per emitted step. Must stay below one mouse notch (100).
- `axis: 'both' | 'x' | 'y'` — default `'both'`
  `both` uses whichever of `deltaX` / `deltaY` dominates, so horizontal and vertical input both work.
- `maxPerEvent: number` — default `1`
  Ceiling on steps emitted from one event. Guards a single page-mode delta worth 800 units.
- `gestureGapMs: number` — default `140`
  Silence that ends the gesture and clears the latch. Above frame interval, below a human reflick.
- `preventDefault: boolean` — default `true`
  Cancel the page scroll on every accepted event. Also decides whether the listener is passive.
- `enabled: boolean` — default `true`
  Detaches the listener when false — for a widget that only owns the wheel while open.
- `onStep: (direction: 1 | -1, detail: WheelStepDetail) => void`
  Called once per step, synchronously in the wheel handler. `+1` is down or right.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
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
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The effect removes the `wheel` listener with the same capture flag it was added with, and zeroes both the accumulator and the latch so a remount does not inherit half a gesture. There is no timer, no rAF, and no pointer capture to release. Re-running under React 19 StrictMode is harmless: the second effect attaches a second listener only after the first has removed its own.

**Reduced motion.** Steps still fire — a step is the user's input, not decoration, and suppressing it would leave the widget unresponsive. What changes is the burst: the per-event step count is clamped to 1 regardless of `maxPerEvent`, so a violent flick advances one item instead of travelling several in a single frame. Whatever the consumer animates in response to a step is where a reduced-motion transition belongs.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Reading `deltaY` without reading `deltaMode`. The same physical notch is `deltaY: 100` in pixel mode and `deltaY: 3` in line mode, so a threshold tuned in Chrome needs about thirty notches per step in a line-mode browser. The bug never reproduces on the developer's machine.
- Stepping on every wheel event. A trackpad emits thirty to forty events per swipe, so a carousel jumps thirty slides for one gesture — the single most common wheel bug and the reason the accumulator exists at all.
- Accumulating with no latch. The accumulator fixes the burst but not the tail: macOS keeps synthesising decaying wheel events for about a second after the fingers lift, and a hard flick has enough left in that tail for three or four more thresholds. The carousel takes one step under your fingers and then keeps going on its own.
- Latching with a fixed cooldown instead. A cooldown long enough to outlast the tail (roughly 600-1000 ms) also eats the second of two deliberate flicks, so the widget feels dead when hurried; a cooldown short enough to keep double flicks alive lets the loud part of the tail through. Decay is the only signal that separates the two cases.
- Comparing each tail event against the previous event rather than against the peak. Tail magnitudes jitter, so `39 >= 38` looks like new input and re-arms mid-tail, which is exactly the extra step the latch was added to prevent. Comparing against the peak since the latch closed cannot be fooled by jitter.
- Carrying the leftover units past a step. Zeroing looks lossy but is correct: the overshoot belongs to the gesture that just ended, and banking 80 of 90 units means the next flick fires after a single event of travel.
- Skipping `preventDefault` while the latch is absorbing the tail. The widget correctly refuses to step, and the page scrolls instead — so the carousel holds still and the whole section slides away underneath it.
- Registering the listener non-passive when it never cancels. That opts the element out of the browser's scrolling fast path for nothing. The mirror-image bug is calling `preventDefault` inside a passive listener, where it is silently ignored with a console error and the page scrolls anyway.
- Swallowing `ctrl`+wheel. That is pinch-zoom on every trackpad and page zoom on every mouse; intercepting it means a low-vision user cannot enlarge the page while the pointer is anywhere over the widget.
- Publishing the accumulator as React state. Forty state updates per swipe re-render the whole widget to move a 40 px gauge; a ref plus one CSS custom property write costs nothing and cannot tear.
- Attaching to `window` instead of the element. The widget then steps while the pointer is somewhere else entirely, and a non-passive window-level wheel listener degrades scrolling for the whole document.

## Notes

- The latch makes one gesture mean one step, which is right for a carousel, a chapter list, or anything with discrete positions. For a continuous value — a zoom level, a scrub position — drop the latch and use the normalised delta directly; the `deltaMode` scaling is the part you still need.
- `onStep` is called synchronously inside the wheel handler, so it runs before the frame that would have scrolled. Keep it to a state update or a ref write; layout reads there cost a forced synchronous reflow on every notch.
- A trackpad in a browser that supports it will also fire `gesturestart` / `gesturechange` for pinch, which is a separate event stream. This hook deliberately ignores it rather than trying to reconstruct pinch from `ctrl`+wheel.

## Definition of done

Wheel over the panel with a mouse: every notch moves exactly one item, and a fast spin moves one per notch with no skipping. Flick hard on a trackpad and let go: the index advances exactly once and then holds still while the readout shows the tail arriving and being absorbed. Flick twice in quick succession and it advances twice. Push slowly and continuously and the gauge fills to the threshold before each step, so the accumulation is visible. Reverse direction mid-gesture and it steps back without first having to unwind the units already banked. Hold ctrl and wheel: the browser zooms, and the index does not move. Scroll the outer page with the pointer just outside the panel and the panel ignores it.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
