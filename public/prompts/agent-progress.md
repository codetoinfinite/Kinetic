# Build: Agent Progress

A compact block that runs an ordered list of steps. Each step runs for stepDuration with its own ring filling, then checks off with a strike-through while the next one lights up; the header ring tracks the whole run and counts the steps left. The block can be minimized without losing its place, and after the last check it holds for completionDelay before calling onFinished.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A minimizable step list for multi-step agent work: an overall ring, a timed ring on the running step, check-offs and a completion hand-off.

- Category: display
- Runtime cost: dom
- Dependencies: motion@^12.43.0, @remixicon/react@^4.9.0

## How it works

1. useStepClock stamps performance.now() when a step becomes active and samples the elapsed fraction in a requestAnimationFrame loop; at 1 it calls advance(step + 1), which changes the effect key and starts the next clock.
2. The fraction is stored with the step it belongs to, so a new step reads 0 on its first render without a synchronous reset in the effect.
3. Rings are a 16-unit SVG circle with stroke-dasharray equal to its circumference; dashoffset = C·(1 − fraction). The header ring uses (done + fraction) / total.
4. Rows enter with a 60ms stagger (opacity, 6px rise, 2px blur) through motion; finished steps swap their ring for a check that springs in.
5. Minimizing collapses the list with a grid-template-rows 0fr transition and makes it inert; the clock keeps running, so reopening shows the current step.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `stepDuration = 2400ms`
  Long enough to read a step label and watch its ring fill, short enough that five steps finish in about 12s.
- `completionDelay = 1000ms`
  Lets the last check and "All steps done" register before the caller swaps in the reply.
- `STAGGER_S = 0.06`
  Rows arrive as a quick cascade; slower reads as lag on a five-step list.
- `REDUCED_TICKS = 4`
  Under reduced motion the rings step in quarters instead of moving every frame.

## API

```ts
<AgentProgress steps={["Analyze the request", "Generate the component"]} stepDuration={2400} completionDelay={1000} onFinished={() => reply()} />
```

- `steps: readonly string[]`
  Ordered step labels.
- `step / defaultStep / onStepChange: number / number / (step: number) => void` — default `0`
  Index of the running step, controlled or uncontrolled. steps.length means done.
- `stepDuration: number` — default `2400`
  Milliseconds each step runs.
- `completionDelay: number` — default `1000`
  Milliseconds to hold the done state before onFinished.
- `onFinished: () => void`
  Fires once after the final step and the completion delay.
- `minimized / defaultMinimized / onMinimizedChange: boolean / boolean / (minimized: boolean) => void` — default `false`
  Collapses the list to the header.
- `remainingLabel: (remaining: number) => string` — default `"{n} steps left"`
  Header copy while running.
- `doneLabel: string` — default `"All steps done"`
  Header copy once finished.
- `className: string`
  Classes on the block.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/** done / running / pending for row i while step `active` runs. */
export function stepState(index: number, active: number): AgentStepState {
  if (index < active) return "done";
  return index === active ? "running" : "pending";
}

/**
 * Drives one step: measures elapsed time from the moment `step` became active
 * and reports the fraction. A frame loop paints the rings smoothly; under
 * reduced motion a 4-tick interval moves them in quarters. When the fraction
 * reaches 1 the step is handed to `advance`, which re-keys this effect.
 */
function useStepClock(
  step: number,
  total: number,
  duration: number,
  reduced: boolean,
  advance: (next: number) => void,
) {
  const [tick, setTick] = useState({ step: -1, fraction: 0 });
  const advanceRef = useRef(advance);
  useEffect(() => {
    advanceRef.current = advance;
  });

  useEffect(() => {
    if (step < 0 || step >= total) return;
    const started = performance.now();
    const span = Math.max(1, duration);
    let raf = 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    const sample = () => {
      const fraction = Math.min(1, (performance.now() - started) / span);
      setTick({ step, fraction });
      if (fraction >= 1) advanceRef.current(step + 1);
      return fraction >= 1;
    };
    if (reduced) {
      interval = setInterval(() => {
        if (sample() && interval) clearInterval(interval);
      }, span / REDUCED_TICKS);
    } else {
      const loop = () => {
        if (!sample()) raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    return () => {
      cancelAnimationFrame(raf);
      if (interval) clearInterval(interval);
    };
  }, [step, total, duration, reduced]);

  return tick.step === step ? tick.fraction : 0;
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The clock effect cancels its requestAnimationFrame or interval whenever the step, duration or motion preference changes and on unmount; the completion timeout is cleared the same way.

**Reduced motion.** Rows appear without the stagger, checks appear without the spring, the list opens and closes instantly, the label shimmer stops, and the rings advance in four discrete quarters per step instead of every frame. Steps still advance on time.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Restarting at the same step index does not restart the clock; remount with a new key to replay the stagger and the timer from zero.
- In controlled mode the clock only advances through onStepChange; if the parent ignores it, the running ring stops full.
- onFinished is read through a ref, so an inline callback does not restart the completion timer.

## Notes

- Pass step + onStepChange to skip ahead or sync with real agent events; steps.length means every step is done.
- The running label uses the theme agent-progress-loading-text shimmer, which already falls back to plain text under reduced motion.

## Definition of done

The header reads "5 steps left" then counts down as each step checks off; Skip step jumps to the next row; minimize hides the list and the count keeps moving; after the last step the header reads "All steps done" and onFinished fires about a second later; Restart replays from the first step.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
