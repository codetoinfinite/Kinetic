# Build: Combo Chart Card

A grey dashboard card that plots monthly sessions as rounded Recharts bars against a left axis and the conversion rate as a line with dots against a right percent axis. The header shows total sessions with their change on the period before, the session-weighted conversion rate, a legend and a "This year" calendar pill that swaps the data set. Hovering a month darkens its bar, dims the others, pops a pulsing dot on the line, opens a tooltip with both values and switches the headline and the two tiles to that month.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A dashboard card with bars on a left axis and a rate line on a right axis; hovering a month spotlights its bar and pops a dot on the line.

- Category: display
- Runtime cost: dom
- Dependencies: recharts@^3.10.1

## How it works

1. A `ComposedChart` holds two `YAxis` components: `yAxisId="bars"` on the left with compact ticks ("3K", "6K") and `yAxisId="line"` with `orientation="right"` and percent ticks. The `Bar` and the `Line` each name their axis, so sessions and percentages scale independently on one plot.
2. The right axis domain is `[0, max => Math.max(3, Math.ceil(max * 1.2 / 3) * 3)]`: 20% headroom rounded up to a multiple of 3, so four ticks always land on whole percents (0%, 2%, 4%, 6% for the default data).
3. `onMouseMove` stores `state.activeTooltipIndex` in `hovered` when `isTooltipActive` is true and the index is finite; `onMouseLeave` clears it. Each bar is a `Cell`: the hovered one is filled with the tone's `-active` colour, the others keep the base colour at `fillOpacity` 0.45 with a 200ms `transition-[fill-opacity]`, and all return to full opacity when the pointer leaves.
4. The `Tooltip` has `cursor={false}` because the spotlighted bar already marks the month. Its content renders `ChartTooltipCard` from `activeIndex` (mapped from `null` to -1 first) with the bar value and the rate to one decimal.
5. The line has 3px dots ringed in the card colour, and its `activeDot` is the shared `PulseDot`, which pings while the month is hovered.
6. With nothing hovered the headline is the period total against `previousTotal` and the rate is the session-weighted average `Σ(bar × line) / Σ bar`. With a month hovered both switch to that month, the chip compares it with the month before (hidden for the first month), and the two tiles relabel from "total" / "average" to the month name.
7. The period switch is the kit `Select` as a calendar pill (or a segmented control with `periodControl="segmented"`). Choosing a period clears `hovered`, updates internal state only when `period` is uncontrolled, and calls `onPeriodChange`.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `dimmed bars = fillOpacity 0.45, 200ms ease-out`
  Low enough that the hovered bar clearly leads, high enough that the rest still read as data for comparison.
- `bar shape = radius 6 on all corners, maxBarSize 28, barCategoryGap 22%`
  Fully rounded pills match the preview; the size cap keeps bars slim on wide cards so the line stays readable over them.
- `axis widths = left 44px, right 40px`
  Left fits a compact label such as "10.5K" and right fits "6%" at 12px without clipping.
- `line dots = r 3 with a 1.5px background-secondary stroke; active PulseDot r 4.5 with ping`
  Small resting dots show where each monthly rate is measured; the bigger pulsing dot only appears on the hovered month.
- `plot height = 240px`
  The card grows with its header and tiles; a fixed plot box gives `ResponsiveContainer` a definite height.

## API

```ts
function ComboChartCard(props?: ComboChartCardProps): JSX.Element
type ComboChartCardProps = { bars?: ComboMeasure; line?: ComboMeasure; periods?: ComboPeriod[]; period?: string; defaultPeriod?: string; onPeriodChange?: (id: string) => void; periodControl?: "segmented" | "select"; className?: string }
type ComboMeasure = { label: string; tone: ChartTone }
type ComboPoint = { label: string; bar: number; line: number }
type ComboPeriod = { id: string; label: string; data: ComboPoint[]; previousTotal?: number }
```

- `bars: ComboMeasure` — default `{ label: "Sessions", tone: 2 }`
  Name and colour of the bar measure on the left axis.
