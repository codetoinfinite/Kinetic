# Build: Throttled Scrub To State

The bridge between a continuous scroll signal and discrete React state. A scrubbed ScrollTrigger calls back on every frame the scroll position moves; this component gates those ticks on elapsed time, on distance travelled, and on the animation frame, so the tree below it renders a few times per scroll instead of a hundred. The boundary frames always get through, which is what stops a fast flick from leaving the state stranded at 0.93.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A scrubbed trigger fires 120x a second; a time, distance and frame gate turns that into a handful of React renders.

- Category: scroll
- Runtime cost: dom
- Dependencies: gsap@^3.15.0

## How it works

1. A single `ScrollTrigger.create` with `scrub` runs `onUpdate`, which increments a tick counter in a ref and then decides whether that tick is worth a React render. Refs are used for everything except the committed state, because a ref write does not render.
2. Gate 1 is time: `performance.now() - lastAt < interval` returns early. A monotonic clock rather than `Date.now()`, so a system clock correction cannot produce a negative elapsed time and latch the gate shut.
3. Gate 2 is distance: `Math.abs(p - lastProgress) < minDelta` returns early. A slow drag passes the time gate continuously while moving a fraction of a percent, and that is a render for a change no one can see.
4. Gate 3 is the frame: the passing value is parked in a `pending` ref and a single `requestAnimationFrame` is scheduled if one is not already outstanding. ScrollTrigger fires per scroll event, not per paint, so several ticks can clear both other gates inside one frame — coalescing makes that one render.
5. The override: when `p <= 0 || p >= 1` the time and distance gates are skipped entirely, because there is no later tick to correct a dropped endpoint. A second guard compares against the last committed value so that sitting at the end of the range does not re-commit on every tick.
6. The committed state carries `commits` and `ticks` alongside `progress`, so the ratio between callbacks and renders is visible in the UI rather than only in a profiler.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `interval = 100`
  Milliseconds between commits — about 10 renders a second against roughly 120 ticks. Around 16ms the gate stops doing anything useful because it approximates one render per frame; past ~200ms the discrete steps are large enough that a reader notices the value lagging behind the scroll.
- `minDelta = 0.02`
  2% of the trigger range. Below about 0.005 a slow drag commits on almost every time window; above ~0.05 short triggers can complete their whole range in two or three commits and the readout jumps.
- `scrub = 0.4`
  Under half a second of catch-up. Long enough to smooth a jittery wheel into a continuous ramp, short enough that the committed value still feels attached to the hand. `true` welds it to the wheel and every scroll spike becomes a tick.
- `boundary test = p <= 0 || p >= 1`
  Inclusive, not strict. ScrollTrigger reports exactly 0 and exactly 1 at the ends, so `< 0` and `> 1` never match and the override silently does nothing.

## API

```ts
function ThrottledScrubState(props: { children: (state: { progress: number; commits: number; ticks: number }) => ReactNode; interval?: number; minDelta?: number; scrub?: number | boolean; scrollerRef?: RefObject<HTMLElement | null>; className?: string }): JSX.Element
```

- `children: (state: ScrubState) => ReactNode`
  Render prop, called only on committed states.
- `interval: number` — default `100`
  Minimum milliseconds between commits.
- `minDelta: number` — default `0.02`
  Minimum change in progress before a commit is worth making.
- `scrub: number | boolean` — default `0.4`
  Seconds of catch-up behind the scroll position.
- `scrollerRef: RefObject<HTMLElement | null>`
  The scroll container that owns the scroll position. Omit for the document.
