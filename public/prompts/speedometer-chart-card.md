# Build: Speedometer Chart Card

A dashboard card with a half gauge that opens at the bottom. The `segments` look stacks one round-capped segment per item around a gray track, with a small gap between neighbours, and writes the primary item's share in the centre ("47%" over "Desktop"). The segments sweep in from the left end on mount and re-proportion on a period change. Hovering, focusing or tapping a segment darkens it one tone, fades the others, swaps the count-up headline to that item and moves the centre to its share; a click or Enter makes it the primary. The `needle` look draws one value arc in the item's colour over a tick scale, with a needle that swings to every new value, the value under the hub and min/max labels at the arc ends.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A 220° half gauge in the dashboard card shell: stacked segments with the main share in the centre, or a value arc and needle.

- Category: display
- Runtime cost: dom
- Dependencies: none beyond React

## How it works

1. The gauge is an inline SVG drawn 1:1 in a 280 × 212 box, centred on (140, 134) with a 110px radius. Angles run clockwise from twelve o'clock, from −110° to +110° (a 220° sweep), and `polar(θ, r)` maps them to `(140 + r·sin θ, 134 − r·cos θ)`. `arcPath` writes one SVG `A` command between two angles, with the large-arc flag set past 180°.
2. For `segments`, the items become cumulative boundaries (0..1 of the total) that go through `useTweenedValues`, a 520ms ease-out cubic tween from 0 on mount and from the current boundaries on a period change. `layoutSegments` turns them into angles: a 6px gap (6/110 rad) between neighbours, scaled by the last boundary so the gaps open as the gauge sweeps in, and the rest of the sweep shared by value.
3. Each segment path is inset by the round cap's half-width (14/110 rad) at both ends, so the caps land exactly on the segment's extent and the gaps stay clean. The gray track is inset the same way, so no track shows past the first and last segments. A segment too short for its two caps becomes a dot centred on its extent, as wide as the extent (at least 4px).
4. Each segment is a `<g role="button" tabIndex=0 aria-pressed>`. Pointer enter and focus set the active item, leaving the gauge or blurring clears it, and click or Enter/Space call `onPrimaryChange` (or set the uncontrolled primary). The active segment switches to the darker `--color-chart-N-active` tone, the others fade to 0.35 opacity over 200ms, and a keyboard focus draws a focus-ring halo under the segment.
5. The centre is an HTML overlay over the SVG with `aria-live="polite"`. It shows the share of the hovered item, or else the primary item, in `text-display-4`, and remounts on every change so the shell's number fade plays. The header shows the total and the delta chip at rest; on hover it shows the item, its value and "x% of total".
6. For `needle`, the value is the `value` prop or else the shown item's share in percent, mapped to 0..1 of `min`..`max`. The fraction goes through `useTweenedValues` over 700ms. The value arc runs from the left end to the needle angle in the shown item's colour, and the needle polygon is drawn pointing up and rotated about the hub by that angle, so the arc and the needle move together. Eleven ticks mark every 10% (the 0, 50 and 100% ticks are longer), and the min/max labels sit under the arc ends.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `W × H = 280 × 212px, centre (140, 134), radius 110`
  Drawn 1:1 so the centre overlay is placed in plain CSS px with no viewBox scaling, and the arc ends and their labels fit under the hub.
- `START / SWEEP = −110° / 220°`
  Opens the gauge at the bottom like the preview, with room for the centre value inside the arc.
- `SEG_STROKE / NEEDLE_STROKE = 28px / 16px`
  Thick segments read as a stacked gauge; the needle look uses a thinner band so the ticks and needle stay the focus.
- `GAP_PX = 6px`
  A visible break between round-capped neighbours. It is scaled by the sweep progress so it does not show before the gauge fills.
- `NEEDLE_MS = 700ms ease-out cubic`
  Slower than the 520ms segment tween, so the needle reads as a swing rather than a jump.

## API

```ts
function SpeedometerChartCard(props: { title?: string; variant?: "segments" | "needle"; ranges?: GaugeRange[]; items?: GaugeItem[]; delta?: number; range?: string; defaultRange?: string; onRangeChange?: (id: string) => void; primary?: number; defaultPrimary?: number; onPrimaryChange?: (index: number) => void; value?: number; min?: number; max?: number; formatGaugeValue?: (value: number) => string; gaugeLabel?: string; tiles?: boolean; formatValue?: (value: number) => string; className?: string }): JSX.Element
type GaugeItem = { label: string; value: number; color?: ChartColor }
type GaugeRange = { id: string; label: string; items: GaugeItem[]; delta?: number }
```

- `title: string` — default `"Visitors"`
  Header label while nothing is hovered, and the card's accessible name.
- `variant: "segments" | "needle"` — default `"segments"`
  Stacked segments with the primary share in the centre, or one value arc with a needle.
- `ranges: GaugeRange[]` — default `SPEEDOMETER_RANGES`
  Periods with their own items and delta. Two or more show the period select.
- `items: GaugeItem[]`
  A single item list. Overrides `ranges` and hides the select.
- `delta: number`
  Headline chip percentage when `items` is used.
- `range: string`
  Controlled period id.
