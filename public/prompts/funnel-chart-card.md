# Build: Funnel Chart Card

A dashboard card that draws a conversion funnel left to right. Every stage is a column whose band is sized to its share of the top stage and eases into the next stage's height, with a white share pill in the middle and a stat tile underneath. Hovering, focusing or tapping a stage dims the others, darkens it one tone and swaps the count-up headline for that stage's count with its step conversion from the stage before. A period select swaps the data and the bands re-grow from their old shape.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A horizontal conversion funnel: tapered SVG bands per stage with share pills, stat tiles and a headline that follows the hovered stage.

- Category: display
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. Each stage is a `<button>` in a flex row (`gap-0.5`, so the card surface shows as a 2px seam between columns). Inside it an absolutely positioned SVG uses `viewBox="0 0 100 {chartHeight}"` with `preserveAspectRatio="none"`: vertical units are pixels, horizontal units are 0-100 of the column, so the band stretches with the card while its heights stay exact.
2. Shares (`value / top`) go through `useTweenedValues`, a rAF tween with ease-out cubic over 520ms that starts from zeros on mount and from the current shares on every period change. Heights are `max(2, share * (chartHeight - 24))`, centred on `chartHeight / 2`.
3. `bandPath(h0, h1)` draws one column from its own height to the next stage's. Curved: flat to x=50, then two cubic Béziers with both control points at x=75 (horizontal tangents at both ends), so the edge is an S-curve. Sharp: a plain trapezoid. The last column uses its own height for both ends, so it runs flat.
4. Curved columns paint two halo copies of the band first, grown by 12px and 6px per side at 0.16 and 0.32 opacity, then the core. Sharp columns instead paint a 36px track rect at 0.18 opacity, so stages near 0% still have a visible lane.
5. The active stage is `hovered ?? pinned`. Pointer enter and focus set `hovered`; pointer leave and blur clear it; click toggles `pinned` (`aria-pressed`). Inactive columns and tiles fade to opacity 0.35 / 0.45 over 200ms, and the active core switches from `--color-chart-N` to `--color-chart-N-active`.
6. The header shows the title, `headline ?? top` and a lime/rose delta chip. With a stage active it shows the stage label, its value and a neutral chip reading "56% of Link opened" (step conversion) or "Top of funnel". The number counts through `useCountUp` (320ms) inside a `<p>` keyed by the active index, so the fade replays per swap.
7. Under the chart, `StatTiles` lays out one white tile per stage with a 2.5 swatch, label and value. Tiles take `flex-basis: calc((100% - gaps) / columns)` with a 120px minimum and `grow`, so a 360px card wraps to two per row. Hovering a tile sets the same active stage.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `EDGE / halo layers = 12px; layers +12px @ 0.16 and +6px @ 0.32`
  Leaves 136px of core in the default 160px chart, and the two soft layers give the curved shape its layered edge without a stroke.
- `FLAT = 50 (of 100 column units)`
  The band holds its height for the first half of its column, so the share pill always sits on a flat stretch, then eases into the next stage across the second half.
- `SHARP_TRACK = 36px at 0.18 opacity`
  Sharp trapezoids of 1% stages collapse to a line; the track keeps a lane to hover and read.
- `MIN_CORE = 2px`
  A stage with a tiny share still draws a visible line instead of vanishing.
- `tween = 520ms ease-out cubic, from 0 on mount`
  Long enough to read as growth, short enough that switching periods feels immediate. Shares are tweened rather than heights so `chartHeight` changes never animate.
- `dim opacity = columns 0.35, tiles 0.45, 200ms`
  Pushes the other stages back without hiding them, so the active stage still reads in context.

## API

```ts
function FunnelChartCard(props: { title?: string; ranges?: FunnelRange[]; stages?: FunnelStage[]; delta?: number; range?: string; defaultRange?: string; onRangeChange?: (id: string) => void; shape?: "curved" | "sharp"; mono?: boolean; chartHeight?: number; className?: string }): JSX.Element
type FunnelStage = { label: string; value: number; color?: ChartColor }
type FunnelRange = { id: string; label: string; stages: FunnelStage[]; delta?: number; headline?: number }
```

