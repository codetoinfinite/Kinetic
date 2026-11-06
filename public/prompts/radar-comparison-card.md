# Build: Radar Comparison Card

A grey "Visitors" dashboard card that overlays two outline-only Recharts radars, Desktop in lime and Mobile in blue, on one hexagonal grid. The header counts up the lead series total with a chip against the range before, a calendar pill swaps between H1 2024, H2 2024 and the full year, and a tile per axis sits underneath. The legend under the chart is live: it shows each series total at rest and its value on the hovered axis, and every entry is a toggle button that hides or shows its outline, with the last visible series locked on.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Desktop and Mobile as lime and blue radar outlines on one grid, with a live legend whose entries toggle each series on and off.

- Category: display
- Runtime cost: dom
- Dependencies: recharts@^3.10.1

## How it works

1. Each series is a `Radar` with `fillOpacity={0}` and a 2px outline in its tone's `-active` colour, so overlapping shapes stay readable. The range data is stored as `{ label, values: { desktop, mobile } }` and spread into flat chart rows, one `dataKey` per series key.
2. Hiding a series sets the Radar `hide` prop instead of unmounting it. The hidden `PolarRadiusAxis` gets a fixed domain of `[0, max]`, where `max` is taken over every series in the range, so turning one outline off never rescales the other.
3. The legend is a list of native buttons with `aria-pressed`. A click builds the next key list in series order and, when `visible` is uncontrolled, stores it; `onVisibleChange` gets it either way. If the clicked series is the only one shown, the click is ignored and the button carries `aria-disabled` and a title saying why.
4. Hover state comes from Recharts' store through `RadarActiveAxis` from Radar Chart Card, so it is right on the first pointer event and follows the chart's arrow-key focus. With an axis active, the header shows the lead series value for it and hides the chip, and every legend entry swaps its total for its value on that axis.
5. The lead series is the first visible one. The header total, the chip (`describeDelta` against `previous[lead]`) and the tiles all follow it, and the tiles carry its colour square so it is clear which series they show.
6. The tooltip lists only visible series, each with its colour dot, and every Radar uses the shared `PulseDot` as `activeDot`, so each visible outline pulses on the hovered axis.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `radius domain = [0, largest value of any series in the range]`
  A shared, fixed scale keeps side-by-side reads honest and stops the remaining outline jumping when one is hidden.
- `outline = 2px stroke, fill opacity 0`
  Outline-only shapes let the smaller series show through the larger one, as in the preview.
- `hidden legend entry = 50% opacity, hollow square`
  Shows the series is off while keeping its value readable and the button easy to find again.
- `plot size = 260px high, 78% outer radius, margins 12px top and bottom and 40px left and right`
  The same geometry as Radar Chart Card, a little shorter to make room for the legend row.
- `motion = outlines 500ms, tooltip 160ms, legend fade 150ms, count-up 320ms`
  Quick enough to sweep round six axes, and all of it is off under reduced motion.

## API

```ts
function RadarComparisonCard(props?: RadarComparisonCardProps): JSX.Element
type RadarComparisonCardProps = { title?: string; series?: RadarSeries[]; ranges?: RadarComparisonRange[]; range?: string; defaultRange?: string; onRangeChange?: (id: string) => void; visible?: string[]; defaultVisible?: string[]; onVisibleChange?: (keys: string[]) => void; rangeControl?: "segmented" | "select"; hideTiles?: boolean; className?: string }
type RadarSeries = { key: string; label: string; tone: ChartTone }
type RadarComparisonRange = { id: string; label: string; data: { label: string; values: Record<string, number> }[]; previous?: Record<string, number> }
```

- `title: string` — default `"Visitors"`
  Header label.
- `series: RadarSeries[]` — default `RADAR_COMPARISON_SERIES`
  Series keys, legend labels and tones; the first visible one leads the header and tiles.
- `ranges: RadarComparisonRange[]` — default `RADAR_COMPARISON_RANGES`
  Data sets for the pill, one point per axis with a value per series key; `previous` feeds the chip.
