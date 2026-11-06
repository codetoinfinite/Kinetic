# Build: Radar Chart Card

A grey dashboard card that plots six months of visitors as a Recharts radar on a hexagonal polar grid, with the range total counted up in the header next to a chip comparing it with the range before, and a white tile per month underneath. A calendar pill swaps between H1 2024, H2 2024 and the full year. Hovering an axis pulses a dot on that vertex, opens a tooltip with the value and its share, and switches the header to that month. Four looks are built in: a filled polygon, a light fill with vertex dots, an outline only, and a fill with a centre score disc that turns rose when the value it shows is low.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A "Visitors" card with a lime radar on a hexagon grid; hovering an axis pulses its vertex and counts the header to that month.

- Category: display
- Runtime cost: dom
- Dependencies: recharts@^3.10.1

## How it works

1. A `RadarChart` draws a `PolarGrid` with `gridType="polygon"` in `--color-chart-track`, a `PolarAngleAxis` keyed on the month label for the outer labels, and a hidden `PolarRadiusAxis` (no ticks, no line) with its domain set to `[0, "auto"]` so the polygon always grows from the centre.
2. Hover state comes from Recharts' own store. `RadarActiveAxis` is a child of the chart that reads `useIsTooltipActive()` and `useActiveTooltipLabel()` and passes the active label (or null) up in an effect. Reading the store, rather than the chart's `onMouseMove` payload, means the header is right on the very first pointer event over the chart and follows the chart's arrow-key focus too.
3. The hovered label is looked up in the current range by name, so after a range switch a stale label simply finds nothing and the header falls back to the total. With an axis active the header shows that axis value and hides the chip; at rest it shows the sum against `previous` through `describeDelta`.
4. The `Radar` keeps one 2px outline in the tone's `-active` colour and changes only `fillOpacity` per look: 0.6 filled, 0.2 dots, 0 lines, 0.35 score. The dots look adds 3.5px vertex dots ringed in the card colour; every look uses the shared `PulseDot` as `activeDot`, which pings unless motion is reduced.
5. The score disc is an absolutely centred HTML circle over the plot. The chart margins match on opposite sides (12px top and bottom, 40px left and right), which keeps the polar centre at the middle of the plot box, so `top-1/2 left-1/2` with a translate lands on it. It shows the axis average at rest and the hovered value on hover, and its text and border switch to the rose status colour below `lowThreshold`.
6. The tooltip uses a dashed radial cursor and renders `ChartTooltipCard` from `activeIndex` (mapped from `null` to -1 first) with the value and its share of the range total.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `outer radius = 78% of the plot half-size, 280px plot height`
  The radius is a share of the smaller plot side, so on a wide card the 280px height sets it and on a 360px screen the narrowed width does, leaving room for "February" and "September" at the side vertices.
- `fill per look = filled 0.6, dots 0.2, lines 0, score 0.35`
  The solid look matches the preview; the dots look needs a lighter fill so the dots carry the shape; the score look stays light enough for the disc to read on top.
- `chart margin = 12px top and bottom, 40px left and right`
  Matching opposite margins keep the polar centre at the middle of the box, where the score disc is positioned with plain CSS; the wider sides shrink the radius only when the card is narrow, so the side labels are never cut off.
- `low threshold = 200`
  With the default data, January (186) is the only month under it, so hovering it shows the rose disc while the 237 average stays neutral.
- `motion = polygon 500ms, tooltip 160ms, disc colour 200ms, count-up 320ms`
  Quick enough to sweep round six axes, and all of it is off under reduced motion.

## API

```ts
function RadarChartCard(props?: RadarChartCardProps): JSX.Element
type RadarChartCardProps = { title?: string; ranges?: RadarRange[]; range?: string; defaultRange?: string; onRangeChange?: (id: string) => void; variant?: "filled" | "dots" | "lines" | "score"; tone?: ChartTone; lowThreshold?: number; rangeControl?: "segmented" | "select"; hideTiles?: boolean; className?: string }
type RadarRange = { id: string; label: string; data: { label: string; value: number }[]; previous?: number }
```

