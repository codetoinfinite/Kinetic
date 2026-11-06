# Build: Area Chart Card

A grey dashboard card that charts monthly visitors by channel as gradient-filled Recharts areas, stacked by default. The header shows the period total with its change against the period before and a This year / Last year switch that swaps the whole data set. Hovering a month draws a dashed cursor, a pinging dot on each area and a tooltip with the split, while the headline counts to that month and the tiles under the chart show its per-channel values.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A dashboard card of stacked gradient areas with a period switch, a hover tooltip and tiles that follow the hovered month.

- Category: display
- Runtime cost: dom
- Dependencies: recharts@^3.10.1

## How it works

1. Each series is an `Area` with a 2px stroke in its tone's `-active` colour and a fill of `url(#<id>-<key>)`: a vertical `linearGradient` in the chart `<defs>` from `--color-chart-N` at 0.55 opacity to 0.05. Ids are `useId()` plus the series key, so cards never share gradients.
2. `view` decides stacking. `stacked` gives every Area `stackId="total"`; `overlap` gives none, so each area starts at zero; `percent` keeps the stack and sets `stackOffset="expand"` on the chart, with the Y axis fixed to `[0, 1]` and ticks formatted as whole percents.
3. `onMouseMove` stores `state.activeTooltipIndex` in `hovered` when `isTooltipActive` is true and the index is finite, and `onMouseLeave` clears it. With a month hovered the headline is that month's sum across series against the month before (no chip for the first month); otherwise it is the period total against `previousTotal`.
4. The `Tooltip` keeps a dashed `--color-chart-cursor` cursor and renders `ChartTooltipCard` from `activeIndex` (mapped from `null` to -1 first): the month and its total, then one row per series from the top of the stack down, with each share in brackets in percent view.
5. Every Area's `activeDot` is the shared `PulseDot`, so each stacked band gets a ringed dot with a ping behind it at its own height.
6. `ChartStatTiles` lists the series under the chart with square colour keys. Each tile shows the hovered month's value or, with nothing hovered, the series total, so the tiles double as the legend.
7. Choosing a period clears `hovered`, updates internal state only when `period` is uncontrolled, and calls `onPeriodChange`.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `area gradient = chart-N at stopOpacity 0.55 → 0.05`
  Stacked bands need more tint than a single area to stay distinct where they meet; keeping 0.05 at the bottom stops lower bands from looking empty.
- `plot height = 248px`
  The card height follows its content (header, plot, tiles). A fixed plot box gives `ResponsiveContainer` a real height without fixing the whole card.
- `axes = YAxis width 44, tickCount 4 (5 in percent view), XAxis preserveStartEnd, minTickGap 8`
  44px fits "13.5K" at 12px. The minimum gap lets Recharts drop month labels on phones instead of overlapping them.
- `tile columns = 3 series: grid-cols-2, grid-cols-3 from a 384px card (@sm); 2 series: grid-cols-2`
  Three tiles fit side by side at preview width; on narrow cards the third wraps instead of truncating the numbers.
- `motion = areas 450ms, tooltip 160ms, count-up 320ms, number-fade 220ms`
  Short enough to follow a pointer across twelve months; all of it is off under reduced motion.

## API

```ts
function AreaChartCard(props?: AreaChartCardProps): JSX.Element
type AreaChartCardProps = { title?: string; series?: AreaSeries[]; periods?: AreaPeriod[]; period?: string; defaultPeriod?: string; onPeriodChange?: (id: string) => void; view?: "stacked" | "overlap" | "percent"; shape?: "curved" | "sharp"; periodControl?: "segmented" | "select"; className?: string }
type AreaSeries = { key: string; label: string; tone: ChartTone }
type AreaPeriod = { id: string; label: string; data: AreaPoint[]; previousTotal?: number }
```

- `title: string` — default `"Visitors"`
  Header label; while hovering it becomes "Visitors · <month>".
- `series: AreaSeries[]` — default `AREA_SERIES`
  Categories from the bottom of the stack up; also the tile order.
- `periods: AreaPeriod[]` — default `AREA_PERIODS`
  Data sets the switch moves between; `previousTotal` feeds the headline chip.
- `period: string`
  Controlled period id.
- `defaultPeriod: string` — default `first period id`
  Initial period when uncontrolled.
- `onPeriodChange: (id: string) => void`
  Called with the chosen period id.
- `view: "stacked" | "overlap" | "percent"` — default `"stacked"`
  Stack the areas, draw each from zero, or stretch each month to 100%.
- `shape: "curved" | "sharp"` — default `"curved"`
  Monotone curves or straight segments.
- `periodControl: "segmented" | "select"` — default `"segmented"`
  Segmented switch, or a calendar pill that opens a listbox.
