# Build: Line Chart Card

A 376px grey dashboard card that draws revenue and costs as two Recharts lines over a dashed horizontal grid, with a soft gradient under the headline series. The header shows the latest revenue with its change against the bucket before, a segmented Weekly / Monthly / Yearly switch that swaps the whole data set, and legend dots. Hovering a point draws a dashed cursor, a pinging dot on each line and a tooltip card with every series value, and the headline counts to that point.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A dashboard card with smooth multi-series lines on a dashed grid, a Weekly/Monthly/Yearly switch and a hover tooltip listing every series.

- Category: display
- Runtime cost: dom
- Dependencies: recharts@^3.10.1, @remixicon/react@^4.9.0

## How it works

1. The chart is a `ComposedChart` inside a `ResponsiveContainer` that fills a `min-h-0 flex-1` box, so the card height is fixed and the plot takes what the header leaves. `CartesianGrid vertical={false}` with `strokeDasharray="4 4"` in `--color-chart-track` gives the dashed horizontal rules.
2. Each series is a 2.5px `Line` in its tone's `-active` colour; a series with `area: true` also gets a stroke-less `Area` behind its line, filled by a vertical `linearGradient` from `--color-chart-N` at 0.4 opacity to 0. Gradient ids are `useId()` plus the series key, so two cards never share a definition. Series paint in reverse order so the first (headline) series is on top.
3. `shape="curved"` maps to `type="monotone"` and `shape="sharp"` to `type="linear"` on every Area and Line.
4. `onMouseMove` stores `state.activeTooltipIndex` in `hovered` when `isTooltipActive` is true and the index is finite; `onMouseLeave` clears it. The headline reads `data[hovered]` or, with nothing hovered, the last point, and compares it with the point before through `describeDelta` ("New" with no baseline, "0%" when the one-decimal change rounds to zero, otherwise a lime or rose percentage).
5. The `Tooltip` keeps a dashed `--color-chart-cursor` cursor and renders `ChartTooltipCard` from its `activeIndex` (guarded against `null`, since `Number(null)` is 0): the point label, then one row per series with its dot and formatted value.
6. Every Line's `activeDot` is `PulseDot`: a 4.5px dot ringed 2px in the card colour, over a 6px circle at 0.35 opacity running `animate-ping` with `transform-box: fill-box` so it scales about its own centre.
7. The period switch is `ChartPeriodControl` (the kit `SegmentedControl`, or the kit `Select` as a calendar pill with `periodControl="select"`). Choosing a period clears `hovered`, updates internal state only when `period` is not controlled, and calls `onPeriodChange`.
8. `ChartHeadline` counts with `useCountUp` (320ms) and replays `.animate-number-fade` by keying the figure on period and hovered index.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `card height = 376px`
  Fits the two-row header (figure on the left, switch and legend on the right) plus a plot of about 280px at the 576px preview width, and still leaves a 200px plot when the header stacks on a phone.
- `area gradient = chart-N at stopOpacity 0.4 → 0, top to bottom`
  Enough tint to read the headline series as volume while the second line stays visible through it; fading to 0 keeps the axis quiet.
- `grid and cursor dash = strokeDasharray "4 4", grid in chart-track, cursor in chart-cursor`
  Same dash for both so the hover cursor reads as part of the grid system, while the darker cursor token keeps it visible over the tinted area.
- `pulse dot = core r 4.5 with 2px background-secondary stroke, ping r 6 at 0.35 opacity`
  The card-coloured ring separates the dot from its line in both themes; the ping makes the hovered point findable without a heavier marker.
- `axes = YAxis width 48, domain [0, "auto"], tickCount 4, ticks 12px tertiary; XAxis preserveStartEnd, minTickGap 12`
  48px fits "$700K" at 12px. Starting at 0 keeps line height honest. preserveStartEnd plus the gap drops middle labels on narrow cards instead of overlapping them.
- `motion = lines 450ms, tooltip 160ms, count-up 320ms, number-fade 220ms`
  Fast enough to follow a pointer sweeping along twelve points; all of it is skipped under reduced motion.

## API

