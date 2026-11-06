# Build: Heatmap Chart Card

A grey dashboard card that lays out any two-axis data, such as weekday by hour or region by month, as a CSS grid of rounded cells. Each cell's colour is the accent mixed into the chart track by its share of the maximum, so the ramp follows the theme in light and dark. Hovering a cell, or moving to it with the arrow keys, rings it, darkens its row and column labels, floats a small tooltip and swaps the count-up headline to that cell with its gap to the average. A period pill switches between datasets and the cells pop in again on every switch.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A two-axis heatmap card on a plain CSS grid: cells mix the accent into the chart track, and hovering one rings it and swaps the headline.

- Category: display
- Runtime cost: css
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. Resolve the data: `ranges` wins, then `rows`; with neither, the card runs on `HEATMAP_RANGES`, three built-in weekday by two-hour datasets. Those come from a working-hours bell plus an evening bump, a weekday weight and a seeded `createRng` wobble, scaled so the cells sum to an exact total (1,892 for the last 7 days). The rounding residue goes onto the busiest cell.
2. One `useMemo` derives the total, the mean cell and the ceiling, which is `max` (prop or range) or else the largest value. A cell at value v paints `color-mix(in oklab, <accent> s%, var(--color-chart-track))` with `s = 10 + 90 * min(1, v / ceiling)`. The legend draws the same mix at 0.15, 0.4, 0.6, 0.8 and 1.
3. The grid is one CSS grid with `grid-template-columns: max-content repeat(n, minmax(0, 1fr))` and a 4px gap: a label column, then one track per column, and a last row of column labels. Row height is `floor((168 - (rows - 1) * 4) / rows)` clamped to 18–40px, which gives 20px cells for 7 rows and 39px cells for 4. The section is a size container, and when it is under 24rem with more than 8 columns, every other column label is hidden so the labels never touch.
4. Each cell has `.animate-cell-pop` (fade and scale from 0.5) with a delay of `c * 24 + r * 16` ms, so the grid fills in a diagonal sweep. The grid is keyed by the active range id, so a period switch remounts it and the sweep plays again.
5. Hovering a cell sets `active`. The cell gets a 2px `outline` in `--color-text-primary`, offset 1px and lifted with `z-10`, and its row and column labels turn from tertiary to primary text. A tooltip inside the cell shows the cell name and value, anchored left on the first two columns, right on the last two and centred elsewhere.
6. The header swaps `title` for the cell name ("Tue · 14:00" for the built-in data) and the total for the cell value through `useCountUp`. The value sits in a `<p>` keyed by the cell so `.animate-number-fade` replays. The chip changes from the period change to the cell's percent gap to the mean, with a "vs avg" suffix.
7. The grid is one tab stop (`role="group"`, `aria-roledescription="heatmap"`). Arrow keys move the active cell in two dimensions, Home and End jump to the row ends, and Escape, blur or leaving the grid with the pointer clears it. The header is an `aria-live="polite"` region, so the new cell is announced.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `MIX_FLOOR = 10%`
  A zero cell keeps a trace of the accent, so it still reads as part of the grid rather than as a hole in the card.
- `PLOT_HEIGHT / row clamp = 168px shared, rows 18–40px`
  Cards with 4 or 7 rows end up about the same height, so a dashboard row of heatmaps lines up without fixing the row count.
- `cell delay = c × 24ms + r × 16ms`
  The sweep runs left to right first, the way the eye reads time, and the whole 7 × 12 grid lands in about 700ms including the 380ms pop.
- `LEGEND_STEPS = 0.15, 0.4, 0.6, 0.8, 1`
  Five evenly readable swatches. The first step is above the floor so the "Less" swatch is still visibly tinted.

## API

```ts
function HeatmapChartCard(props?: HeatmapChartCardProps): JSX.Element
type HeatmapRow = { label: string; values: number[] }
type HeatmapRange = { id: string; label: string; rows: HeatmapRow[]; columns?: string[]; max?: number; change?: number; headline?: number }
const HEATMAP_RANGES: HeatmapRange[]
const HEATMAP_HOURS: string[]
```

- `title: string` — default `"Active users"`
  Header label while no cell is active.
- `rows: HeatmapRow[]`
  One entry per row; `values` line up with `columns`. Ignored when `ranges` is passed.
