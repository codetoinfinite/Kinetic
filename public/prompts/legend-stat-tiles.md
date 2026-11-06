# Build: Legend Stat Tiles

A grey dashboard card: a title, the headline total with an optional delta chip, a thin bar split into one coloured segment per series, and a grid of white legend tiles. Each tile carries a chart-token dot, its label, its value and its share of the total. Clicking a tile takes that series out of the total, and the bar, headline and percents rebalance; hovering or focusing a tile spotlights its segment.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A headline total over a segmented proportion bar and legend tiles with dots, values and percents that toggle series in and out.

- Category: display
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. Resolve the hidden ids through a small controllable-state helper: `hidden` wins when defined, otherwise local state seeded by `defaultHidden`; `onHiddenChange` fires either way.
2. Mark each segment shown when it is not hidden and its value is above zero, and sum only shown values into the headline total.
3. Render the bar as a flex row with `flex-grow: value` and `flex-basis: 0` on every segment (0 for hidden ones). The widths are then the exact shares of the shown total, with no percentage arithmetic, and `transition-[flex-grow]` animates a rebalance over 300ms.
4. Print percents with largest-remainder rounding (`wholePercents`): floor every share, then hand the leftover points to the largest remainders, so the tiles always add up to exactly 100%.
5. Render each tile as a toggle `<button aria-pressed>`. Hiding the last shown series is refused (the tile gets `aria-disabled`), so the bar never empties. A hidden tile fades to 60% and its dot turns into an outlined ring.
6. Track the hovered or focused id in state. When that series is shown, dim every other bar segment to 35% and every other tile to 60%; a hidden series spotlights nothing, so the bar never fades as a whole.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `colour order = chart-6, chart-2, chart-3, chart-5, chart-1, chart-8, chart-4, chart-7, chart-9`
  Neighbouring defaults alternate cool and warm hues, so adjacent bar segments stay distinct even when no colours are passed.
- `bar = h-2, 2px gaps, rounded-full track`
  Thin enough to read as a legend summary rather than a chart; the 1px padding on each side of a segment makes the 2px seams without a gap property that would leave space for hidden segments.
- `tile grid = 2 columns, 4 from @xl (container 36rem)`
  A container query, so the tiles reflow by the card width, not the viewport.

## API

```ts
type LegendSegment = { id: string; label: string; value: number; color?: "chart-1" | … | "chart-9" }
function LegendStatTiles(props: LegendStatTilesProps): JSX.Element
function wholePercents(values: number[]): number[]
```

- `segments: LegendSegment[]`
  Series in display order.
- `title: string` — default `"Total"`
  Header label and the card's accessible name.
- `change: number`
  Headline delta as a fraction (0.148 → +14.8%). Lime when positive, rose when negative.
- `hidden / defaultHidden / onHiddenChange: string[]` — default `[]`
  Ids left out of the total, controlled or uncontrolled.
- `toggleable: boolean` — default `true`
  Tiles toggle their series when clicked.
- `formatValue: (value: number) => string`
  Formats the total and tile values. Defaults to Intl.NumberFormat(locale).
- `locale: string` — default `"en-US"`
  Locale for the default number and percent formats.
- `className: string`
  Merged onto the card.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
// Only shown segments count: the headline total is their sum, and the bar
// gives each one `flex-grow: value` on a zero basis, so the widths are the
// exact shares of that total. The printed percents use largest-remainder
// rounding so they also add up to 100.
const rows = useMemo(() => {
  const shown = segments.map((s) => !hidden.includes(s.id) && s.value > 0);
  const percents = wholePercents(segments.map((s, i) => (shown[i] ? s.value : 0)));
  return segments.map((s, i) => ({
    ...s,
    color: s.color ?? ORDER[i % ORDER.length] ?? "chart-1",
    shown: shown[i] ?? false,
    percent: percents[i] ?? 0,
  }));
}, [segments, hidden]);
const total = rows.reduce((sum, r) => sum + (r.shown ? r.value : 0), 0);
const shownCount = rows.filter((r) => r.shown).length;
// Spotlight only a series that is in the bar; a hidden one would dim them all.
const spotlight = rows.find((r) => r.id === active && r.shown)?.id ?? null;

const toggle = (id: string) => {
  const isHidden = hidden.includes(id);
  // Keep at least one segment in the total, so the bar never empties.
  if (!isHidden && shownCount <= 1) return;
  setHidden(isHidden ? hidden.filter((h) => h !== id) : [...hidden, id]);
};
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. The component has no timers, listeners outside React or effects.

**Reduced motion.** The bar rebalance and the dimming transitions carry `motion-reduce:transition-none`, so under `prefers-reduced-motion: reduce` the bar and tiles jump straight to their new state.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not compute the bar widths as rounded percents. Rounded widths can sum to 99% or 101% and leave a sliver or overflow; flex-grow on a zero basis is always exact.
- Give every segment a stable `id`. The hidden list and the hover spotlight key off it.
- Values at or below zero are treated as hidden. Negative contributions do not fit a proportion bar.

## Notes

- Set `toggleable={false}` for a read-only legend; tiles then render as plain `<div>`s.
- Pass `formatValue` for currency or compact numbers. It formats both the headline and each tile value.
- The bar is a single `role="img"` element whose label lists every shown series and its percent.

## Definition of done

The headline equals the sum of shown values and the bar segments are proportional to them. The tile percents add up to 100. Clicking a tile hides its series: its percent reads "Off", its dot becomes a ring, its bar segment collapses and the total drops. Clicking it again restores it. The last shown tile cannot be hidden. Hovering a tile dims the other segments. Tiles sit two per row on narrow cards and four per row on wide ones. Light and dark both read correctly.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