```ts
function LineChartCard(props?: LineChartCardProps): JSX.Element
type LineChartCardProps = { title?: string; series?: LineSeries[]; periods?: LinePeriod[]; period?: string; defaultPeriod?: string; onPeriodChange?: (id: string) => void; shape?: "curved" | "sharp"; periodControl?: "segmented" | "select"; valuePrefix?: string; className?: string }
type LineSeries = { key: string; label: string; tone: ChartTone; area?: boolean }
type LinePeriod = { id: string; label: string; data: LinePoint[] }
```

- `title: string` — default `"Revenue"`
  Header label; while hovering it becomes "Revenue · <point label>".
- `series: LineSeries[]` — default `LINE_SERIES`
  Series in legend order. The first drives the headline and is drawn on top; `area: true` adds the gradient fill.
- `periods: LinePeriod[]` — default `LINE_PERIODS`
  Data sets the switch moves between. The switch hides when there is only one.
- `period: string`
  Controlled period id.
- `defaultPeriod: string` — default `first period id`
  Initial period when uncontrolled.
- `onPeriodChange: (id: string) => void`
  Called with the chosen period id.
- `shape: "curved" | "sharp"` — default `"curved"`
  Monotone splines or straight segments between points.
- `periodControl: "segmented" | "select"` — default `"segmented"`
  Segmented switch, or a calendar pill that opens a listbox.
- `valuePrefix: string` — default `"$"`
  Prepended to the headline, tooltip values and Y-axis ticks.
- `className: string`
  Merged onto the card section.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function LineChartCard({
  title = "Revenue",
  series = LINE_SERIES,
  periods = LINE_PERIODS,
  period,
  defaultPeriod,
  onPeriodChange,
  shape = "curved",
  periodControl = "segmented",
  valuePrefix = "$",
  className,
}: LineChartCardProps = {}) {
  const reduced = useReducedMotion();
  const gradientBase = useId();
  const [innerPeriod, setInnerPeriod] = useState(defaultPeriod ?? periods[0]?.id ?? "");
  const periodId = period ?? innerPeriod;
  const active = periods.find((p) => p.id === periodId) ?? periods[0];
  const data = active?.data ?? [];
  const [hovered, setHovered] = useState<number | null>(null);

  const primary = series[0];
  const index = hovered !== null && hovered < data.length ? hovered : data.length - 1;
  const point = data[index];
  const headline = primary ? valueAt(point, primary.key) : 0;
  const before = index > 0 && primary ? valueAt(data[index - 1], primary.key) : undefined;
  const money = (n: number) => `${valuePrefix}${formatNumber(n)}`;
  const curve = shape === "sharp" ? "linear" : "monotone";

  const selectPeriod = (id: string) => {
    setHovered(null);
    if (period === undefined) setInnerPeriod(id);
    onPeriodChange?.(id);
  };

  return (
    <section aria-label={`${title} chart`} className={cx(CHART_CARD_FRAME, "h-[376px]", className)}>
      <div className="flex flex-col gap-3 px-2 pt-2 @md:flex-row @md:items-start @md:justify-between">
        <ChartHeadline
          label={hovered !== null && point ? `${title} · ${point.label}` : title}
          value={headline}
          format={money}
          delta={describeDelta(headline, before)}
          swapKey={`${periodId}-${hovered ?? "latest"}`}
          reducedMotion={reduced}
        />
        <div className="flex flex-col gap-2 @md:items-end">
          {periods.length > 1 ? (
            <ChartPeriodControl
              options={periods}
              value={periodId}
              onChange={selectPeriod}
              variant={periodControl}
              label={`${title} period`}
              className="self-start @md:self-end"
            />
          ) : null}
          {series.length > 1 ? <ChartLegend items={series} className="@md:pe-1" /> : null}
        </div>
      </div>

      <div className="min-h-0 w-full flex-1 pt-3 pe-2">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 520, height: 240 }}>
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            onMouseMove={(state) => {
              const next = Number(state?.activeTooltipIndex);
              if (state?.isTooltipActive && Number.isFinite(next)) setHovered(next);
            }}
            onMouseLeave={() => setHovered(null)}
          >
            <defs>
              {series.map((s) =>
                s.area ? (
                  <linearGradient key={s.key} id={`${gradientBase}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={toneColor(s.tone)} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={toneColor(s.tone)} stopOpacity={0} />
                  </linearGradient>
                ) : null,
              )}
            </defs>
            <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="4 4" />
            <YAxis
              width={48}
              domain={[0, "auto"]}
              tickCount={4}
              tickFormatter={(v: number) => formatCompact(v, valuePrefix)}
              tickLine={false}
              axisLine={false}
              tick={AXIS_TICK}
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              interval="preserveStartEnd"
              minTickGap={12}
              tick={AXIS_TICK}
            />
            <Tooltip
              cursor={CHART_CURSOR}
              offset={16}
              isAnimationActive={!reduced}
              animationDuration={160}
              wrapperStyle={{ outline: "none", zIndex: 10 }}
              content={({ active: isActive, activeIndex }) => {
                const at = data[activeIndex == null ? -1 : Number(activeIndex)];
                if (!isActive || !at) return null;
                return (
                  <ChartTooltipCard
                    title={at.label}
                    rows={series.map((s) => ({ key: s.key, label: s.label, tone: s.tone, value: money(valueAt(at, s.key)) }))}
                  />
                );
              }}
            />
            {/* Paint in reverse so the first (headline) series sits on top. */}
            {[...series].reverse().map((s) => (
              <Fragment key={s.key}>
                {s.area ? (
                  <Area
                    type={curve}
                    dataKey={s.key}
                    name={s.label}
                    stroke="none"
                    fill={`url(#${gradientBase}-${s.key})`}
                    activeDot={false}
                    isAnimationActive={!reduced}
                    animationDuration={450}
                  />
                ) : null}
                <Line
                  type={curve}
                  dataKey={s.key}
                  name={s.label}
                  stroke={toneActiveColor(s.tone)}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={<PulseDot color={toneActiveColor(s.tone)} pulse={!reduced} />}
                  isAnimationActive={!reduced}
                  animationDuration={450}
                />
              </Fragment>
            ))}
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

