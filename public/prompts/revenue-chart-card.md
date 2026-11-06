# Build: Revenue Chart Card

A 344px dashboard card that charts twelve months of revenue with Recharts. This year is a solid line over a gradient-filled area, and last year is a dashed grey line behind it, so the gap between them is what the eye reads. The header shows the year total in dollars with a delta chip and last year's figure. Hovering a month swaps them for that month, counts the number to it and marks the point with a ringed dot.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A dashboard card that draws a year of revenue as a filled area over last year's dashed line, with a hover-following count-up headline.

- Category: display
- Runtime cost: dom
- Dependencies: recharts@^3.10.1

## How it works

1. The chart is a `ComposedChart` with three series drawn in order: a dashed `Line` for `previous` (`strokeDasharray="5 5"`, no dots), an `Area` for `current` with no stroke and a gradient fill, and a solid 2.5px `Line` for `current` on top. All three use `type="monotone"` and grow in over 450ms.
2. The area gradient is a vertical `linearGradient` in the chart's `<defs>`, from `--color-chart-2` at 0.35 opacity to 0. Its id comes from `useId()`, so two cards on one page never share or override each other's gradient.
3. `onMouseMove` reads `state.activeTooltipIndex` and stores it in `activeIndex` when `isTooltipActive` is true and the index is finite. `onMouseLeave` clears it. A `<Tooltip content={() => null}>` keeps Recharts tracking the hovered month and draws a dashed vertical cursor (`--color-chart-cursor`, `4 4`) with no tooltip box.
4. The current line's `activeDot` is a custom `ActiveDot`: a 7px circle at 0.25 opacity under a 4px solid circle with a 2px stroke in the card background colour, so the marker reads as a ring cut out of the line. It returns `null` until Recharts passes coordinates.
5. The header shows the sum of `current` against the sum of `previous`, or the hovered point's pair, with the full month name as its label. `describeDelta` gives "New" when the comparison is 0, "0%" when the one-decimal change rounds to zero, otherwise "+x%" in lime or "-x%" in rose. The headline goes through `useCountUp(Math.round(headlineValue))` (320ms ease-out cubic) inside a `<p>` keyed by `activeIndex ?? "total"`, so `.animate-number-fade` replays on every swap.
6. Money is formatted with `toLocaleString("en-US")` at zero decimals behind a "$". The Y axis is 44px wide with `domain={[0, yMax * 1.1]}`, four ticks and `formatK` labels ("$15k"). The X axis keeps its first and last months at narrow widths through `interval="preserveStartEnd"`.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `area gradient = chart-2 at stopOpacity 0.35 → 0, top to bottom`
  Enough fill to show the area as volume without hiding the dashed last-year line behind it. Fading to 0 at the axis keeps the bottom of the chart quiet.
- `line weights = current 2.5px solid, previous 2px dashed 5 5`
  The heavier solid line is this year and the lighter dashed one is the reference. The difference still reads in greyscale and for colour-blind viewers.
- `active dot = r 7 halo at 0.25 opacity, r 4 core with a 2px background-colour stroke`
  The halo makes the hovered point findable at a glance. The background-coloured stroke separates the core from the line it sits on in both themes.
- `y domain and axis width = [0, yMax * 1.1], width 44`
  10% headroom keeps the peak off the top edge. 44px fits "$15k" at 12px, 4px more than the orders card needs for "2.5k".
- `count-up and fade = useCountUp 320ms, number-fade 220ms`
  Quick enough to track a pointer sweeping across months. The target is rounded to whole dollars before counting, which matches the zero-decimal money format.

## API

```ts
function RevenueChartCard(props?: { data?: RevenuePoint[]; title?: string; className?: string }): JSX.Element
type RevenuePoint = { label: string; current: number; previous: number }
const REVENUE_DATA: RevenuePoint[]
```

- `data: RevenuePoint[]` — default `REVENUE_DATA`
  Twelve points, one per month, each with this year's and last year's revenue.
- `title: string` — default `"Revenue"`
  Header label shown while no month is hovered.