- `title: string` — default `"Visitors"`
  Header label and series name.
- `ranges: RadarRange[]` — default `RADAR_RANGES`
  Data sets for the pill, one point per axis clockwise from the top; `previous` feeds the chip.
- `range: string`
  Controlled range id.
- `defaultRange: string` — default `first range id`
  Initial range when uncontrolled.
- `onRangeChange: (id: string) => void`
  Called with the chosen range id.
- `variant: "filled" | "dots" | "lines" | "score"` — default `"filled"`
  Solid polygon, light fill with vertex dots, outline only, or fill with a centre score disc.
- `tone: ChartTone` — default `2`
  Series hue; the outline, dots and active dot use its `-active` step.
- `lowThreshold: number` — default `200`
  Score look only: the disc turns rose below this value.
- `rangeControl: "segmented" | "select"` — default `"select"`
  Calendar pill with a listbox, or a segmented switch.
- `hideTiles: boolean` — default `false`
  Hide the per-axis tiles under the chart.
- `className: string`
  Merged onto the card section.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function RadarChartCard({
  title = "Visitors",
  ranges = RADAR_RANGES,
  range,
  defaultRange,
  onRangeChange,
  variant = "filled",
  tone = 2,
  lowThreshold = 200,
  rangeControl = "select",
  hideTiles = false,
  className,
}: RadarChartCardProps = {}) {
  const reduced = useReducedMotion();
  const [innerRange, setInnerRange] = useState(defaultRange ?? ranges[0]?.id ?? "");
  const rangeId = range ?? innerRange;
  const active = ranges.find((r) => r.id === rangeId) ?? ranges[0];
  const data = active?.data ?? [];
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);

  const total = data.reduce((sum, p) => sum + p.value, 0);
  const hoveredIndex = hoveredLabel === null ? -1 : data.findIndex((p) => p.label === hoveredLabel);
  const hovered = data[hoveredIndex];

  // At rest the header is the range total against the range before; on an axis it is that axis alone.
  const headline = hovered ? hovered.value : total;
  const delta = hovered ? null : describeDelta(total, active?.previous);
  const average = data.length > 0 ? total / data.length : 0;
  const score = hovered ? hovered.value : average;
  const low = score < lowThreshold;

  const selectRange = (id: string) => {
    if (range === undefined) setInnerRange(id);
    onRangeChange?.(id);
  };

  return (
    <section aria-label={`${title} radar chart`} className={cx(CHART_CARD_FRAME, "gap-3", className)}>
      <div className="flex items-start justify-between gap-3 px-2 pt-2">
        <ChartHeadline
          label={hovered ? `${title} · ${hovered.label}` : title}
          value={headline}
          delta={delta}
          swapKey={`${rangeId}-${hovered?.label ?? "total"}`}
          reducedMotion={reduced}
        />
        {ranges.length > 1 ? (
          <ChartPeriodControl
            options={ranges}
            value={rangeId}
            onChange={selectRange}
            variant={rangeControl}
            label={`${title} range`}
            className="shrink-0"
          />
        ) : null}
      </div>

      <div className="relative h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 420, height: 280 }}>
          <RadarChart data={data} margin={RADAR_MARGIN} outerRadius={RADAR_OUTER_RADIUS}>
            <RadarActiveAxis onChange={setHoveredLabel} />
            <PolarGrid gridType="polygon" stroke={GRID_STROKE} />
            <PolarRadiusAxis domain={[0, "auto"]} tick={false} axisLine={false} />
            <PolarAngleAxis dataKey="label" tick={AXIS_TICK} tickLine={false} />
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
                    rows={[
                      { key: "value", label: title, tone, value: formatNumber(at.value) },
                      { key: "share", label: "Share", value: `${formatNumber((at.value / (total || 1)) * 100, 1)}%` },
                    ]}
                  />
                );
              }}
            />
            <Radar
              dataKey="value"
              name={title}
              fill={toneColor(tone)}
              fillOpacity={VARIANT_FILL[variant]}
              stroke={toneActiveColor(tone)}
              strokeWidth={2}
              strokeLinejoin="round"
              dot={
                variant === "dots"
                  ? {
                      r: 3.5,
                      fill: toneActiveColor(tone),
                      fillOpacity: 1,
                      stroke: "var(--color-background-secondary-default)",
                      strokeWidth: 1.5,
                    }
                  : false
              }
              activeDot={<PulseDot color={toneActiveColor(tone)} pulse={!reduced} />}
              isAnimationActive={!reduced}
              animationDuration={500}
            />
          </RadarChart>
        </ResponsiveContainer>

        {variant === "score" ? (
          <div
            aria-hidden
            className={cx(
              "pointer-events-none absolute top-1/2 left-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 bg-background-primary-default transition-colors duration-200 ease-out motion-reduce:transition-none",
              low ? "text-status-rose-text" : "text-text-primary",
            )}
            style={{ borderColor: low ? "var(--color-status-rose-text)" : toneActiveColor(tone) }}
          >
            <span className="text-body-medium tabular-nums">{formatNumber(score)}</span>
            <span className="max-w-12 truncate text-[10px] leading-3 text-text-tertiary">
              {hovered ? hovered.label : "avg"}
            </span>
          </div>
        ) : null}
      </div>

      {hideTiles ? null : (
        <ChartStatTiles
          columns={3}
          tiles={data.map((p) => ({ key: p.label, label: p.label, value: formatNumber(p.value) }))}
        />
      )}
    </section>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `RadarActiveAxis` only runs an effect that calls the setter, `useCountUp` cancels its animation frame on target change and unmount, `useReducedMotion` unsubscribes its media-query listener, `ResponsiveContainer` disconnects its resize observer, and the kit `Select` tears down its popover when closed. The card adds no listeners or timers of its own.

