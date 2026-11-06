# Build: Activity Rings Card

A grey dashboard card with one value tile per goal (Move, Exercise, Running by default) above a stack of concentric SVG progress rings. Each ring starts at twelve o'clock and sweeps clockwise to its share of the goal over a tinted track, the outer ring first. Hovering or focusing a ring or its tile dims the others and puts the percentage in the centre, and clicking a tile pins that focus. Under reduced motion the rings are simply there at their final length.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Watch-style concentric goal rings in SVG with value tiles: the rings draw in on mount, and hovering a ring or tile focuses it.

- Category: display
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. Each ring is a pair of circles rotated by -90° so the path starts at twelve o'clock: a track and a progress stroke. The track colour is the ring colour mixed 22% into `--color-chart-track` with `color-mix(in oklab, …)`, so it reads as a pale tint in light mode and a dark tint in dark mode.
2. The progress circle has `pathLength={100}`, so the dash maths is in percent regardless of radius: `stroke-dasharray: 100 100` and `stroke-dashoffset: 100 - pct` leave exactly pct percent of the lap visible, with round caps on both ends. Progress is clamped to 0–100 for the arc.
3. Radii step inward: the outer ring sits half a stroke inside the edge and each next one moves in by one 18px band plus a 4px gap, which leaves a 60px hole at the default 184px size. More than three rings get thinner bands so they still fit.
4. On mount every offset is 100 (nothing drawn). Two `requestAnimationFrame`s later `drawn` flips to true and the offsets move to their targets through a CSS `transition-[stroke-dashoffset]` of 1100ms with an expo-out curve, delayed 140ms per ring from the outside in. A remount (the demo's Replay) draws them again.
5. Focus is `preview ?? pinned`. Pointer enter on a ring group (hit-tested on the stroke only, so the gaps do not count) or on a tile sets the preview; leaving clears it; clicking a tile toggles the pinned ring, which can also be controlled with `focused` and `onFocusedChange`. Unfocused rings fade to 30% and unfocused tiles to 50%.
6. The centre readout is a polite live region that shows the focused ring's percentage and label, keyed by ring so `.animate-number-fade` replays on each change. The SVG itself carries an `aria-label` listing every ring's percentage.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `STROKE / RING_GAP = 18px / 4px at 184px`
  Fat bands with a hairline of card between them read as separate rings at a glance; both scale with `size`.
- `draw = 1100ms, cubic-bezier(0.22, 1, 0.36, 1)`
  The expo-out curve spends most of the time near the end, so the rings sweep in fast and settle gently on the exact value.
- `STAGGER_MS = 140ms`
  Enough to see the rings draw one after another from the outside in without making the last one feel late.
- `track mix = 22%`
  Keeps the unfinished part of the lap visibly the ring's colour but much lighter than the stroke, in both themes.

## API

```ts
function ActivityRingsCard(props?: ActivityRingsCardProps): JSX.Element
type ActivityRing = { id: string; label: string; value: number; goal: number; display?: string; color: string }
const ACTIVITY_RINGS: ActivityRing[]
```

- `title: string` — default `"Activity"`
  Header label.
- `caption: string`
  Right-hand header text, such as the selected day.
- `rings: ActivityRing[]` — default `ACTIVITY_RINGS`
  Rings from the outside in, each with its value, goal, display text and colour.
- `size: number` — default `184`
  Diameter of the ring stack in px; stroke and gap scale with it.
- `focused: string | null`
  Controlled pinned ring id.
- `onFocusedChange: (id: string | null) => void`
  Called when a tile click pins or unpins a ring.
- `className: string`
  Merged onto the card section.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
// Each ring is a circle with pathLength 100, so a dash of p units is p percent of the lap.
// The outer radius leaves half a stroke of room; each inner ring steps in by one band plus the gap.
const stroke = rings.length > 3 ? Math.max(8, (size / 2 - 20) / rings.length - RING_GAP) : (STROKE * size) / SIZE;
const geometry = rings.map((ring, i) => {
  const r = size / 2 - stroke / 2 - i * (stroke + RING_GAP);
  const pct = ring.goal > 0 ? (ring.value / ring.goal) * 100 : 0;
  const shown = drawn || reduced ? Math.min(100, Math.max(0, pct)) : 0;
  return { ring, r, pct, offset: 100 - shown, delay: i * STAGGER_MS };
});
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The mount effect cancels both pending animation frames on unmount. Everything else is CSS transitions and React event props.

**Reduced motion.** With `prefers-reduced-motion: reduce`, `useReducedMotion` renders the rings at their final offsets from the start and `motion-reduce:transition-none` removes the draw transition, so nothing sweeps. The focus fades and the centre readout fade are also instant.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Animating `stroke-dasharray` or computing `2πr` per ring. `pathLength={100}` makes every ring use the same 0–100 numbers, so one transition rule covers them all.
- Starting the transition in the same frame as the first paint. Setting `drawn` straight from `useEffect` can be batched with the initial render and the rings appear without animating; waiting two animation frames guarantees the browser has painted the empty state first.
- Letting progress past 100% wrap the dash. The arc is clamped to a full lap; the centre readout still shows the real percentage, such as 112%.

## Notes

- `ACTIVITY_RINGS` and the `ActivityRing` type are exported. A ring is `{ id, label, value, goal, display?, color }`.
- Pass `caption` to show the day on show at the top right; the Most Active Days Card demo uses this to pair the two cards.

## Definition of done

The default card reads "Activity" with three tiles, Move 1,592 kcal (pink), Exercise 1h 45m (lime) and Running 5.2 km (sky), and three rings that draw clockwise from the top to about 88%, 81% and 76%. Hovering the Exercise ring or tile dims the other rings and tiles and shows "81%" and "Exercise" in the centre; leaving restores them. Replay draws the rings again.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