- `range: string`
  Controlled range id.
- `defaultRange: string` — default `first range id`
  Initial range when uncontrolled.
- `onRangeChange: (id: string) => void`
  Called with the chosen range id.
- `visible: string[]`
  Controlled list of visible series keys.
- `defaultVisible: string[]` — default `every series`
  Initial visible keys when uncontrolled.
- `onVisibleChange: (keys: string[]) => void`
  Called with the next visible keys after a legend click.
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
export function RadarComparisonCard({
  title = "Visitors",
  series = RADAR_COMPARISON_SERIES,
  ranges = RADAR_COMPARISON_RANGES,
  range,
  defaultRange,
  onRangeChange,
  visible,
  defaultVisible,
  onVisibleChange,
  rangeControl = "select",
  hideTiles = false,
  className,
}: RadarComparisonCardProps = {}) {
  const reduced = useReducedMotion();
  const [innerRange, setInnerRange] = useState(defaultRange ?? ranges[0]?.id ?? "");
  const [innerVisible, setInnerVisible] = useState<string[]>(defaultVisible ?? series.map((s) => s.key));
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);

  const rangeId = range ?? innerRange;
  const active = ranges.find((r) => r.id === rangeId) ?? ranges[0];
  const data = active?.data ?? [];
  const rows = data.map((p) => ({ label: p.label, ...p.values }));

  // Never render an empty chart: if nothing valid is visible, the first series stays on.
  const visibleKeys = visible ?? innerVisible;
  const picked = series.filter((s) => visibleKeys.includes(s.key));
  const shown = picked.length > 0 ? picked : series.slice(0, 1);
  const isShown = (key: string) => shown.some((s) => s.key === key);
  const lead = shown[0];

  const valueOf = (p: RadarComparisonPoint | undefined, key: string) => p?.values[key] ?? 0;
  const totalOf = (key: string) => data.reduce((sum, p) => sum + valueOf(p, key), 0);
  // One radius scale for every series, so hiding one never rescales the other.
  const max = Math.max(0, ...data.flatMap((p) => series.map((s) => valueOf(p, s.key))));

  const hovered = hoveredLabel === null ? undefined : data.find((p) => p.label === hoveredLabel);
  const leadKey = lead?.key ?? "";
  const leadTotal = totalOf(leadKey);
  const leadPrevious = active?.previous?.[leadKey];
  const headline = hovered ? valueOf(hovered, leadKey) : leadTotal;
  const delta = hovered || leadPrevious === undefined ? null : describeDelta(leadTotal, leadPrevious);

  const selectRange = (id: string) => {
    if (range === undefined) setInnerRange(id);
    onRangeChange?.(id);
  };

  const toggle = (key: string) => {
    const on = isShown(key);
    if (on && shown.length <= 1) return;
    const next = series.filter((s) => (s.key === key ? !on : isShown(s.key))).map((s) => s.key);
    if (visible === undefined) setInnerVisible(next);
    onVisibleChange?.(next);
  };

  return (
    <section aria-label={`${title} radar comparison`} className={cx(CHART_CARD_FRAME, "gap-3", className)}>
      <div className="flex items-start justify-between gap-3 px-2 pt-2">
        <ChartHeadline
          label={hovered ? `${title} · ${hovered.label}` : title}
          value={headline}
          delta={delta}
          swapKey={`${rangeId}-${leadKey}-${hovered?.label ?? "total"}`}
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

      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 420, height: 260 }}>
          <RadarChart data={rows} margin={RADAR_MARGIN} outerRadius={RADAR_OUTER_RADIUS}>
            <RadarActiveAxis onChange={setHoveredLabel} />
            <PolarGrid gridType="polygon" stroke={GRID_STROKE} />
            <PolarRadiusAxis domain={[0, max || 1]} tick={false} axisLine={false} />
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
                    rows={shown.map((s) => ({ key: s.key, label: s.label, tone: s.tone, value: formatNumber(valueOf(at, s.key)) }))}
                  />
                );
              }}
            />
            {series.map((s) => (
              <Radar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                hide={!isShown(s.key)}
                fillOpacity={0}
                stroke={toneActiveColor(s.tone)}
                strokeWidth={2}
                strokeLinejoin="round"
                dot={false}
                activeDot={<PulseDot color={toneActiveColor(s.tone)} pulse={!reduced} />}
                isAnimationActive={!reduced}
                animationDuration={500}
              />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <ul aria-label={`${title} series`} className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-2">
        {series.map((s) => {
          const on = isShown(s.key);
          const locked = on && shown.length <= 1;
          return (
            <li key={s.key}>
              <button
                type="button"
                aria-pressed={on}
                aria-disabled={locked || undefined}
                title={locked ? "At least one series stays visible" : undefined}
                onClick={() => toggle(s.key)}
                className={cx(
                  "flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-body-2-regular text-text-secondary outline-none transition-opacity duration-150 ease-out focus-visible:ring-2 focus-visible:ring-border-focus-ring motion-reduce:transition-none",
                  on ? "opacity-100" : "opacity-50",
                  locked ? "cursor-default" : "cursor-pointer hover:bg-background-primary-hover",
                )}
              >
                <span
                  aria-hidden
                  className={cx("size-2.5 shrink-0 rounded-[3px]", on ? TONE_DOT[s.tone] : "ring-1 ring-current ring-inset")}
                />
                {s.label}
                <span className="text-body-2-medium text-text-primary tabular-nums">
                  {formatNumber(hovered ? valueOf(hovered, s.key) : totalOf(s.key))}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {hideTiles ? null : (
        <ChartStatTiles
          columns={3}
          tiles={data.map((p) => ({ key: p.label, label: p.label, value: formatNumber(valueOf(p, leadKey)), tone: lead?.tone }))}
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

**Reduced motion.** Under `prefers-reduced-motion: reduce`, `useReducedMotion` turns off `isAnimationActive` on every Radar and the Tooltip, the header shows its value without counting, the active dots drop their ping, and the legend fade is disabled with a `motion-reduce:` variant.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Leaving the radius domain on "auto". Recharts then scales to the visible data only, so hiding Desktop makes Mobile balloon to fill the grid and the comparison is lost.
- Unmounting a hidden Radar instead of using `hide`. The series order, colours and the tooltip rows then shift as series come and go.
- Letting every series be turned off. An empty grid has no lead series for the header or tiles, so the last visible entry is locked.
- Reading `activeIndex` with `Number()` directly. Recharts passes `null` when inactive and `Number(null)` is 0, which would pin the tooltip to January.

## Notes

- H1 2024 is Desktop 1,424 against 1,354 ("+5.2%") and Mobile 860 against 800 ("+7.5%"); H2 2024 is 1,598 ("+12.2%") and 1,100 ("+27.9%"); 2024 is 3,022 ("+8.7%") and 1,960 ("+15.3%") in two-month buckets.
- Imports `RADAR_MARGIN`, `RADAR_OUTER_RADIUS` and `RadarActiveAxis` from `radar-chart-card.tsx`, and the frame, header, range pill, tooltip card, tiles and pulse dot from `line-chart-card-parts.tsx`.
- With Desktop hidden, Mobile becomes the lead series: the header shows "860" with "+7.5%" and the tiles show the Mobile values.

## Definition of done

The card shows "Visitors", "1,424" with a lime "+5.2%" chip and an "H1 2024" pill, a lime and a blue radar outline on a grey hexagon grid labelled January to June, a legend reading "Desktop 1,424" and "Mobile 860", and six tiles January 186 to June 214. Hovering an axis pulses both vertices, opens a tooltip with both values and switches the header and legend to that month. Clicking "Desktop" hides the lime outline, and the header reads "860" with "+7.5%"; clicking "Mobile" then does nothing. Picking "H2 2024" shows "1,598" and "+12.2%".

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