- `defaultRange: string` — default `first range id`
  Initial period when uncontrolled.
- `onRangeChange: (id: string) => void`
  Called when the period select changes.
- `primary: number`
  Controlled index of the item the centre and the needle report while nothing is hovered.
- `defaultPrimary: number` — default `0`
  Initial primary index when uncontrolled.
- `onPrimaryChange: (index: number) => void`
  Called when a segment is clicked or pressed with Enter/Space.
- `value: number`
  Needle value. Defaults to the shown item's share of the total in percent.
- `min: number` — default `0`
  Needle scale start.
- `max: number` — default `100`
  Needle scale end.
- `formatGaugeValue: (value: number) => string` — default ``${Math.round(v)}%``
  Formats the centre value and the min/max labels.
- `gaugeLabel: string` — default `shown item's name`
  Caption under the centre value.
- `tiles: boolean` — default `true`
  Stat tiles under the gauge, three per row; hovering one focuses its segment.
- `formatValue: (value: number) => string` — default `en-US integer`
  Formats the headline, tiles and the segments' accessible labels.
- `className: string`
  Merged onto the card section.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/**
 * One stacked segment. Its visible extent is [from, to]; the path is inset
 * by the cap's half-width at both ends so the round caps land exactly on the
 * extent and neighbours keep a clean gap. Too short for its caps, it becomes
 * a dot as wide as the extent allows, centred on it.
 */
function SegmentView({
  item,
  index,
  segment,
  color,
  active,
  primary,
  focusVisible,
  label,
  onTarget,
  onFocusVisible,
  onSelect,
}: SegmentViewProps) {
  const span = segment.to - segment.from;
  if (span <= 0.0001) return null;
  const tone = CHART_COLORS[color];
  const isActive = active === index;
  const dimmed = active !== null && !isActive;
  const cap = SEG_STROKE / 2 / R;
  const fits = span > cap * 2;
  const mid = (segment.from + segment.to) / 2;
  const d = fits ? arcPath(segment.from + cap, segment.to - cap, R) : arcPath(mid, mid, R);
  const width = fits ? SEG_STROKE : Math.max(4, span * R);

  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect();
  };

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={primary}
      data-segment={item.label}
      className="cursor-pointer outline-none"
      onPointerEnter={() => onTarget(index)}
      onFocus={(event) => {
        onTarget(index);
        onFocusVisible(event.currentTarget.matches(":focus-visible") ? index : null);
      }}
      onBlur={() => {
        onTarget(null);
        onFocusVisible(null);
      }}
      onClick={onSelect}
      onKeyDown={onKeyDown}
    >
      {focusVisible ? (
        <path d={d} fill="none" stroke="var(--color-border-focus-ring)" strokeWidth={width + 6} strokeLinecap="round" />
      ) : null}
      <path
        d={d}
        fill="none"
        stroke={isActive ? tone.active : tone.fill}
        strokeWidth={width}
        strokeLinecap="round"
        opacity={dimmed ? 0.35 : 1}
        className="transition-[stroke,opacity] duration-200 ease-out motion-reduce:transition-none"
      />
    </g>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The segment and needle tweens and the headline's count-up cancel their animation frame on every new target and on unmount. Hover, focus and the primary are plain React state on SVG elements, with no document listeners.

**Reduced motion.** `useTweenedValues` is disabled for both looks, so the segments render at their final extents and the needle sits at its value, jumping on a change. The stroke/opacity fades use `motion-reduce:transition-none`, and the centre number fade is off (`motion-reduce:animate-none`).

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Drawing round-capped segments edge to edge. The caps then overlap the neighbours by half the stroke on each side. Inset each path by the cap's half-width so the visible extent is exactly the segment.
- Opening the gaps from the first frame. On mount every segment then starts as a dot at its gap position. Scaling the gap with the last boundary makes the whole gauge sweep in from one end.
- Rotating the needle with a CSS transition while the arc is tweened in JS. The two then drift apart mid-swing. Drive both from the same tweened fraction.

## Notes

- `SPEEDOMETER_RANGES`, `GaugeItem`, `GaugeRange` and `SpeedometerVariant` are exported. Pass `items` (and `delta`) for one static list without the period select.
- Pass `value` with `min`/`max` to use the needle look as a plain gauge for any number, and `formatGaugeValue` for the units.
- The frame, header, period select and stat tiles come from `funnel-chart-card-shell`.

## Definition of done

The card shows "Visitors", "2,500", a lime "+5.2%" chip and a "Last 7 days" select. Under it is a half gauge with lime, blue, purple and pink segments (Desktop, Mobile, Tablet, TV) separated by small gaps, with "47%" over "Desktop" in the centre, and four tiles: Desktop 1,180, Mobile 620, Tablet 380 and TV 320. Hovering the Mobile tile fades the other segments and tiles, the header reads "Mobile", "620" and "25% of total", and the centre reads "25%" over "Mobile". In the Needle look the needle and a lime arc point at 47%, "0%" and "100%" sit under the arc ends, and picking Mobile swings the needle back to 25%. "Last 30 days" re-proportions the segments, and the headline counts to 10,000.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
