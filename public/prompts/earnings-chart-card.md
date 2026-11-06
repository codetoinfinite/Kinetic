# Build: Earnings Chart Card

A grey dashboard card with a Weekly / Monthly / Yearly switch and twelve rounded Recharts bars, each standing in a full-height grey track. The newest bar is the bucket still running, so it is drawn in the darker active tone and its value is the "Earned so far" headline, counted up in dollars with a chip comparing it to the bar before. Hovering another bar moves the highlight there, fades in an outline ring around its track, opens a small tooltip and switches the headline and chip to that bar.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

An "Earned so far" card of rounded bars in grey tracks; the current or hovered bar darkens, gets an outline ring and drives the headline.

- Category: display
- Runtime cost: dom
- Dependencies: recharts@^3.10.1

## How it works

1. The tracks are the `Bar` `background`, given as a render function. Recharts calls it once per category with the full-height column (`x`, `y`, `width`, `height`, `index`); it draws a `--color-chart-track` rect with an 8px corner radius and, around it, a second rect 3px larger on every side with no fill and a 1.5px stroke in the tone's `-active` colour.
2. The ring is always mounted. Its `opacity` is 1 only for `index === hovered`, and a 150ms `transition-opacity` fades it in and out, so moving across bars reads as the ring sliding between columns.
3. `onMouseMove` stores `state.activeTooltipIndex` in `hovered` when `isTooltipActive` is true and the index is finite; `onMouseLeave` clears it. The focused bar is `hovered ?? data.length - 1`. Each bar is a `Cell` whose fill is the `-active` colour for the focused bar and the base `chart-N` colour otherwise, with a 200ms `transition-[fill]`.
4. The headline renders the focused bar through `ChartHeadline` with a "$" formatter, so it counts from the old value to the new one in 320ms. Its chip is `describeDelta(focused, previous)`; the first bar has nothing before it, so the chip is hidden. The label reads "Earned so far" at rest and "Earned · W3" while hovering.
5. A period can carry fixed Y ticks. The weekly set uses `[0, 3000, 5000, 10000]` ("$0 $3K $5K $10K") as in the preview; the others leave `ticks` out and get four automatic ticks from `tickCount`. All ticks go through `formatCompact` with the "$" prefix.
6. The `Tooltip` has `cursor={false}` because the ring already marks the column. Its content maps `activeIndex` from `null` to -1 first, then shows the bar's value and its change against the bar before.
7. Choosing a period clears `hovered`, updates internal state only when `period` is uncontrolled, and calls `onPeriodChange`.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `bar shape = radius 8, maxBarSize 32, barCategoryGap 30%`
  Slim pill bars inside slightly wider-looking tracks match the preview; the size cap keeps six yearly bars from turning into blocks.
- `hover ring = 3px outside the track, radius 11, 1.5px stroke, 150ms opacity fade`
  The gap separates the ring from the grey track so it reads as an outline, and the chart margin is 3px wider on the top and right so the ring is never clipped.
- `weekly ticks = [0, 3000, 5000, 10000]`
  Uneven on purpose, as in the preview: the $3K and $5K rules help read the many smaller weeks while $10K marks the peaks.
- `plot height = 248px`
  A fixed plot box gives `ResponsiveContainer` a definite height while the card grows with its header.
- `motion = bars 450ms, tooltip 160ms, bar fill 200ms, ring 150ms, count-up 320ms`
  Fast enough to follow a pointer sweeping across twelve bars, and all of it is off under reduced motion.

## API

```ts
function EarningsChartCard(props?: EarningsChartCardProps): JSX.Element
type EarningsChartCardProps = { title?: string; periods?: EarningsPeriod[]; period?: string; defaultPeriod?: string; onPeriodChange?: (id: string) => void; tone?: ChartTone; valuePrefix?: string; periodControl?: "segmented" | "select"; className?: string }
type EarningsPeriod = { id: string; label: string; data: { label: string; value: number }[]; ticks?: number[] }
```

