# Build: Orders Chart Card

A 344px dashboard card that charts twelve months of orders as grouped Recharts bars, last year in neutral grey beside this year in indigo. The header shows the year total with a delta chip and the year-earlier figure. Hovering a month swaps all three for that month, and the number counts to its new value. It shares its frame and header with the revenue chart card and the stat cards, so it drops into the same dashboard row.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A dashboard card of monthly orders as paired bars, this year beside last, whose count-up headline follows the hovered month.

- Category: display
- Runtime cost: dom
- Dependencies: recharts@^3.10.1

## How it works

1. One piece of state, `activeIndex`, drives the header. `BarChart`'s `onMouseMove` reads `state.activeTooltipIndex`, and when `isTooltipActive` is true and the index is finite it stores it. `onMouseLeave` resets it to `null`. A `<Tooltip content={() => null}>` keeps Recharts tracking the hovered category and drawing its cursor band (`fill: var(--color-chart-track)`, opacity 0.5) without rendering a tooltip box.
2. With no month hovered the headline is the sum of `current` over `data` and the comparison is the sum of `previous`. With a month hovered they are that point's two values, and the label becomes the full month name looked up from the short `label` through `MONTHS` and `MONTHS_FULL` (it falls back to the raw label).
3. `describeDelta` turns the pair into a chip. A zero `previous` gives "New" in neutral. Otherwise the percentage change is rounded to one decimal: 0 gives "0%" in neutral, a rise gives "+x%" in lime and a fall "-x%" in rose.
4. The figure is passed through `useCountUp(headlineValue)`, which eases from the shown value to the new one over 320ms with an ease-out cubic on `requestAnimationFrame`. The `<p>` holding it is keyed by `activeIndex ?? "total"`, so each change remounts it and replays `.animate-number-fade` (220ms, opacity 0.35 to 1). The digits are `tabular-nums` and formatted with `toLocaleString("en-US")`.
5. The chart fills the rest of the card through `ResponsiveContainer` at 100% by 100% inside a `min-h-0 flex-1` box. `barCategoryGap="28%"` and `barGap={3}` keep each month's pair together. The Y axis is fixed at 40px wide with `domain={[0, yMax * 1.1]}`, four ticks and `formatK` labels ("2.5k"). The X axis uses `interval="preserveStartEnd"`, so narrow cards drop middle months but keep January and December.
6. Both bars use `radius={[4, 4, 0, 0]}` and grow in over 450ms on mount. Colours are CSS variables (`--color-chart-neutral`, `--color-chart-9-active`) passed to Recharts as `fill`, so the chart follows the light and dark theme without re-rendering.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `card height = h-[344px], gap-6, px-4 pt-4 pb-3`
  Matches the revenue chart card and the stat-card rows, so chart cards placed side by side line up. The chart takes whatever height the header leaves.
- `y domain = [0, yMax * 1.1]`
  The 10% headroom keeps the tallest bar off the top edge. The axis starts at 0 because a bar's length is the value, and a cut axis would exaggerate the gap between years.
- `bar spacing = barCategoryGap 28%, barGap 3`
  A 3px gap reads the two bars as one pair, and the 28% gap between months separates pairs clearly, so twelve pairs still fit at about 560px.
- `count-up and fade = useCountUp 320ms ease-out cubic, number-fade 220ms`
  Fast enough to keep up with a pointer sweeping across months. The fade restarts on every change and covers the first frames of the count, so the swap never looks like a jump.
- `bar entrance = animationDuration 450`
  Long enough to show the bars growing on first paint, short enough to finish before a user reaches for the chart.

## API

```ts
function OrdersChartCard(props?: { data?: OrdersPoint[]; title?: string; className?: string }): JSX.Element
type OrdersPoint = { label: string; current: number; previous: number }
const ORDERS_DATA: OrdersPoint[]
```

- `data: OrdersPoint[]` — default `ORDERS_DATA`
  Twelve points, one per month, each with this year's and last year's orders.
- `title: string` — default `"Orders"`
  Header label shown while no month is hovered.
