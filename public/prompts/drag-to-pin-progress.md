# Build: Drag Mapped To Pin Progress

A drag surface laid over a pinned horizontal section. Instead of a tuned drag multiplier it reads the pin's live geometry — the scroll span it occupies and the pixels the strip travels — and converts one into the other, so a pixel of thumb is a pixel of track regardless of panel widths or zoom. Release throws it, and the throw decays in wall-clock time rather than per frame.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Drag a pinned horizontal strip and it moves exactly one pixel per pixel, then throws and settles.

- Category: scroll
- Runtime cost: dom
- Dependencies: gsap@^3.15.0

## How it works

1. The conversion is `ratio = (trigger.end - trigger.start) / getDistance()`: scroll pixels the pin occupies, divided by horizontal pixels the strip travels. Both are read on every use because ScrollTrigger recomputes `end` on each refresh.
2. During a drag the scroll position is set absolutely — `scrollTop = pressScrollTop - dx * ratio` — using the offset from the press point, never an accumulation of per-move deltas.
3. Velocity is sampled as `(clientX - lastX) / dt` in seconds and clamped to ±4000 px/s, so a single stuttering event pair cannot record an implausible throw.
4. On release the velocity decays with `damp(v, 0, friction, dt)` and the scroll advances by `-v * ratio * dt` each frame, so a 144 Hz display and a 60 Hz display travel the same distance in the same wall-clock time.
5. The loop self-parks: below 20 px/s the velocity is zeroed and the callback returns immediately on subsequent frames, so an idle component costs one comparison per frame.
6. `trigger.progress` is rounded to three decimals and written to a `--pin-progress` custom property on the surface only when it changes, so a progress rail can be pure CSS with no per-frame React render.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `friction = 0.002`
  Fraction of throw velocity remaining after one second. 0.002 lands a hard flick in roughly half a second. Near 0.1 the throw stops dead and the release feels like hitting a wall; above ~0.05 it coasts long enough that the user reaches for the scrollbar to stop it.
- `THROW_FLOOR = 20`
  Pixels per second below which the throw is cut and the loop parks. Exponential decay never reaches zero, so without a floor the component writes a sub-pixel scroll change forever and never idles.
- `MAX_THROW = 4000`
  Velocity clamp in px/s. Two pointer events 2 ms apart produce an enormous instantaneous velocity; unclamped, a single jittery sample launches the track across its entire range.
- `release timeout = 80 ms`
  Hold still for longer than this before letting go and the release is not a throw. Without it, pausing mid-drag and releasing fires the stale velocity from the last movement.
- `progress quantisation = 3 decimals`
  Below this the custom property is rewritten on nearly every frame with a change no one can see; above it the progress rail visibly steps.

## API

```ts
function DragToPinProgress(props: { children: ReactNode; scroller: RefObject<HTMLElement | null>; trigger: ScrollTrigger | null; getDistance?: () => number; friction?: number; className?: string }): JSX.Element
```

- `children: ReactNode`
  The pinned section and anything overlaying it.
- `scroller: RefObject<HTMLElement | null>`
  The scroll container whose `scrollTop` the drag writes.
- `trigger: ScrollTrigger | null`
  The pinned trigger being scrubbed. Dragging is disabled while null.
- `getDistance: () => number`
  Live horizontal travel of the strip in px. Omit for a 1:1 scroll mapping.
- `friction: number` — default `0.002`
  Fraction of throw velocity left after one second.
