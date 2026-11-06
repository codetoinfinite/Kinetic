# Build: Scatter Chart Card

A grey dashboard card that plots one dot per record against two measures with a Recharts `ScatterChart`, one `Scatter` per series in its own chart token. When any point carries a `z`, the dots become bubbles sized by it. Hovering a dot, or focusing the plot and pressing the arrow keys, puts that record in the count-up headline with its gap to the average, dims the other series and floats a small readout over the dot. White tiles under the plot give each series' average, and a period pill swaps the dataset through a dropdown.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A dashboard scatter card: records grouped into coloured series, sized by a third measure, with a hover headline, readout and average tiles.

- Category: display
- Runtime cost: dom
- Dependencies: recharts@^3.10.1, @remixicon/react@^4.9.0

## How it works

1. Derive a model from the active series in one `useMemo`: x ticks are `niceTicks(xMax, 4)` and y ticks `niceTicks(yMax, 3)`, where `niceStep` rounds `max / count` up to two significant digits in fives (533 → 550, 24.3 → 25). The last tick becomes the axis domain, so the top grid line and the highest dot share a scale. The model also holds the z range, the overall and per-series averages of `y`, and a keyboard order of every record sorted by x then y.
2. Render `ScatterChart` with fixed geometry: margin `{ top: 20, right: 12, bottom: 0, left: 0 }`, a 40px `YAxis`, a 26px `XAxis` and a 208px plot box. Ticks are 12px in `--color-text-tertiary`, the y ticks run through `Intl.NumberFormat` compact notation ("1.1K"), and a dashed `CartesianGrid` in `--color-chart-track` draws both directions. `accessibilityLayer` is off because the wrapper is the single tab stop.
3. Each `Scatter` gets a closure `shape` that draws a `<g>` holding the dot: the radius is 5 for plain dots or lerped 6 → 14 across the z range for bubbles. Fill is the series token at 0.85 opacity with a 1.25px ring in its `-active` shade. The active record gets a halo at radius + 5 and 0.3 opacity, and its ring turns into a 2px stroke in the card colour. Every other series drops to opacity 0.22 through a 150ms opacity transition. `onMouseEnter`/`onMouseLeave` on the group set and clear `active`.
4. The wrapper div repeats Recharts' geometry to place HTML over the plot: `left = 40 + x / xMax * (width - 52)` and `top = 20 + (1 - y / yMax) * 162`, with `width` from `useResizeObserver`. The readout sits above the dot at radius + 10px and flips its horizontal anchor within 90px of either edge. It shows the record name, then the x and y measures under the axis captions.
5. The wrapper is `tabIndex=0` with `role="group"` and an aria-label that lists each series average. Arrow Right/Up and Left/Down step through the sorted records, Home and End jump to the ends, and Escape or blur clears the selection.
6. The header shows `title` and the overall average, or "Record · Series" and that record's y. The value runs through `useCountUp` (bypassed under reduced motion) inside a `<p>` keyed by the active record, so `.animate-number-fade` replays. The chip shows the period `change`, or the record's percent gap to the average with a "vs avg" suffix, in lime when the value is zero or above and in rose below zero.
7. When `ranges` is passed, the pill is a kit `Dropdown`. Selecting an item updates the range (controlled through `range`/`onRangeChange`, otherwise held in state), clears the active record and closes the menu. Without `ranges` the pill is a static span showing `periodLabel`. Hovering a tile or a legend row sets `hoveredSeries`, which dims the other series the same way an active dot does.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `plot geometry = height 208, margin top 20 / right 12, YAxis 40, XAxis 26`
  The readout and the keyboard focus are placed in HTML from these numbers. If any of them changes in only one place, the readout drifts off its dot. The 20px top margin leaves room for the largest bubble's halo (14 + 5px) above the top grid line.
- `bubble radius = 6 → 14px over the z range; 5px plain dots`
  Below 6px a bubble reads as a plain dot, and above 14px the top-plan bubbles overlap their neighbours on a 576px card.
- `dim opacity = 0.22 over 150ms`
  Low enough that the active series reads as the only one on the plot, high enough that the other series still show where they sit.
- `tick counts = x 4 intervals, y 3 intervals, nice step in fives at two significant digits`
  Gives 0 / 25 / 50 / 75 / 100 and 0 / 550 / 1.1K / 1.7K for the default data, so the labels stay short at 12px.