- `columns: string[]` — default `HEATMAP_HOURS for the built-in data, else "1"…"n"`
  Column labels under the grid.
- `color: string` — default `"var(--color-chart-6)"`
  Ramp accent; any CSS colour.
- `max: number` — default `largest value`
  Value of a fully saturated cell.
- `change: number`
  Percent change for the chip when `ranges` is not used.
- `headline: number` — default `sum of all cells`
  Headline figure when `ranges` is not used.
- `periodLabel: string` — default `"This week"`
  Text of the static pill when no ranges are in play. An empty string hides it.
- `ranges: HeatmapRange[]` — default `HEATMAP_RANGES when no rows are passed`
  Periods for the dropdown pill; each brings its own rows.
- `range: string`
  Controlled active range id.
- `defaultRange: string` — default `first range`
  Uncontrolled starting range id.
- `onRangeChange: (id: string) => void`
  Called with the id picked from the period menu.
- `format: (value: number) => string` — default `rounded en-US number`
  Formats the headline and tooltip values.
- `cellLabel: (row: string, column: string) => string` — default `"Row · Column"`
  Names a cell in the header and tooltip.
- `className: string`
  Merged onto the card section.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const model = useMemo(() => {
  const all = rows.flatMap((r) => r.values.slice(0, columns.length));
  const total = all.reduce((a, b) => a + b, 0);
  const largest = Math.max(0, ...all);
  const ceiling = maxProp ?? activeRange?.max ?? largest;
  return { total, mean: all.length ? total / all.length : 0, ceiling: ceiling > 0 ? ceiling : 1, largest };
}, [rows, columns.length, maxProp, activeRange]);

// Each cell mixes the accent into the chart track, so the ramp follows the theme.
const mix = (t: number) => {
  const share = MIX_FLOOR + (100 - MIX_FLOOR) * Math.min(1, Math.max(0, t));
  return `color-mix(in oklab, ${color} ${Math.round(share)}%, var(--color-chart-track))`;
};
const rowHeight = Math.max(
  ROW_HEIGHT[0],
  Math.min(ROW_HEIGHT[1], Math.floor((PLOT_HEIGHT - (rows.length - 1) * GAP) / Math.max(1, rows.length))),
);

const activeValue = active ? rows[active.r]?.values[active.c] : undefined;
const isActive = active !== null && activeValue !== undefined;
const headlineValue = isActive ? activeValue : (activeRange?.headline ?? headlineProp ?? model.total);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `useCountUp` cancels its animation frame when the target changes and on unmount. The dropdown removes its outside-press listener when it closes. Everything else is CSS and React event props, so nothing else needs tearing down.

**Reduced motion.** Under `prefers-reduced-motion: reduce` the cells appear at once (`motion-reduce:animate-none` on `.animate-cell-pop`, and no delays), the headline shows its value with no count-up and no fade, and the label colour and chevron changes are instant.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Building the ramp from opacity. A translucent accent over the grey card looks right in light mode but turns muddy in dark mode. Mixing into `--color-chart-track` gives an opaque colour that follows each theme.
- Leaving the hovered cell at the default stacking order. Every cell has a transform from the pop animation and so its own stacking context, and later cells would paint over an earlier cell's tooltip. The active cell gets `z-10`.
- Normalising each range by its own largest value when comparing periods. Pin `max` (prop or per range) when the colours have to mean the same thing across ranges.

## Notes

- `HEATMAP_RANGES` and `HEATMAP_HOURS` are exported, as are the `HeatmapRow` and `HeatmapRange` types. A range can carry its own `columns`, `max`, `change` and `headline`.
- Pass `cellLabel` to name cells differently in the header and tooltip, for example `(row, col) => `${col} ${row}``.

## Definition of done

The default card reads "Active users", "1,892" and a lime "+5.2%" chip with a "Last 7 days" pill. Below is a 7 × 12 blue grid, Mon–Sun by 00–22, darkest around midday on weekdays and lighter at night and on weekends, with a Less → More legend. Hovering a cell rings it, darkens its row and column labels, shows a tooltip and changes the header to "Tue · 14:00" style text with that cell's value and a "vs avg" chip. Picking "Last 30 days" pops the cells in again and shows "8,214". The emerald region card reads "963" and switches to H2 columns Jul–Dec.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