**Reduced motion.** Under `prefers-reduced-motion: reduce`, `useReducedMotion` turns off `isAnimationActive` on the Radar and the Tooltip, the header shows its value without counting, the active dot drops its ping, and the number fade and disc colour transition are disabled with `motion-reduce:` variants.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Driving the header from the chart `onMouseMove` payload alone. In testing, a single pointer event that entered the chart opened the tooltip but left that payload inactive, so the header stayed on the total; the store hooks update on the same event.
- Using different margins on opposite sides with the centred disc. The polar centre follows the plot area, not the box, and the disc would sit off the hub.
- Reading `activeIndex` with `Number()` directly. Recharts passes `null` when inactive and `Number(null)` is 0, which would pin the tooltip to January.

## Notes

- `RADAR_RANGES`, `RADAR_MARGIN`, `RADAR_OUTER_RADIUS`, `RadarActiveAxis` and the `RadarRange`, `RadarAxisPoint` and `RadarVariant` types are exported; Radar Comparison Card reuses them. H1 2024 totals 1,424 against 1,354 ("+5.2%"), H2 2024 1,598 ("+12.2%") and 2024 3,022 against 2,780 ("+8.7%").
- The full-year range uses two-month buckets so every range keeps six axes and six tiles.
- The frame, header, range pill, tooltip card, tiles and pulse dot come from `line-chart-card-parts.tsx`.

## Definition of done

The card shows "Visitors", "1,424" with a lime "+5.2%" chip, an "H1 2024" pill, a lime filled hexagon radar labelled January to June on a grey polygon grid, and six tiles January 186, February 305, March 237, April 273, May 209 and June 214. Hovering an axis pulses its vertex, opens a tooltip with the value and share, and changes the header to "Visitors · <month>" and that value. Picking "H2 2024" shows "1,598" and "+12.2%". The score look shows a disc reading 237 that turns rose on January.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