**Cleanup.** `useCountUp` cancels its animation frame when the target changes and on unmount, `useReducedMotion` unsubscribes its media-query listener, and `ResponsiveContainer` disconnects its resize observer. The card adds no listeners or timers of its own.

**Reduced motion.** With `prefers-reduced-motion: reduce`, `useReducedMotion` turns off `isAnimationActive` on every Line, Area and the Tooltip, the headline shows its target instead of counting, the number fade gets `motion-reduce:animate-none`, and the active dots render without the ping circle.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Reading `activeIndex` with `Number()` without a null check. Recharts passes `null` when nothing is active, `Number(null)` is 0, and the tooltip would show the first point. The content function maps `null` to -1 first.
- Putting the `Area` after its `Line`. Series paint in source order and the gradient would cover the lower half of the stroke; each series renders Area then Line.
- Using `@md:` on the card itself. The card is the `@container`, and container variants only match its descendants, so the header reflows with `@md:` but the card height is a single fixed value.
- Dropping the `<Tooltip>` because the headline already follows the pointer. Without it Recharts never reports `activeTooltipIndex`, so neither the headline nor the active dots move.

## Notes

- `LINE_SERIES`, `LINE_PERIODS` and the `LineSeries`, `LinePoint` and `LinePeriod` types are exported. The defaults end on "$18,240" "+9.4%" (Weekly), "$71,450" "+8.1%" (Monthly) and "$731,000" "+13.9%" (Yearly).
- `line-chart-card-parts.tsx` holds the frame, headline, period control, tooltip card, legend, stat tiles and pulse dot that the other BoardUI-kit chart cards in this batch reuse.

## Definition of done

The card shows "Revenue", "$18,240" and a lime "+9.4%" chip, a segmented Weekly / Monthly / Yearly switch with Weekly selected, and Revenue / Costs legend dots. A lime line over a fading lime area sits above a blue line on dashed horizontal rules. Hovering a week draws a dashed cursor, a pinging dot on both lines and a tooltip with both values, and the headline counts to that week. Choosing Monthly swaps the data and shows "$71,450" "+8.1%".

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
