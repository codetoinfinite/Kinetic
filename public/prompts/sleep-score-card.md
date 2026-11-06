# Build: Sleep Score Card

A grey dashboard card headed "Sleep score" with a rating word ("Excellent") and a week pill with arrows. Below sits a ring split into one coloured arc per metric (Duration, Bedtime, Interruptions), each owning a share of the lap equal to its points available and filled by its score, with the total in the middle. A white panel lists the metrics with their detail and score; hovering or focusing a row (or an arc) dims the other arcs and puts that metric's score in the centre, and stepping through weeks glides the arcs to the new values.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A segmented SVG ring that sums sleep sub-scores to a total out of 100, with a week switcher and metric rows that focus their arc.

- Category: display
- Runtime cost: css
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. Each metric owns a slot of the ring sized `max / sum(max) × 100` percent (50, 30 and 20 by default, so the total reads out of 100), laid clockwise from twelve o'clock in row order. Its arc fills `score / max` of that slot.
2. Every arc is a circle with `pathLength={100}` rotated -90°, drawn with `stroke-dasharray: length 100` and `stroke-dashoffset: -start` over a full `stroke-chart-track` circle. Round caps reach half a stroke past each dash end, so the dash is trimmed by one cap on each side, `cap = (stroke / 2) / (2πr) × 100`, plus a 4% visible gap, and starts a half-gap plus a cap into its slot.
3. The dash length, offset and opacity are inline CSS properties with a 700ms expo-out `transition-[stroke-dasharray,stroke-dashoffset,opacity]`. On mount every arc has length 0 and opacity 0; two animation frames later the real values apply, so the arcs grow in. Changing week only changes the numbers, so the same transition glides each arc to its new length.
4. The week pill steps an index into `weeks` (controlled via `weekIndex` / `onWeekIndexChange`, or uncontrolled starting at the latest week); the arrows disable at either end. The rating word comes from `rate(total)` (Excellent ≥ 90, Good ≥ 75, Fair ≥ 60, else Poor) and is keyed by week so it fades in on change.
5. Focus is `preview ?? pinned`: pointer enter on a row or an arc (hit-tested on the stroke) and keyboard focus on a row set the preview; clicking a row toggles the pinned metric. Other arcs drop to 25% and other rows to 50%, and the centre swaps the total for the focused score with "of max" underneath, in a polite live region.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `SIZE / STROKE = 108px / 12px`
  A chunky band on a small ring, as in the reference; the stroke scales with `size`.
- `GAP = 4 (ring percent)`
  About 15° of track shows between arcs after the caps are trimmed, enough to read the segments as separate scores.
- `arc transition = 700ms, cubic-bezier(0.22, 1, 0.36, 1)`
  Fast start and soft landing, so a week change reads instantly but the arcs settle gently.
- `max split = 50 / 30 / 20`
  Duration matters most, so it owns half the ring; the three maxima sum to 100 so the centre total is a percentage-style score.

## API

```ts
function SleepScoreCard(props?: SleepScoreCardProps): JSX.Element
type SleepMetric = { id: string; label: string; detail: string; score: number; max: number; color: string }
type SleepWeek = { id: string; label: string; metrics: SleepMetric[] }
```

- `title: string` — default `"Sleep score"`
  Header label.
- `weeks: SleepWeek[]` — default `SLEEP_WEEKS`
  Weeks the pill steps through, oldest first.
- `weekIndex: number`
  Controlled index into `weeks`.
- `defaultWeekIndex: number` — default `weeks.length - 1`
  Uncontrolled starting week.
- `onWeekIndexChange: (index: number) => void`
  Called when an arrow changes week.
- `rate: (score: number) => string` — default `sleepRating`
  Turns the total into the headline word.
- `size: number` — default `108`
  Ring diameter in px.
- `className: string`
  Merged onto the card section.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
// Every metric owns a slot of the lap sized by its `max`; its arc fills score/max of that slot.
// Round caps poke out half a stroke past each dash end, so the dash is trimmed by a cap on both
// sides plus the visible GAP. With pathLength 100 the cap length in ring percent is
// (stroke / 2) / circumference * 100.
const cap = ((stroke / 2) / (2 * Math.PI * r)) * 100;
let cursor = 0;
const segments = metrics.map((m) => {
  const slot = totalMax > 0 ? (m.max / totalMax) * 100 : 0;
  const fill = m.max > 0 ? Math.min(1, Math.max(0, m.score / m.max)) : 0;
  const start = cursor + GAP / 2 + cap;
  const length = Math.max(0, slot * fill - GAP - 2 * cap);
  cursor += slot;
  const shown = drawn || reduced;
  return { m, start, length: shown ? length : 0, visible: shown && length > 0 };
});
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The mount effect cancels both pending animation frames on unmount. Everything else is CSS transitions and React event props.

**Reduced motion.** With `prefers-reduced-motion: reduce`, `useReducedMotion` renders the arcs at their final lengths from the first frame and `motion-reduce:transition-none` removes the draw and week-change transitions, so arcs jump to new values. The rating and centre fades and the row dimming are also instant.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Forgetting the round caps. A dash of exactly the slot length overlaps its neighbour by a full stroke width; trim one cap from each end before subtracting the visible gap.
- Setting the dash values as SVG attributes and expecting a CSS transition. Put `strokeDasharray` and `strokeDashoffset` in `style` so the browser interpolates them.
- Starting from length 0 with round caps leaves a dot at each arc's start; the arcs also start at opacity 0 and fade in with the draw.

## Notes

- Exports `SLEEP_WEEKS` (six sample weeks, oldest first), `sleepRating` and the `SleepMetric` / `SleepWeek` types. A metric is `{ id, label, detail, score, max, color }`; any number of metrics works and the slots follow their maxima.

## Definition of done

The default card reads "Sleep score", "Excellent", "29 Jun - 5 Jul" and 98 in the centre, with purple, pink and blue arcs that grow in clockwise from the top over a grey track, and rows "Duration: 7h 50m 49/50", "Bedtime: 20m earlier 29/30" and "Interruptions: 5m wake up 20/20". The next arrow is disabled. Hovering the Bedtime row dims the other arcs and rows and shows 29 "of 30" in the centre. Clicking the previous arrow shows "22 Jun - 28 Jun", "Good" and 83, and the arcs shorten smoothly.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