- `default averages = Starter 270, Growth 783, Scale 1,388; overall 744`
  The demo data is chosen so the tiles show these figures. The headline is the mean of all 17 records, not of the three series averages.

## API

```ts
function ScatterChartCard(props?: ScatterChartCardProps): JSX.Element
type ScatterPoint = { x: number; y: number; z?: number; label?: string }
type ScatterSeries = { label: string; points: ScatterPoint[]; color?: string }
type ScatterRange = { id: string; label: string; series: ScatterSeries[]; change?: number }
const SCATTER_SERIES: ScatterSeries[]
```

- `title: string` — default `"Revenue per account"`
  Header label while no record is active.
- `series: ScatterSeries[]` — default `SCATTER_SERIES`
  Records grouped into series. Ignored when `ranges` is passed.
- `change: number` — default `6.8`
  Percent change shown in the chip when `ranges` is not used.
- `periodLabel: string` — default `"This quarter"`
  Text of the static period pill. Pass an empty string to hide it.
- `ranges: ScatterRange[]`
  Periods to choose from. The pill becomes a dropdown and each range brings its own series and change.
- `range: string`
  Controlled active range id.
- `defaultRange: string` — default `first range`
  Uncontrolled starting range id.
- `onRangeChange: (id: string) => void`
  Called with the id picked from the period menu.
- `axisLabels: [string, string]` — default `["Sessions", "Revenue"]`
  Captions for the x and y measures, shown under the plot and in the readout.
- `format: (value: number) => string` — default `rounded en-US number`
  Formats y values in the headline, tiles and readout.
- `formatX: (value: number) => string` — default `rounded en-US number`
  Formats x values in the readout.
- `bubble: boolean` — default `true when any point has z`
  Size dots by `z`. False forces 5px dots.
- `tiles: boolean` — default `true`
  Average tiles under the plot. False shows a centred one-line legend.