- `className: string`
  Merged onto the wrapper via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function ThrottledScrubState({
  children,
  interval = 100,
  minDelta = 0.02,
  scrub = 0.4,
  scrollerRef,
  className,
}: ThrottledScrubStateProps) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // The only React state in the component. Everything else is a ref, because
  // a ref write does not render.
  const [state, setState] = useState<ScrubState>({ progress: 0, commits: 0, ticks: 0 });

  const ticks = useRef(0);
  const commits = useRef(0);
  const lastAt = useRef(0);
  const lastProgress = useRef(0);
  const pending = useRef<number | null>(null);
  const frame = useRef(0);

  useGsap(
    gsap,
    () => {
      const el = root.current;
      if (!el) return;

      // Gate 3: coalesce. Several ticks can pass all the other gates inside
      // one frame (ScrollTrigger fires per scroll event, not per paint), and
      // three setStates in a frame is three renders for one visible change.
      const flush = () => {
        frame.current = 0;
        const value = pending.current;
        if (value === null) return;
        pending.current = null;
        commits.current += 1;
        setState({ progress: value, commits: commits.current, ticks: ticks.current });
      };

      const trigger = ScrollTrigger.create({
        trigger: el,
        scroller: scrollerRef?.current ?? undefined,
        start: 'top bottom',
        end: 'bottom top',
        // Reduced motion welds the readout to the wheel: the value still
        // tracks the scroll the reader is performing, but nothing continues
        // to move after they stop.
        scrub: reduced ? true : scrub,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress;
          ticks.current += 1;

          // The override. The ends of the range are the two values that must
          // never be dropped, because there is no later tick to correct them.
          const boundary = p <= 0 || p >= 1;

          if (boundary) {
            // ...but do not re-commit the same boundary on every one of the
            // dozens of ticks that arrive while sitting at the end.
            if (p === lastProgress.current) return;
          } else {
            // Gate 1: time. `performance.now()` and not `Date.now()` — a
            // monotonic clock, so an NTP correction cannot make the elapsed
            // time negative and freeze the gate shut.
            if (performance.now() - lastAt.current < interval) return;
            // Gate 2: distance. A slow drag passes the time gate constantly
            // while moving a fraction of a percent, which is a render for a
            // change nobody can see.
            if (Math.abs(p - lastProgress.current) < minDelta) return;
          }

          lastAt.current = performance.now();
          lastProgress.current = p;
          pending.current = p;
          if (frame.current === 0) frame.current = requestAnimationFrame(flush);
        },
      });

      return () => {
        // Order matters: kill the source first, then drop the frame it may
        // have just scheduled. A flush that survives teardown calls setState
        // on an unmounted tree.
        trigger.kill();
        if (frame.current !== 0) {
          cancelAnimationFrame(frame.current);
          frame.current = 0;
        }
        pending.current = null;
      };
    },
    root,
    [interval, minDelta, scrub, scrollerRef, reduced],
  );
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The context cleanup kills the ScrollTrigger first and only then cancels any outstanding animation frame, and nulls the pending value. Reversing the order leaves a window in which the still-live trigger schedules a frame that is never cancelled, and that flush calls `setState` on an unmounted tree — thrown from inside a rAF callback, so the stack trace names no component.

**Reduced motion.** The trigger stays, because the value tracks a scroll the reader is performing rather than animating on its own, but `scrub` becomes `true` — welded to the scroll position with no catch-up easing, so nothing continues to move after the reader stops. The gate is unchanged.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Calling `setState` directly from `onUpdate`. On a trackpad flick that is 100+ renders a second of the entire subtree; the symptom is that scrolling is smooth on an empty page and drops to single-digit frame rates as soon as a real list is rendered below the component.
- Throttling without the boundary override. Release a fast flick and the final tick lands inside the cooldown window, so the state stops at whatever value last got through — a progress bar that never quite reaches 100% and a "complete" branch that never runs.
- Re-committing the boundary on every tick. Once progress is pinned at 1, every subsequent tick passes the override, so idling at the end of the range renders continuously — the opposite of the intent.
- Skipping the rAF coalescer. ScrollTrigger fires per scroll event, so two or three ticks can pass the time and distance gates within a single frame and React renders three times for one painted change.
- Cancelling the frame before killing the trigger. The trigger can schedule a new frame between the two calls, and that flush lands after unmount — `setState` on a dead tree, thrown from a rAF callback with no component in the stack trace.
- Storing tick and commit counts in state. They are diagnostics about renders; putting them in state makes every diagnostic a render and the measurement becomes the thing being measured.

## Notes

- The continuous signal is still available: anything that needs per-frame precision should be written imperatively from `onUpdate`, and only the coarse state should come through the gate.
- The render prop receives the committed state only, so consumers cannot accidentally subscribe to the raw tick rate.

## Definition of done

Scroll the panel and watch the two counters: ticks climbs continuously while commits climbs in steps, at roughly a tenth the rate. Flick hard to the very bottom and the progress readout reads exactly 100%, not 93%. Hold still at the bottom and the commit counter stops increasing. Move the scroller by one or two pixels at a time and no commit happens until the distance threshold is crossed.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