- `title: string` — default `"Sign-up funnel"`
  Header label while no stage is active; also the card's accessible name.
- `ranges: FunnelRange[]` — default `SIGNUP_FUNNEL_RANGES`
  Periods with their own stages and delta. Two or more show the period select.
- `stages: FunnelStage[]`
  A single funnel, top stage first. Overrides `ranges` and hides the select.
- `delta: number`
  Headline chip percentage when `stages` is used.
- `range: string`
  Controlled period id.
- `defaultRange: string` — default `first range id`
  Initial period when uncontrolled.
- `onRangeChange: (id: string) => void`
  Called when the period select changes.
- `shape: "curved" | "sharp"` — default `"curved"`
  Eased taper with layered halo, or plain trapezoids over a faint track.
- `mono: boolean` — default `false`
  Paints every stage in the secondary text colour (primary when active) and hides tile swatches.
- `chartHeight: number` — default `160`
  Chart height in px including the 12px halo above and below.
- `className: string`
  Merged onto the card section.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function FunnelChartCard({
  title = "Sign-up funnel",
  ranges = SIGNUP_FUNNEL_RANGES,
  stages: stagesProp,
  delta: deltaProp,
  range: rangeProp,
  defaultRange,
  onRangeChange,
  shape = "curved",
  mono = false,
  chartHeight = 160,
  className,
}: FunnelChartCardProps) {
  const reduced = useReducedMotion();
  const [innerRange, setInnerRange] = useState(defaultRange ?? ranges[0]?.id ?? "");
  const rangeId = rangeProp ?? innerRange;
  const activeRange = ranges.find((r) => r.id === rangeId) ?? ranges[0];
  const stages = stagesProp ?? activeRange?.stages ?? [];
  const delta = stagesProp ? deltaProp : activeRange?.delta;

  const [hovered, setHovered] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const active = hovered ?? (pinned !== null && pinned < stages.length ? pinned : null);

  const top = stages[0]?.value ?? 0;
  const coreMax = chartHeight - EDGE * 2;
  const mid = chartHeight / 2;
  // Shares are tweened, not heights, so a new period re-grows from the old shape.
  const shares = useTweenedValues(
    stages.map((s) => (top > 0 ? s.value / top : 0)),
    { disabled: reduced },
  );
  const heights = shares.map((share) => Math.max(MIN_CORE, share * coreMax));

  const activeStage = active !== null ? stages[active] : undefined;
  const prevStage = active !== null && active > 0 ? stages[active - 1] : undefined;
  const headline = activeStage ? activeStage.value : (!stagesProp && activeRange?.headline) || top;

  const selectRange = (id: string) => {
    if (rangeProp === undefined) setInnerRange(id);
    setPinned(null);
    onRangeChange?.(id);
  };

  return (
    <ChartCardFrame className={className} aria-label={title}>
      <ChartCardHeader
        label={activeStage ? activeStage.label : title}
        value={headline}
        valueKey={active ?? "total"}
        delta={activeStage ? undefined : delta}
        note={
          activeStage
            ? prevStage
              ? `${pct(activeStage.value, prevStage.value)}% of ${prevStage.label}`
              : "Top of funnel"
            : undefined
        }
        action={
          !stagesProp && ranges.length > 1 ? (
            <PeriodSelect options={ranges} selectedId={activeRange?.id ?? ""} onChange={selectRange} />
          ) : undefined
        }
      />

      <div
        role="group"
        aria-label={`${title} stages`}
        className="flex gap-0.5 px-2"
        style={{ height: chartHeight }}
        onPointerLeave={() => setHovered(null)}
      >
        {stages.map((stage, index) => {
          const color = CHART_COLORS[chartColorAt(index, stage.color)];
          const isActive = active === index;
          const fill = mono ? (isActive ? "var(--color-text-primary)" : MONO_FILL) : isActive ? color.active : color.fill;
          const h0 = heights[index] ?? MIN_CORE;
          const h1 = heights[index + 1] ?? h0;
          const share = pct(stage.value, top);
          const prev = index > 0 ? stages[index - 1] : undefined;
          return (
            <button
              key={`${stage.label}-${index}`}
              type="button"
              aria-pressed={pinned === index}
              aria-label={`${stage.label}: ${formatInt(stage.value)}, ${share}% of ${stages[0]?.label ?? "top"}${
                prev ? `, ${pct(stage.value, prev.value)}% of ${prev.label}` : ""
              }`}
              onPointerEnter={() => setHovered(index)}
              onFocus={() => setHovered(index)}
              onBlur={() => setHovered(null)}
              onClick={() => setPinned((p) => (p === index ? null : index))}
              className={cx(
                "relative min-w-0 flex-1 cursor-pointer rounded-md outline-none",
                "transition-opacity duration-200 ease-out motion-reduce:transition-none",
                "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                active !== null && !isActive && "opacity-35",
              )}
            >
              <svg
                aria-hidden
                viewBox={`0 0 100 ${chartHeight}`}
                preserveAspectRatio="none"
                className="absolute inset-0 size-full overflow-visible"
              >
                {shape === "sharp" ? (
                  <rect
                    x={0}
                    y={mid - SHARP_TRACK / 2}
                    width={100}
                    height={SHARP_TRACK}
                    style={{ fill: mono ? MONO_FILL : color.fill, opacity: 0.18 }}
                  />
                ) : (
                  LAYERS.map((layer) => (
                    <path
                      key={layer.grow}
                      d={bandPath(h0 + layer.grow * 2, h1 + layer.grow * 2, mid, shape)}
                      style={{ fill: mono ? MONO_FILL : color.fill, opacity: layer.opacity }}
                    />
                  ))
                )}
                <path
                  d={bandPath(h0, h1, mid, shape)}
                  className="transition-[fill] duration-200 ease-out motion-reduce:transition-none"
                  style={{ fill }}
                />
              </svg>
              <span
                aria-hidden
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background-primary-default px-1.5 py-px text-caption-1-medium text-text-primary tabular-nums shadow-xs"
              >
                {share}%
              </span>
            </button>
          );
        })}
      </div>

      <StatTiles
        columns={Math.max(1, stages.length)}
        activeIndex={active}
        onActiveChange={setHovered}
        items={stages.map((stage, index) => ({
          id: `${stage.label}-${index}`,
          label: stage.label,
          value: formatInt(stage.value),
          color: mono ? null : chartColorAt(index, stage.color),
        }))}
      />
    </ChartCardFrame>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The tween and `useCountUp` cancel their pending animation frame on every new target and on unmount. Hover state is plain React state; the Select's outside-press listener is removed by the Select itself when it closes or unmounts.

**Reduced motion.** `useTweenedValues` is disabled, so the bands render at their final shares on mount and jump on a period change. The headline count runs over 1ms (a single frame), the number fade and the opacity/fill transitions are removed with `motion-reduce:` variants.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Using `preserveAspectRatio` other than `"none"`. The viewBox is 100 units wide but the column is not, so a uniform scale letterboxes the band and the columns stop meeting at their edges.
- Putting the share pill inside the SVG. With a non-uniform scale the text would stretch. The pill is an HTML span centred over the column.
- Tweening the path strings or the pixel heights. Interpolating shares keeps the shape correct at every frame and lets a new period start from wherever the previous tween had got to.
- Expecting Recharts' `<Funnel>`: it stacks vertical trapezoids and cannot draw the eased horizontal taper.

## Notes

- `SIGNUP_FUNNEL_RANGES`, `FunnelStage`, `FunnelRange` and `FunnelShape` are exported. Pass `stages` (and `delta`) for a single static funnel without the period select.
- The shell companion (`ChartCardFrame`, `ChartCardHeader`, `PeriodSelect`, `StatTiles`, `CHART_COLORS`, `useTweenedValues`) is shared by the other BoardUI chart cards in this batch.

## Definition of done

The card shows "Sign-up funnel", "197" and a lime "+5.2%" chip, four columns (lime, blue, purple, pink) with pills 100%, 56%, 39%, 19%, and tiles Link opened 197, Started 110, Completed 77, Converted 38. Hovering Started dims the other columns and tiles, and the header reads "Started", "110" and "56% of Link opened". Choosing "Last 30 days" re-grows the bands and the headline counts to 842. Clicking a stage sets its aria-pressed to true; clicking again clears it.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