- `className: string`
  Merged onto the drag surface.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function DragToPinProgress({
  children,
  scroller,
  trigger,
  getDistance,
  friction = 0.002,
  className,
}: DragToPinProgressProps) {
  const surface = useRef<HTMLDivElement>(null);
  const startScroll = useRef(0);
  const throwVelocity = useRef(0);
  const lastMoveX = useRef(0);
  const lastMoveTime = useRef(0);
  const lastProgress = useRef(-1);
  const reduced = useReducedMotion();

  // Scroll pixels per pixel of horizontal track travel. Read live, because
  // `end` is recomputed on every ScrollTrigger refresh and the panel widths
  // change with the container.
  const ratio = () => {
    if (!trigger) return 1;
    const span = trigger.end - trigger.start;
    const travel = getDistance?.() ?? span;
    return travel > 0 ? span / travel : 1;
  };

  const applyScroll = (value: number) => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    el.scrollTop = clamp(value, 0, max);
  };

  useDrag(surface, {
    enabled: trigger !== null,
    onDragStart: (state) => {
      throwVelocity.current = 0;
      startScroll.current = scroller.current?.scrollTop ?? 0;
      lastMoveX.current = state.clientX;
      lastMoveTime.current = performance.now();
    },
    onDrag: (state) => {
      // Absolute, from the press point — not an accumulation of deltas.
      // Accumulating drifts, because every clamp at the ends silently eats
      // part of a delta and the track never returns to where the hand is.
      applyScroll(startScroll.current - state.dx * ratio());

      const now = performance.now();
      const dt = (now - lastMoveTime.current) / 1000;
      if (dt > 0) {
        const instant = (state.clientX - lastMoveX.current) / dt;
        throwVelocity.current = clamp(instant, -MAX_THROW, MAX_THROW);
        lastMoveX.current = state.clientX;
        lastMoveTime.current = now;
      }
    },
    onDragEnd: (_state, moved) => {
      // A tap is not a throw. Without this, releasing after a pause launches
      // the track at whatever velocity the last move happened to record.
      if (!moved || reduced || performance.now() - lastMoveTime.current > 80) {
        throwVelocity.current = 0;
      }
    },
  });

  useRaf((dt) => {
    const el = surface.current;

    // Publish the pin's own progress as a CSS variable rather than state:
    // a progress rail must not cost a React render per frame.
    if (el && trigger) {
      const p = Math.round(trigger.progress * 1000) / 1000;
      if (p !== lastProgress.current) {
        lastProgress.current = p;
        el.style.setProperty('--pin-progress', String(p));
      }
    }

    if (throwVelocity.current === 0) return;

    // Exponential decay in wall-clock time, so the throw travels the same
    // distance on a 60 Hz panel as on a 144 Hz one.
    throwVelocity.current = damp(throwVelocity.current, 0, friction, dt);
    if (Math.abs(throwVelocity.current) < THROW_FLOOR) {
      throwVelocity.current = 0;
      return;
    }

    const current = scroller.current?.scrollTop ?? 0;
    applyScroll(current - throwVelocity.current * ratio() * dt);
  });
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `useDrag` removes its pointerdown/move/up/cancel and capture-phase click listeners and releases any outstanding pointer capture; `useRaf` unsubscribes from the shared loop. The `--pin-progress` property dies with the element, and no timers or tweens are created that could outlive it.

**Reduced motion.** Dragging still works and still maps one pixel to one pixel — it is an input method, not decoration. The inertial throw is suppressed, so the strip stops the instant the pointer is released instead of coasting.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Inventing a drag multiplier. It is correct for exactly one panel count and one container width; change either and the strip either outruns the hand or lags behind it, and the number gets re-tuned by eye forever.
- Accumulating per-move deltas instead of using the offset from the press point. Every clamp at the ends of the range silently swallows part of a delta, so the track drifts away from the hand and never comes back.
- Caching `trigger.end - trigger.start`. ScrollTrigger recomputes it on every refresh — a font swap or a resize — and a cached span makes the drag mapping wrong for the rest of the session.
- Decaying the throw with a per-frame constant (`v *= 0.95`). The throw travels less than half as far on a 120 Hz display, so the component feels different on different hardware.
- Setting `touch-action: none` on the drag surface. It kills native vertical scrolling over the whole pinned section, so on a phone the page appears frozen; `pan-y` keeps vertical scroll and hands over only the horizontal gesture.
- Not swallowing the click after a drag. Releasing over a panel fires that panel's click handler, so throwing the track opens whatever happened to be under the finger.

## Notes

- Designed to sit around `pinned-horizontal-track`, whose `onTrack` payload supplies both `trigger` and `getDistance`.
- Because the drag writes `scrollTop`, ScrollTrigger updates through its normal scroll listener — no manual `ScrollTrigger.update()` call, and no second source of truth for position.

## Definition of done

Press and drag left: the strip follows the pointer exactly, and a panel edge under your thumb stays under your thumb. Flick and release: it coasts and settles smoothly. Drag to either end and it stops flush with no rubber band. The progress rail matches the strip at all times, including while throwing. With reduced motion on, release stops it dead.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