- `title: string` — default `"Earned so far"`
  Header label while nothing is hovered.
- `periods: EarningsPeriod[]` — default `EARNINGS_PERIODS`
  Data sets for the switch, oldest bar first; the last bar is the current one. `ticks` fixes the Y ticks.
- `period: string`
  Controlled period id.
- `defaultPeriod: string` — default `first period id`
  Initial period when uncontrolled.
- `onPeriodChange: (id: string) => void`
  Called with the chosen period id.
- `tone: ChartTone` — default `2`
  Bar hue; the current or hovered bar and the ring use its `-active` step.
- `valuePrefix: string` — default `"$"`
  Prefix for the headline, axis ticks and tooltip.
- `periodControl: "segmented" | "select"` — default `"segmented"`
  Segmented switch, or a calendar pill that opens a listbox.
- `className: string`
  Merged onto the card section.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function EarningsChartCard({
  title = "Earned so far",
  periods = EARNINGS_PERIODS,
  period,
  defaultPeriod,
  onPeriodChange,
  tone = 2,
  valuePrefix = "$",
  periodControl = "segmented",
  className,
}: EarningsChartCardProps = {}) {
  const reduced = useReducedMotion();
  const [innerPeriod, setInnerPeriod] = useState(defaultPeriod ?? periods[0]?.id ?? "");
  const periodId = period ?? innerPeriod;
  const active = periods.find((p) => p.id === periodId) ?? periods[0];
  const data = active?.data ?? [];
  const [hovered, setHovered] = useState<number | null>(null);

  // The highlighted bar is the hovered one, else the newest (the bucket still running).
  const focus = hovered ?? data.length - 1;
  const point = data[focus];
  const before = focus > 0 ? data[focus - 1] : undefined;
  const delta = point && before ? describeDelta(point.value, before.value) : null;
  const money = (value: number) => `${valuePrefix}${formatNumber(value)}`;

  const selectPeriod = (id: string) => {
    setHovered(null);
    if (period === undefined) setInnerPeriod(id);
    onPeriodChange?.(id);
  };

  // Grey full-height track behind each bar, plus an outline ring that fades in on the hovered one.
  const renderTrack = ({ x, y, width, height, index }: TrackShape) => {
    if (x === undefined || y === undefined || width === undefined || height === undefined) return <g />;
    return (
      <g pointerEvents="none">
        <rect x={x} y={y} width={width} height={height} rx={BAR_RADIUS} fill="var(--color-chart-track)" />
        <rect
          x={x - RING_OFFSET}
          y={y - RING_OFFSET}
          width={width + RING_OFFSET * 2}
          height={height + RING_OFFSET * 2}
          rx={BAR_RADIUS + RING_OFFSET}
          fill="none"
          stroke={toneActiveColor(tone)}
          strokeWidth={1.5}
          opacity={index === hovered ? 1 : 0}
          className="transition-opacity duration-150 ease-out motion-reduce:transition-none"
        />
      </g>
    );
  };

  return (
    <section aria-label={`${title} chart`} className={cx(CHART_CARD_FRAME, "gap-3", className)}>
      <div className="flex flex-col gap-3 px-2 pt-2 @md:flex-row @md:items-start @md:justify-between">
        <ChartHeadline
          label={hovered !== null && point ? `Earned · ${point.label}` : title}
          value={point?.value ?? 0}
          format={money}
          delta={delta}
          swapKey={`${periodId}-${hovered ?? "current"}`}
          reducedMotion={reduced}
        />
        {periods.length > 1 ? (
          <ChartPeriodControl
            options={periods}
            value={periodId}
            onChange={selectPeriod}
            variant={periodControl}
            label={`${title} period`}
            className="self-start"
          />
        ) : null}
      </div>

      <div className="h-[248px] w-full pe-2 pb-1">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 520, height: 248 }}>
          <BarChart
            data={data}
            barCategoryGap="30%"
            margin={{ top: RING_OFFSET + 4, right: RING_OFFSET, bottom: 0, left: 0 }}
            onMouseMove={(state) => {
              const next = Number(state?.activeTooltipIndex);
              if (state?.isTooltipActive && Number.isFinite(next)) setHovered(next);
            }}
            onMouseLeave={() => setHovered(null)}
          >
            <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="4 4" />
            <YAxis
              width={48}
              domain={[0, "auto"]}
              ticks={active?.ticks}
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
              minTickGap={6}
              tick={AXIS_TICK}
            />
            <Tooltip
              cursor={false}
              offset={16}
              isAnimationActive={!reduced}
              animationDuration={160}
              wrapperStyle={{ outline: "none", zIndex: 10 }}
              content={({ active: isActive, activeIndex }) => {
                const i = activeIndex == null ? -1 : Number(activeIndex);
                const at = data[i];
                if (!isActive || !at) return null;
                const prev = data[i - 1];
                return (
                  <ChartTooltipCard
                    title={at.label}
                    rows={[
                      { key: "earned", label: "Earned", tone, value: money(at.value) },
                      ...(prev
                        ? [{ key: "change", label: `vs ${prev.label}`, value: describeDelta(at.value, prev.value).label }]
                        : []),
                    ]}
                  />
                );
              }}
            />
            <Bar
              dataKey="value"
              name="Earned"
              radius={BAR_RADIUS}
              maxBarSize={32}
              background={renderTrack}
              isAnimationActive={!reduced}
              animationDuration={450}
            >
              {data.map((p, i) => (
                <Cell
                  key={p.label}
                  fill={i === focus ? toneActiveColor(tone) : toneColor(tone)}
                  className="transition-[fill] duration-200 ease-out motion-reduce:transition-none"
                />
              ))}
            </Bar>
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