- `className: string`
  Merged onto the card section.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function AreaChartCard({
  title = "Visitors",
  series = AREA_SERIES,
  periods = AREA_PERIODS,
  period,
  defaultPeriod,
  onPeriodChange,
  view = "stacked",
  shape = "curved",
  periodControl = "segmented",
  className,
}: AreaChartCardProps = {}) {
  const reduced = useReducedMotion();
  const gradientBase = useId();
  const [innerPeriod, setInnerPeriod] = useState(defaultPeriod ?? periods[0]?.id ?? "");
  const periodId = period ?? innerPeriod;
  const active = periods.find((p) => p.id === periodId) ?? periods[0];
  const data = active?.data ?? [];
  const [hovered, setHovered] = useState<number | null>(null);

  const point = hovered !== null ? data[hovered] : undefined;
  const sumOf = (p: AreaPoint | undefined) => series.reduce((sum, s) => sum + valueAt(p, s.key), 0);
  const totals = series.map((s) => data.reduce((sum, p) => sum + valueAt(p, s.key), 0));
  const grandTotal = totals.reduce((a, b) => a + b, 0);

  const headline = point ? sumOf(point) : grandTotal;
  const delta = point
    ? hovered !== null && hovered > 0
      ? describeDelta(headline, sumOf(data[hovered - 1]))
      : null
    : describeDelta(grandTotal, active?.previousTotal);
  const curve = shape === "sharp" ? "linear" : "monotone";
  const percent = view === "percent";

  const selectPeriod = (id: string) => {
    setHovered(null);
    if (period === undefined) setInnerPeriod(id);
    onPeriodChange?.(id);
  };

  return (
    <section aria-label={`${title} chart`} className={cx(CHART_CARD_FRAME, "gap-3", className)}>
      <div className="flex flex-col gap-3 px-2 pt-2 @md:flex-row @md:items-start @md:justify-between">
        <ChartHeadline
          label={point ? `${title} · ${point.label}` : title}
          value={headline}
          delta={delta}
          swapKey={`${periodId}-${hovered ?? "total"}`}
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

      <div className="h-[248px] w-full pe-2">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 520, height: 248 }}>
          <ComposedChart
            data={data}
            stackOffset={percent ? "expand" : "none"}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            onMouseMove={(state) => {
              const next = Number(state?.activeTooltipIndex);
              if (state?.isTooltipActive && Number.isFinite(next)) setHovered(next);
            }}
            onMouseLeave={() => setHovered(null)}
          >
            <defs>
              {series.map((s) => (
                <linearGradient key={s.key} id={`${gradientBase}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={toneColor(s.tone)} stopOpacity={0.55} />
                  <stop offset="100%" stopColor={toneColor(s.tone)} stopOpacity={0.05} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="4 4" />
            <YAxis
              width={44}
              domain={percent ? [0, 1] : [0, "auto"]}
              tickCount={percent ? 5 : 4}
              tickFormatter={(v: number) => (percent ? `${Math.round(v * 100)}%` : formatCompact(v))}
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
              cursor={CHART_CURSOR}
              offset={16}
              isAnimationActive={!reduced}
              animationDuration={160}
              wrapperStyle={{ outline: "none", zIndex: 10 }}
              content={({ active: isActive, activeIndex }) => {
                const at = data[activeIndex == null ? -1 : Number(activeIndex)];
                if (!isActive || !at) return null;
                const total = sumOf(at);
                return (
                  <ChartTooltipCard
                    title={`${at.label} · ${formatNumber(total)} total`}
                    rows={[...series].reverse().map((s) => {
                      const v = valueAt(at, s.key);
                      const share = total > 0 ? ` (${Math.round((v / total) * 100)}%)` : "";
                      return { key: s.key, label: s.label, tone: s.tone, value: `${formatNumber(v)}${percent ? share : ""}` };
                    })}
                  />
                );
              }}
            />
            {series.map((s) => (
              <Area
                key={s.key}
                type={curve}
                dataKey={s.key}
                name={s.label}
                stackId={view === "overlap" ? undefined : "total"}
                stroke={toneActiveColor(s.tone)}
                strokeWidth={2}
                fill={`url(#${gradientBase}-${s.key})`}
                activeDot={<PulseDot color={toneActiveColor(s.tone)} pulse={!reduced} />}
                isAnimationActive={!reduced}
                animationDuration={450}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <ChartStatTiles
        columns={series.length === 2 ? 2 : "3-wrap"}
        tiles={series.map((s, i) => ({
          key: s.key,
          label: s.label,
          tone: s.tone,
          value: formatNumber(point ? valueAt(point, s.key) : (totals[i] ?? 0)),
        }))}
      />
    </section>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `useCountUp` cancels its animation frame on target change and unmount, `useReducedMotion` unsubscribes its media-query listener, and `ResponsiveContainer` disconnects its resize observer. The card adds no listeners or timers of its own.

**Reduced motion.** Under `prefers-reduced-motion: reduce`, `useReducedMotion` turns off `isAnimationActive` on the Areas and the Tooltip, the headline shows its value without counting, the number fade is `motion-reduce:animate-none`, and the active dots drop their ping circle.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Sharing one gradient id across series. Each series needs its own `<linearGradient>` id, and ids must be unique per card; the id is `useId()` plus the series key.
- Using a Y domain of `[0, "auto"]` in percent view. With `stackOffset="expand"` the stacked values run 0 to 1, so the domain is pinned to `[0, 1]` and ticks are multiplied by 100.
- Comparing the hovered month with `undefined` for January. The first month has no month before it, so the chip is hidden rather than showing "New".
- Reading `activeIndex` with `Number()` directly. Recharts passes `null` when inactive and `Number(null)` is 0, which would pin the tooltip to January.

## Notes

- `AREA_SERIES`, `AREA_PERIODS` and the `AreaSeries`, `AreaPoint`, `AreaPeriod` and `AreaChartView` types are exported. This year adds up to 94,700 (Organic 50,500, Referral 25,900, Paid 18,300) against 87,520, shown as "+8.2%"; last year is 87,520 against 80,940, "+8.1%".
- The frame, headline, period switch, tooltip card, tiles and pulse dot come from `line-chart-card-parts.tsx`, so this card matches the line chart card beside it.
- BoardUI's preview shows the period as a calendar pill; `periodControl="select"` gives that pill and the default is a segmented switch.

## Definition of done

The card shows "Visitors", "94,700" and a lime "+8.2%" chip with This year selected, three stacked lime, blue and purple gradient areas over dashed rules, and tiles Organic 50,500, Referral 25,900, Paid 18,300. Hovering a month shows a tooltip with its total and each channel, a dot on every band, and the headline and tiles switch to that month. Choosing Last year shows "87,520" and "+8.1%".

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