- `line: ComboMeasure` — default `{ label: "Conversion", tone: 6 }`
  Name and colour of the line measure, in percent, on the right axis.
- `periods: ComboPeriod[]` — default `COMBO_PERIODS`
  Data sets the pill switches between; `previousTotal` feeds the chip.
- `period: string`
  Controlled period id.
- `defaultPeriod: string` — default `first period id`
  Initial period when uncontrolled.
- `onPeriodChange: (id: string) => void`
  Called with the chosen period id.
- `periodControl: "segmented" | "select"` — default `"select"`
  Calendar pill with a listbox, or a segmented switch.
- `className: string`
  Merged onto the card section.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function ComboChartCard({
  bars = { label: "Sessions", tone: 2 },
  line = { label: "Conversion", tone: 6 },
  periods = COMBO_PERIODS,
  period,
  defaultPeriod,
  onPeriodChange,
  periodControl = "select",
  className,
}: ComboChartCardProps = {}) {
  const reduced = useReducedMotion();
  const [innerPeriod, setInnerPeriod] = useState(defaultPeriod ?? periods[0]?.id ?? "");
  const periodId = period ?? innerPeriod;
  const active = periods.find((p) => p.id === periodId) ?? periods[0];
  const data = active?.data ?? [];
  const [hovered, setHovered] = useState<number | null>(null);

  const point = hovered !== null ? data[hovered] : undefined;
  const total = data.reduce((sum, p) => sum + p.bar, 0);
  // Session-weighted, so a quiet month does not move the yearly rate as much as a busy one.
  const average = total > 0 ? data.reduce((sum, p) => sum + p.bar * p.line, 0) / total : 0;
  const rate = point ? point.line : average;
  const headline = point ? point.bar : total;
  const delta = point
    ? hovered !== null && hovered > 0
      ? describeDelta(point.bar, data[hovered - 1]?.bar)
      : null
    : describeDelta(total, active?.previousTotal);

  const selectPeriod = (id: string) => {
    setHovered(null);
    if (period === undefined) setInnerPeriod(id);
    onPeriodChange?.(id);
  };

  const barFill = (i: number) => (i === hovered ? toneActiveColor(bars.tone) : toneColor(bars.tone));

  return (
    <section aria-label={`${bars.label} and ${line.label} chart`} className={cx(CHART_CARD_FRAME, "gap-3", className)}>
      <div className="flex flex-col gap-3 px-2 pt-2 @md:flex-row @md:items-start @md:justify-between">
        <ChartHeadline
          label={`${bars.label}${point ? ` · ${point.label}` : ""} · ${line.label} ${pct(rate)}`}
          value={headline}
          delta={delta}
          swapKey={`${periodId}-${hovered ?? "total"}`}
          reducedMotion={reduced}
        />
        <div className="flex flex-col gap-2 @md:items-end">
          {periods.length > 1 ? (
            <ChartPeriodControl
              options={periods}
              value={periodId}
              onChange={selectPeriod}
              variant={periodControl}
              label={`${bars.label} period`}
              className="self-start @md:self-end"
            />
          ) : null}
          <ChartLegend
            items={[
              { key: "bar", label: bars.label, tone: bars.tone },
              { key: "line", label: line.label, tone: line.tone },
            ]}
            className="@md:pe-1"
          />
        </div>
      </div>

      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 520, height: 240 }}>
          <ComposedChart
            data={data}
            barCategoryGap="22%"
            margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
            onMouseMove={(state) => {
              const next = Number(state?.activeTooltipIndex);
              if (state?.isTooltipActive && Number.isFinite(next)) setHovered(next);
            }}
            onMouseLeave={() => setHovered(null)}
          >
            <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="4 4" />
            <YAxis
              yAxisId="bars"
              width={44}
              domain={[0, "auto"]}
              tickCount={4}
              tickFormatter={(v: number) => formatCompact(v)}
              tickLine={false}
              axisLine={false}
              tick={AXIS_TICK}
            />
            <YAxis
              yAxisId="line"
              orientation="right"
              width={40}
              domain={[0, (max: number) => Math.max(3, Math.ceil((max * 1.2) / 3) * 3)]}
              tickCount={4}
              tickFormatter={(v: number) => `${Math.round(v)}%`}
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
              minTickGap={8}
              tick={AXIS_TICK}
            />
            <Tooltip
              cursor={false}
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
                    rows={[
                      { key: "bar", label: bars.label, tone: bars.tone, value: formatNumber(at.bar) },
                      { key: "line", label: line.label, tone: line.tone, value: pct(at.line) },
                    ]}
                  />
                );
              }}
            />
            <Bar
              yAxisId="bars"
              dataKey="bar"
              name={bars.label}
              radius={[6, 6, 6, 6]}
              maxBarSize={28}
              isAnimationActive={!reduced}
              animationDuration={450}
            >
              {data.map((p, i) => (
                <Cell
                  key={p.label}
                  fill={barFill(i)}
                  fillOpacity={hovered !== null && i !== hovered ? 0.45 : 1}
                  className="transition-[fill-opacity] duration-200 ease-out motion-reduce:transition-none"
                />
              ))}
            </Bar>
            <Line
              yAxisId="line"
              type="monotone"
              dataKey="line"
              name={line.label}
              stroke={toneActiveColor(line.tone)}
              strokeWidth={2.5}
              dot={{ r: 3, fill: toneActiveColor(line.tone), stroke: "var(--color-background-secondary-default)", strokeWidth: 1.5 }}
              activeDot={<PulseDot color={toneActiveColor(line.tone)} pulse={!reduced} />}
              isAnimationActive={!reduced}
              animationDuration={450}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <ChartStatTiles
        columns={2}
        tiles={[
          {
            key: "bar",
            tone: bars.tone,
            label: point ? `${bars.label} · ${point.label}` : `${bars.label} · total`,
            value: formatNumber(headline),
          },
          {
            key: "line",
            tone: line.tone,
            label: point ? `${line.label} · ${point.label}` : `${line.label} · average`,
            value: pct(rate),
          },
        ]}
      />
    </section>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `useCountUp` cancels its animation frame on target change and unmount, `useReducedMotion` unsubscribes its media-query listener, `ResponsiveContainer` disconnects its resize observer, and the kit `Select` tears down its popover when closed. The card adds no listeners or timers of its own.