- `className: string`
  Merged onto the card section, for example to set a width.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function RevenueChartCard({
  data = REVENUE_DATA,
  title = "Revenue",
  className,
}: {
  /** Twelve points, one per month; defaults to the demo year. */
  data?: RevenuePoint[];
  /** Headline label when no month is hovered. */
  title?: string;
  className?: string;
} = {}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const gradientId = useId();

  const totalCurrent = data.reduce((sum, point) => sum + point.current, 0);
  const totalPrevious = data.reduce((sum, point) => sum + point.previous, 0);
  const hovering = activeIndex !== null && activeIndex < data.length;
  const point = hovering ? data[activeIndex] : null;

  const headlineValue = point ? point.current : totalCurrent;
  const comparison = point ? point.previous : totalPrevious;
  const delta = describeDelta(headlineValue, comparison);
  const monthIndex = point ? MONTHS.indexOf(point.label) : -1;
  const label = point ? (monthIndex >= 0 ? MONTHS_FULL[monthIndex] : point.label) : title;
  const display = useCountUp(Math.round(headlineValue));

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
              ${formatMoney(display)}
            </p>
            <Chip variant="bold" color={delta.color}>
              {delta.label}
            </Chip>
          </div>
          <p className="text-body-2-medium text-text-tertiary tabular-nums">
            ${formatMoney(comparison)} {point ? "a year earlier" : "last year"}
          </p>
        </div>
        <dl className="flex shrink-0 items-center gap-4 text-body-2-medium text-text-secondary">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-chart-2-active" aria-hidden />
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
          <ComposedChart
            data={data}
            margin={{ top: 4, right: 6, bottom: 0, left: 0 }}
            onMouseMove={(state) => {
              const index = Number(state?.activeTooltipIndex);
              if (state?.isTooltipActive && Number.isFinite(index)) setActiveIndex(index);
            }}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis
              width={44}
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
            <Tooltip
              content={() => null}
              cursor={{ stroke: "var(--color-chart-cursor)", strokeWidth: 1, strokeDasharray: "4 4" }}
            />
            <Line
              type="monotone"
              dataKey="previous"
              stroke="var(--color-chart-neutral)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={false}
              isAnimationActive
              animationDuration={450}
            />
            <Area
              type="monotone"
              dataKey="current"
              stroke="none"
              fill={`url(#${gradientId})`}
              isAnimationActive
              animationDuration={450}
            />
            <Line
              type="monotone"
              dataKey="current"
              stroke="var(--color-chart-2-active)"
              strokeWidth={2.5}
              dot={false}
              activeDot={<ActiveDot />}
              isAnimationActive
              animationDuration={450}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `useCountUp` cancels its pending animation frame when the target changes and on unmount. `ResponsiveContainer` disconnects its resize observer on unmount. The card adds no listeners of its own.

**Reduced motion.** There is no reduced-motion branch. The lines and area draw in over 450ms on mount, the headline counts over 320ms and the number fades in over 220ms on each hover change. All are short and none shifts the layout, but they play regardless of the user's setting.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Using a fixed gradient id such as "revenueFill". Two cards on one page would both point at the first definition, and changing one card's colour would recolour the other. The id comes from `useId()`.
- Removing the `<Tooltip>` because it renders nothing. Without it Recharts does not track the active index, so the headline and the active dot never follow the pointer.
- Drawing the area after the solid line. Series paint in source order, and the area would cover the line's lower half. The order is dashed line, area, solid line.
- Expecting cents in the headline. The value is rounded before `useCountUp` and the money format uses `maximumFractionDigits: 0`, so December's $14,703.92 shows as "$14,704". Change both if your currency needs decimals.

## Notes

- `REVENUE_DATA` and `RevenuePoint` are exported. The default data adds up to $152,313.92 against $131,304 the year before, which the header shows as "$152,314" and "+16%".
- The card shares its frame, header and delta logic with the orders chart card, so the two sit in one dashboard row at the same height.

## Definition of done

The card is 344px tall with "Revenue", "$152,314", a lime "+16%" chip and "$131,304 last year" in the header. A lime line over a fading lime area rises above a dashed grey line. Hovering a month draws a dashed vertical cursor, puts a ringed dot on the lime line, names the full month and counts the headline to that month's revenue with its own delta. Leaving the chart returns to the total.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