- `className: string`
  Merged onto the card section, for example to set a width.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function OrdersChartCard({
  data = ORDERS_DATA,
  title = "Orders",
  className,
}: {
  /** Twelve points, one per month; defaults to the demo year. */
  data?: OrdersPoint[];
  /** Headline label when no month is hovered. */
  title?: string;
  className?: string;
} = {}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const totalCurrent = data.reduce((sum, point) => sum + point.current, 0);
  const totalPrevious = data.reduce((sum, point) => sum + point.previous, 0);
  const hovering = activeIndex !== null && activeIndex < data.length;
  const point = hovering ? data[activeIndex] : null;

  const headlineValue = point ? point.current : totalCurrent;
  const comparison = point ? point.previous : totalPrevious;
  const delta = describeDelta(headlineValue, comparison);
  const monthIndex = point ? MONTHS.indexOf(point.label) : -1;
  const label = point ? (monthIndex >= 0 ? MONTHS_FULL[monthIndex] : point.label) : title;
  const display = useCountUp(headlineValue);

  const yMax = Math.max(...data.map((d) => Math.max(d.current, d.previous)));

  return (
    <section
      className={cx(
        "flex h-[344px] min-w-0 flex-1 flex-col gap-6 rounded-2xl bg-background-secondary-default px-4 pt-4 pb-3",
        className,
      )}
    >
      {/* Header: label over the count-up figure and its delta; legend on the right */}
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="w-full text-body-medium text-text-secondary">{label}</p>
          <div className="flex w-full items-center gap-2">
            <p
              key={activeIndex ?? "total"}
              className="animate-number-fade text-title-1-medium whitespace-nowrap text-text-primary tabular-nums"
            >
              {display.toLocaleString("en-US")}
            </p>
            <Chip variant="bold" color={delta.color}>
              {delta.label}
            </Chip>
          </div>
          <p className="text-body-2-medium text-text-tertiary tabular-nums">
            {comparison.toLocaleString("en-US")} {point ? "a year earlier" : "last year"}
          </p>
        </div>
        <dl className="flex shrink-0 items-center gap-4 text-body-2-medium text-text-secondary">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-chart-9-active" aria-hidden />
            <dt>This year</dt>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-chart-neutral" aria-hidden />
            <dt>Last year</dt>
          </div>
        </dl>
      </div>

      {/* Chart */}
      <div className="min-h-0 w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 4, right: 6, bottom: 0, left: 0 }}
            barCategoryGap="28%"
            barGap={3}
            onMouseMove={(state) => {
              const index = Number(state?.activeTooltipIndex);
              if (state?.isTooltipActive && Number.isFinite(index)) setActiveIndex(index);
            }}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <YAxis
              width={40}
              domain={[0, yMax * 1.1]}
              tickCount={4}
              tickFormatter={formatK}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "var(--color-text-tertiary)" }}
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={12}
              interval="preserveStartEnd"
              tick={{ fontSize: 13, fill: "var(--color-text-tertiary)" }}
            />
            <Tooltip content={() => null} cursor={{ fill: "var(--color-chart-track)", opacity: 0.5 }} />
            <Bar
              dataKey="previous"
              fill="var(--color-chart-neutral)"
              radius={[4, 4, 0, 0]}
              isAnimationActive
              animationDuration={450}
            />
            <Bar
              dataKey="current"
              fill="var(--color-chart-9-active)"
              radius={[4, 4, 0, 0]}
              isAnimationActive
              animationDuration={450}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `useCountUp` cancels its pending animation frame when the value changes and on unmount. `ResponsiveContainer` disconnects its resize observer when the card unmounts. The card adds no listeners of its own.

**Reduced motion.** There is no reduced-motion branch. The bars grow in over 450ms on mount, the headline counts over 320ms through `useCountUp` and the number fades in over 220ms on each hover change. All three are short and none moves the layout, but they play regardless of the user's setting.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Dropping the `<Tooltip>`. Without it Recharts does not track the active category, `activeTooltipIndex` never arrives in `onMouseMove`, and the headline never follows the pointer. It renders `content={() => null}` on purpose.
- Putting the card in a parent with no height. The chart is `ResponsiveContainer height="100%"` inside a flex child, and the card sets `h-[344px]` itself. Overriding that with `h-auto` collapses the chart to zero height.
- Passing more or fewer than twelve points without matching labels. The month names come from looking up `label` in `MONTHS`; a label like "Q1" still works but shows as "Q1" in the header.
- Hard-coding hex colours into the `Bar` fills. They are theme variables, so the chart follows the theme with no re-render.

## Notes

- `ORDERS_DATA` and `OrdersPoint` are exported. The default data adds up to 25,162 orders against 20,968 the year before, which the chip shows as "+20%".
- Recharts is forced to `direction: ltr` and its focus outlines are hidden by the theme stylesheet, so the chart reads left to right in an RTL page while the header mirrors.

## Definition of done

The card is 344px tall with "Orders", "25,162" (shown at once, with no count on mount), a lime "+20%" chip and "20,968 last year" in the header, and "This year" and "Last year" legend dots at the end. Twelve pairs of rounded bars grow in. Hovering a month bands it, the label becomes the full month name, and the number counts to that month's orders with its own delta. Leaving the chart returns to the total.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