**Reduced motion.** Under `prefers-reduced-motion: reduce`, `useReducedMotion` turns off `isAnimationActive` on the Bar, Line and Tooltip, the headline shows its value without counting, the number fade and the bar opacity transition are disabled with `motion-reduce:` variants, and the active dot drops its ping.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Forgetting `yAxisId` on one of the series. Recharts then plots it against the wrong axis, and a 4% rate sits flat at the bottom of an axis that runs to 9,000.
- Averaging the monthly rates directly. A plain mean gives 3.65% here; weighting by sessions gives 3.68% (shown as 3.7%), which is the rate actually observed across the year.
- Leaving a tooltip cursor on as well as the bar spotlight. Two hover markers on the same month compete; the cursor is turned off.
- Reading `activeIndex` with `Number()` directly. Recharts passes `null` when inactive and `Number(null)` is 0, which would pin the tooltip to January.

## Notes

- `COMBO_PERIODS` and the `ComboPoint`, `ComboPeriod` and `ComboMeasure` types are exported. This year totals 83,200 sessions against 76,050 ("+9.4%") at 3.7% conversion; last year totals 76,050 against 70,300 ("+8.2%") at 3.3%.
- Frame, headline, period pill, legend, tooltip card, tiles and pulse dot come from `line-chart-card-parts.tsx`.

## Definition of done

The card shows "Sessions · Conversion 3.7%", "83,200" with a lime "+9.4%" chip, a "This year" pill, a legend, lime rounded bars on a 0 to 9K left axis and a blue dotted line on a 0% to 6% right axis, and tiles "Sessions · total 83,200" and "Conversion · average 3.7%". Hovering a month darkens its bar, fades the rest, pulses a dot on the line and shows a tooltip with both values. Picking "Last year" from the pill shows "76,050" and "+8.2%".

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