- `className: string`
  Merged onto the card section.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function ScatterChartCard({
  title = "Revenue per account",
  series: seriesProp = SCATTER_SERIES,
  change: changeProp = 6.8,
  periodLabel = "This quarter",
  ranges,
  range: rangeProp,
  defaultRange,
  onRangeChange,
  axisLabels = ["Sessions", "Revenue"],
  format = defaultFormat,
  formatX = defaultFormat,
  bubble,
  tiles = true,
  className,
}: ScatterChartCardProps = {}) {
  const reduced = useReducedMotion();
  const labelId = useId();
  const plotRef = useRef<HTMLDivElement>(null);
  const { width } = useResizeObserver(plotRef);

  const [innerRange, setInnerRange] = useState(defaultRange ?? ranges?.[0]?.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const rangeId = rangeProp ?? innerRange;
  const activeRange = ranges?.find((r) => r.id === rangeId) ?? ranges?.[0];
  const series = activeRange?.series ?? seriesProp;
  const change = activeRange ? activeRange.change : changeProp;

  const [active, setActive] = useState<Active>(null);
  const [hoveredSeries, setHoveredSeries] = useState<number | null>(null);

  const model = useMemo(() => {
    const all = series.flatMap((s) => s.points);
    const xMaxRaw = Math.max(1, ...all.map((p) => p.x));
    const yMaxRaw = Math.max(1, ...all.map((p) => p.y));
    const zs = all.map((p) => p.z).filter((z): z is number => z !== undefined);
    const xTicks = niceTicks(xMaxRaw, 4);
    const yTicks = niceTicks(yMaxRaw, 3);
    const averages = series.map((s) =>
      s.points.length ? s.points.reduce((sum, p) => sum + p.y, 0) / s.points.length : 0,
    );
    // Keyboard order: every record left to right, then bottom to top.
    const order = series
      .flatMap((s, si) => s.points.map((p, pi) => ({ s: si, p: pi, x: p.x, y: p.y })))
      .sort((a, b) => a.x - b.x || a.y - b.y);
    return {
      xMax: xTicks[xTicks.length - 1] ?? xMaxRaw,
      yMax: yTicks[yTicks.length - 1] ?? yMaxRaw,
      xTicks,
      yTicks,
      zMin: zs.length ? Math.min(...zs) : 0,
      zMax: zs.length ? Math.max(...zs) : 0,
      hasZ: zs.length > 0,
      overall: all.length ? all.reduce((sum, p) => sum + p.y, 0) / all.length : 0,
      averages,
      order,
    };
  }, [series]);

  const useBubbles = bubble ?? model.hasZ;
  const radiusOf = (point: ScatterPoint) => {
    if (!useBubbles || point.z === undefined || model.zMax === model.zMin) return useBubbles ? 9 : DOT_RADIUS;
    const t = (point.z - model.zMin) / (model.zMax - model.zMin);
    return BUBBLE_RADIUS[0] + t * (BUBBLE_RADIUS[1] - BUBBLE_RADIUS[0]);
  };

  const activePoint = active ? series[active.s]?.points[active.p] : undefined;
  const activeSeries = activePoint && active ? active.s : hoveredSeries;

  const headlineValue = activePoint ? activePoint.y : model.overall;
  const counted = useCountUp(Math.round(headlineValue));
  const shown = reduced ? Math.round(headlineValue) : counted;
  const pointDelta =
    activePoint && model.overall > 0 ? Math.round(((activePoint.y - model.overall) / model.overall) * 1000) / 10 : null;
  const chipValue = activePoint ? pointDelta : change;
  const colorAt = (i: number) => {
    const custom = series[i]?.color;
    const slot = PALETTE[i % PALETTE.length] ?? PALETTE[0];
    return custom ? { fill: custom, ring: custom } : slot;
  };

  // Pixel centre of a record, from the same geometry Recharts lays out.
  const plotLeft = MARGIN.left + Y_AXIS_WIDTH;
  const plotWidth = Math.max(0, width - plotLeft - MARGIN.right);
  const plotHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom - X_AXIS_HEIGHT;
  const positionOf = (point: ScatterPoint) => ({
    left: plotLeft + (point.x / model.xMax) * plotWidth,
    top: MARGIN.top + (1 - point.y / model.yMax) * plotHeight,
  });

  const step = (key: string) => {
    const { order } = model;
    if (!order.length) return;
    const at = active ? order.findIndex((o) => o.s === active.s && o.p === active.p) : -1;
    let next = at;
    if (key === "ArrowRight" || key === "ArrowUp") next = at < 0 ? 0 : Math.min(order.length - 1, at + 1);
    else if (key === "ArrowLeft" || key === "ArrowDown") next = at < 0 ? order.length - 1 : Math.max(0, at - 1);
    else if (key === "Home") next = 0;
    else if (key === "End") next = order.length - 1;
    const target = order[next];
    if (target) setActive({ s: target.s, p: target.p });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      step(event.key);
    } else if (event.key === "Escape" && active) {
      setActive(null);
    }
  };

  const renderDot = (si: number) =>
    function dot({ cx: x, cy: y, payload }: ShapeProps) {
      if (x === undefined || y === undefined || !payload) return <g />;
      const isActive = active?.s === si && active.p === payload.pointIndex;
      const dimmed = activeSeries !== null && activeSeries !== si;
      const { fill, ring } = colorAt(si);
      const r = radiusOf(payload);
      return (
        <g
          className="cursor-pointer transition-opacity duration-150 ease-out motion-reduce:transition-none"
          style={{ opacity: dimmed ? 0.22 : 1 }}
          onMouseEnter={() => setActive({ s: si, p: payload.pointIndex })}
          onMouseLeave={() => setActive(null)}
        >
          {isActive && <circle cx={x} cy={y} r={r + 5} fill={fill} opacity={0.3} />}
          <circle
            cx={x}
            cy={y}
            r={r}
            fill={fill}
            fillOpacity={useBubbles ? 0.85 : 1}
            stroke={isActive ? "var(--color-background-secondary-default)" : ring}
            strokeWidth={isActive ? 2 : 1.25}
          />
        </g>
      );
    };

  const pill = (
    <>
      <RiCalendarLine className="size-4 shrink-0 text-text-secondary" aria-hidden />
      <span className="whitespace-nowrap">{activeRange?.label ?? periodLabel}</span>
    </>
  );
  const pillClass =
    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border-button-default bg-background-primary-default px-2.5 text-body-medium text-text-primary";

  const tooltipPos = activePoint && width > 0 ? positionOf(activePoint) : null;
  const tooltipLift = activePoint ? radiusOf(activePoint) + 10 : 0;

  return (
    <section
      aria-labelledby={labelId}
      className={cx("flex w-full min-w-0 flex-col gap-3 rounded-2xl bg-background-secondary-default p-2", className)}
    >
      <div className="flex flex-col gap-3 px-2 pt-2">
        {/* Header: title or active record, count-up value, change chip; period pill on the right */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5" aria-live="polite">
            <p id={labelId} className="text-body-medium text-text-secondary">
              {activePoint && active
                ? `${activePoint.label ?? "Record"} · ${series[active.s]?.label ?? ""}`
                : title}
            </p>
            <div className="flex items-center gap-2">
              <p
                key={active ? `${active.s}-${active.p}` : "all"}
                className="animate-number-fade text-title-1-medium text-text-primary tabular-nums motion-reduce:animate-none"
              >
                {format(shown)}
              </p>
              {chipValue !== undefined && chipValue !== null && (
                <Chip variant="bold" color={chipValue >= 0 ? "lime" : "rose"} className="tabular-nums">
                  {chipValue > 0 ? "+" : ""}
                  {chipValue}%{activePoint ? " vs avg" : ""}
                </Chip>
              )}
            </div>
          </div>
          {ranges && ranges.length > 0 ? (
            <Dropdown isOpen={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownTrigger aria-label={`Period: ${activeRange?.label ?? ""}`} className={cx(pillClass, "hover:bg-background-secondary-hover")}>
                {pill}
                <RiArrowDownSLine
                  className={cx(
                    "size-4 shrink-0 text-text-secondary transition-transform duration-150 ease-out motion-reduce:transition-none",
                    menuOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </DropdownTrigger>
              <DropdownPopover aria-label="Period" placement="bottom end" className="w-44">
                {ranges.map((r) => (
                  <DropdownItem
                    key={r.id}
                    selected={r.id === activeRange?.id}
                    onSelect={() => {
                      setInnerRange(r.id);
                      onRangeChange?.(r.id);
                      setActive(null);
                      setMenuOpen(false);
                    }}
                  >
                    {r.label}
                  </DropdownItem>
                ))}
              </DropdownPopover>
            </Dropdown>
          ) : periodLabel ? (
            <span className={pillClass}>{pill}</span>
          ) : null}
        </div>

        {/* Plot: Recharts draws axes, grid and dots; the readout is HTML over it */}
        <div
          ref={plotRef}
          tabIndex={0}
          role="group"
          aria-roledescription="scatter chart"
          aria-label={`${title}: ${series.map((s, i) => `${s.label} average ${format(model.averages[i] ?? 0)}`).join(", ")}. Arrow keys step through records.`}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
          className="relative w-full rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
          style={{ height: CHART_HEIGHT }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={MARGIN} accessibilityLayer={false}>
              <CartesianGrid stroke="var(--color-chart-track)" strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="x"
                domain={[0, model.xMax]}
                ticks={model.xTicks}
                height={X_AXIS_HEIGHT}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 12, fill: "var(--color-text-tertiary)" }}
              />
              <YAxis
                type="number"
                dataKey="y"
                domain={[0, model.yMax]}
                ticks={model.yTicks}
                width={Y_AXIS_WIDTH}
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                tickFormatter={(n: number) => compact.format(n)}
                tick={{ fontSize: 12, fill: "var(--color-text-tertiary)" }}
              />
              {series.map((s, si) => (
                <Scatter
                  key={s.label}
                  name={s.label}
                  data={s.points.map((p, pointIndex) => ({ ...p, pointIndex }))}
                  shape={renderDot(si)}
                  isAnimationActive={!reduced}
                  animationDuration={450}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>

          {activePoint && active && tooltipPos && (
            <div
              role="presentation"
              className="pointer-events-none absolute z-10 flex min-w-32 flex-col gap-1 rounded-lg border border-border-button-default bg-background-primary-default px-2.5 py-2 shadow-dropdown"
              style={{
                left: tooltipPos.left,
                top: tooltipPos.top - tooltipLift,
                transform: `translate(${tooltipPos.left > width - 90 ? "-90%" : tooltipPos.left < 90 ? "-10%" : "-50%"}, -100%)`,
              }}
            >
              <span className="flex items-center gap-1.5 text-body-2-medium text-text-primary">
                <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: colorAt(active.s).fill }} aria-hidden />
                {activePoint.label ?? series[active.s]?.label}
              </span>
              <span className="flex justify-between gap-3 text-caption-1-medium text-text-secondary tabular-nums">
                {axisLabels[0]}
                <span className="text-text-primary">{formatX(activePoint.x)}</span>
              </span>
              <span className="flex justify-between gap-3 text-caption-1-medium text-text-secondary tabular-nums">
                {axisLabels[1]}
                <span className="text-text-primary">{format(activePoint.y)}</span>
              </span>
            </div>
          )}
        </div>

        {/* Axis captions under the plot: y measure left, x measure right */}
        <div className="flex justify-between text-body-2-medium text-text-tertiary">
          <span>{axisLabels[1]}</span>
          <span>{axisLabels[0]}</span>
        </div>
      </div>

      {/* Per-series averages: tiles, or a single centred legend line */}
      {tiles ? (
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(6rem,1fr))] gap-1.5">
          {series.map((s, i) => (
            <li
              key={s.label}
              onMouseEnter={() => setHoveredSeries(i)}
              onMouseLeave={() => setHoveredSeries(null)}
              className="flex min-w-0 flex-col gap-0.5 rounded-xl bg-background-primary-default px-2.5 py-2"
            >
              <span className="flex min-w-0 items-center gap-1.5 text-body-medium text-text-secondary">
                <span className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: colorAt(i).fill }} aria-hidden />
                <span className="truncate">{s.label} · avg</span>
              </span>
              <span className="text-body-medium text-text-primary tabular-nums">{format(model.averages[i] ?? 0)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-2 pb-2">
          {series.map((s, i) => (
            <li
              key={s.label}
              onMouseEnter={() => setHoveredSeries(i)}
              onMouseLeave={() => setHoveredSeries(null)}
              className="flex items-center gap-1.5 text-body-medium text-text-secondary"
            >
              <span className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: colorAt(i).fill }} aria-hidden />
              {s.label}
              <span className="text-text-primary tabular-nums">{format(model.averages[i] ?? 0)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `useResizeObserver` unregisters the plot wrapper from the shared observer on unmount. `useCountUp` cancels its animation frame when the target changes and on unmount. `ResponsiveContainer` disconnects its own observer. The dropdown's outside-press listener is removed when the menu closes. Pointer and key handlers are React props.

**Reduced motion.** Under `prefers-reduced-motion: reduce` the scatter entrance animation is off (`isAnimationActive={false}`), the headline shows its value with no count-up, and `.animate-number-fade` is removed with `motion-reduce:animate-none`. The series dimming and the chevron rotation change instantly through `motion-reduce:transition-none`.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Letting Recharts pick the axis domains. Its automatic domain can end above the last tick, and the readout's position, computed from `xMax` and `yMax`, would no longer line up with the dots. The domains are fixed to the last nice tick.
- Leaving `accessibilityLayer` on. The SVG becomes a second tab stop whose arrow keys move a tooltip that is not rendered, next to the wrapper's own record navigation.
- Averaging the series averages for the headline. Series have different sizes, so the overall figure is the mean of every record.
- Drawing the readout inside the SVG. Text in SVG cannot wrap or size itself to its content. The readout is an HTML layer over the plot with `pointer-events: none`, so it never steals the hover from the dot under it.

## Notes

- `SCATTER_SERIES` and the `ScatterPoint`, `ScatterSeries` and `ScatterRange` types are exported. A series `color` takes any CSS colour and is used for the fill, the ring and the swatch.
- Pass `tiles={false}` for the compact legend line, and `bubble={false}` for even dots when the data carries `z`.

## Definition of done

The card shows "Revenue per account", "744" and a lime "+6.8%" chip, with a "This quarter" pill. The plot has lime, blue and purple bubbles on a dashed grid with ticks 0–100 and 0–1.7K, "Revenue" and "Sessions" captions, and tiles reading Starter · avg 270, Growth · avg 783 and Scale · avg 1,388. Hovering the top-right bubble changes the header to "Quill · Scale" and "1,640", dims the lime and blue dots and shows a readout with Sessions 98. Focusing the plot and pressing End does the same. Picking "This year" from the pill redraws the plot with larger values and a "+18.2%" chip.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
