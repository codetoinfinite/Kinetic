# Build: Finance KPI Row

A responsive row of grey KPI cards. Each card has a white icon tile, a label, the value in a 24px medium figure, a percent delta chip and a 96×36 sparkline with a soft area fill and an end dot. The chip and line colour follow whether the move is good news, so rising expenses read rose while rising income reads lime. With `selectable`, the cards become pressed-state buttons that pick one metric for a chart.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Balance, income, expense and savings cards with a delta chip coloured by good or bad news and a tiny area sparkline.

- Category: display
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. Wrap the list in a `@container` and lay it out as a grid: one column, two from `@sm` (24rem) and four from `@3xl` (48rem), so the row wraps by its own width rather than the viewport. Below `@sm` each card collapses to one compact line (icon, figures, sparkline) by turning the top line into `display: contents` and reordering with `order`, so four cards fit a phone screen.
2. Classify each card with `toneOf(change, goodDirection)`: zero is flat, otherwise good when the sign of the change matches the good direction (`"up"` by default, `"down"` for expenses). Good maps to a lime chip and a chart-7 line, bad to rose and chart-3, flat to neutral.
3. Project the trend with `sparkPoints` into a 96×36 box with 3 units of padding: x steps evenly across the points, y is inverted against the series min and max, and a flat series sits on the middle line.
4. Draw a `M…L…` line path with a 1.75 stroke, close a copy down to the baseline for the area and fill it with a per-instance `useId` linear gradient from 28% to 0% of `currentColor`, then mark the last point with a 3-unit dot outlined in the card colour.
5. Format values with `Intl.NumberFormat(locale, { style: "currency", maximumFractionDigits: 0 })` unless the item passes its own `format`, and deltas with a percent format using `signDisplay: "exceptZero"`; the chip also carries a screen-reader-only comparison label.
6. When `selectable`, render each card as a `<button aria-pressed>` and resolve the selection controlled (`selectedId`) or from local state seeded by `defaultSelectedId` or the first item; the selected card lifts to a white surface with a hairline ring.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `sparkline box = 96×36 with 3px padding`
  Fits the empty top-right corner beside the 32px icon tile without crowding the value line.
- `area gradient = 28% → 0% currentColor`
  Enough fill to read the shape at a glance, faint enough that the line stays the mark.
- `grid breakpoints = 1 col, 2 from @sm (24rem), 4 from @3xl (48rem)`
  A $84,230 figure plus its chip needs about 180px; below that the cards stack.
- `value type = text-title-1-medium (24px)`
  Matches the headline figures of the other dashboard cards.

## API

```ts
type FinanceKpi = { id: string; label: string; value: number; change: number; trend?: number[]; icon?: ComponentType; goodDirection?: "up" | "down"; format?: (v: number) => string }
function FinanceKpiRow(props: FinanceKpiRowProps): JSX.Element
function sparkPoints(values: number[], w?: number, h?: number, pad?: number): [number, number][]
```

- `items: FinanceKpi[]`
  Cards in display order.
- `selectable: boolean` — default `false`
  Turns the cards into aria-pressed buttons that pick one metric.
- `selectedId / defaultSelectedId / onSelectionChange: string` — default `first item id`
  Selected card, controlled or uncontrolled.
- `currency: string` — default `"USD"`
  ISO 4217 code for the default value format.
- `locale: string` — default `"en-US"`
  Locale for values and percents.
- `comparisonLabel: string` — default `"vs last month"`
  Screen-reader text appended to each delta chip.
- `aria-label: string` — default `"Key metrics"`
  Accessible name of the list.
- `className: string`
  Merged onto the container.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/** Map values onto the sparkline box: x spreads evenly, y is inverted so a
 *  larger value sits higher. A flat series draws along the middle. */
export function sparkPoints(values: number[], w = SPARK_W, h = SPARK_H, pad = SPARK_PAD): [number, number][] {
  if (values.length < 2) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const step = (w - pad * 2) / (values.length - 1);
  return values.map((v, i) => [
    pad + i * step,
    span === 0 ? h / 2 : pad + (h - pad * 2) * (1 - (v - min) / span),
  ]);
}

function Sparkline({
  values,
  tone,
  label,
  className,
}: {
  values: number[];
  tone: "good" | "bad" | "flat";
  label: string;
  className?: string;
}) {
  const gradientId = useId();
  const pts = sparkPoints(values);
  const last = pts[pts.length - 1];
  const first = pts[0];
  if (!last || !first) return null;
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
  const area = `${line} L${last[0].toFixed(2)} ${SPARK_H} L${first[0].toFixed(2)} ${SPARK_H} Z`;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      className={cx(
        "h-9 w-24 shrink-0 overflow-visible",
        className,
        tone === "good" ? "text-chart-7" : tone === "bad" ? "text-chart-3" : "text-chart-neutral",
      )}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={3} fill="currentColor" className="stroke-background-secondary-default" strokeWidth={1.5} />
    </svg>
  );
}

/** Good news is lime and bad news rose, whatever the sign: a rising expense
 *  line is bad, a falling one good. */
function toneOf(change: number, goodDirection: "up" | "down"): "good" | "bad" | "flat" {
  if (change === 0) return "flat";
  return (change > 0) === (goodDirection === "up") ? "good" : "bad";
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. The component has no timers, listeners or effects.

**Reduced motion.** The only motion is the 200ms surface change when a card is selected; it carries `motion-reduce:transition-none`, so under `prefers-reduced-motion: reduce` the selection switches instantly.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Colour the delta by good or bad news, not by sign. A +2.4% expense increase is bad and must not read lime.
- Give each sparkline gradient its own id (`useId`). A shared id makes every card paint with the first card's colour.
- A series with fewer than two points has no line; the sparkline is skipped rather than drawn as a dot.

## Notes

- Pass `format` per item for non-currency metrics such as a savings rate.
- Without `selectable` the cards are plain `<div>`s with no focus stops.
- `sparkPoints` is exported for reuse in other tiny charts.

## Definition of done

Four cards show Total balance $84,230 +3.2%, Income $18,420 +6.1%, Expenses $9,140 +2.4% and Savings $32,400 +8.4%. The Expenses chip and sparkline are rose, the others lime. Each sparkline ends in a dot at its last value. Clicking Income sets aria-pressed on it, lifts it to a white surface and the demo caption reads "Charting Income". The row shows four cards across at 1100px, two at medium widths and, at 360px, one compact single-line card per row so all four plus the caption stay on screen. Light and dark both read correctly.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