**Cleanup.** `useCountUp` cancels its animation frame on target change and unmount, `useReducedMotion` unsubscribes its media-query listener, and `ResponsiveContainer` disconnects its resize observer. The card adds no listeners or timers of its own.

**Reduced motion.** Under `prefers-reduced-motion: reduce`, `useReducedMotion` turns off `isAnimationActive` on the Bar and the Tooltip, the headline shows its value without counting, and the number fade, bar fill transition and ring fade are disabled with `motion-reduce:` variants.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Using `Bar background={{ fill }}` for the tracks. The object form cannot vary per bar, so there is nowhere to draw the hover ring; the render function gets `index` and can.
- Leaving the chart margin at 0. The ring sits 3px outside the track, and the track runs to the top of the plot, so the ring's top and the last column's right edge would be cut off.
- Reading `activeIndex` with `Number()` directly. Recharts passes `null` when inactive and `Number(null)` is 0, which would pin the tooltip to the first bar.
- Comparing the first bar with `undefined`. There is no bar before it, so the chip is hidden instead of showing "New".

## Notes

- `EARNINGS_PERIODS` and the `EarningsPoint` and `EarningsPeriod` types are exported. Weekly ends on $7,462 against $6,500 ("+14.8%"), monthly on $32,450 against $29,100 ("+11.5%") and yearly on $362,400 against $318,900 ("+13.6%").
- BoardUI's preview shows month labels under the Weekly tab; here each tab has its own buckets (W1 to W12, Jan to Dec, 2019 to 2024) so the labels match the switch.
- The frame, headline, period switch and tooltip card come from `line-chart-card-parts.tsx`.

## Definition of done

The card shows "Earned so far", "$7,462" and a lime "+14.8%" chip with Weekly selected, Y ticks $0, $3K, $5K and $10K, and twelve rounded lime bars in grey tracks with the last one darker. Hovering a bar darkens it, rings its track, shows a tooltip and switches the headline to "Earned · W<n>" and that value. Choosing Monthly shows "$32,450" and "+11.5%"; Yearly shows "$362,400" and "+13.6%".

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
