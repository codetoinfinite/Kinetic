# Build: Radial Chart Card

A dashboard card that draws one rounded arc per item over its own track ring, smallest item innermost, every arc starting at twelve o'clock and running clockwise. The arcs sweep in on mount and to their new lengths on every period or look change. Hovering, focusing or tapping a ring darkens it one tone, fades the others, floats a tooltip on the arc's tip and swaps the count-up headline to that item. Four looks come from one prop: plain rings, names set along each arc, rings over a circular grid, and a single gauge of the total against a goal with the percentage in the centre.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Concentric radial bars in the dashboard card shell, with a tooltip on the arc tip, a count-up headline that follows hover, and stat tiles.

- Category: display
- Runtime cost: dom
- Dependencies: none beyond React

## How it works

1. The chart is an inline SVG drawn 1:1 in a 216px square. `layoutRings` puts the outermost ring flush with the edge (radius 108 − 2 − stroke/2) and steps inwards by the pitch (stroke + gap, 8 + 4 for rings). If the rings would come closer than 26px to the centre, the pitch shrinks to fit.
2. Each arc is a `<circle>` rotated −90° about the centre, with `pathLength=100` and `strokeLinecap="round"`. Its dash is just `fraction × 100`, so no arc maths is needed. The fraction is `value / max`, where max defaults to the largest item ÷ 0.9, so the biggest ring sweeps 324°.
3. The fractions go through `useTweenedValues`: a 520ms ease-out cubic tween that starts from 0 on mount and from the current sweeps on a new period or look. So the arcs grow, shrink and re-proportion in one motion.
4. Each ring is a `<g role="button" tabIndex=0>` holding the track, the arc, an optional name and a transparent hit circle as wide as the pitch, so the gaps between rings still hover. Pointer enter and focus set the active ring, click or Enter/Space toggle a pin (`aria-pressed`), and leaving the square clears the hover.
5. The active arc switches to the darker `--color-chart-N-active` tone. The other arcs fade to 0.3 opacity over 200ms, and so do the stat tiles (to 0.45). A keyboard focus also draws a focus-ring halo under that ring.
6. The tooltip is a plain absolutely positioned div. It sits on the arc's tip, at `(C + r·cos θ, C + r·sin θ)` with θ = fraction × 2π − π/2. Its x is clamped 52px inside the square so it never clips, and it is lifted 10px above the tip.
7. The `labels` look writes each name in 8px white type on a `<textPath>` that follows a closed circle path starting at twelve o'clock. A name only shows once its arc is longer than the text (about 4.9px per character plus 10px of padding and the stroke), so short arcs never spill their label.
8. `gauge` folds the items into one ring of their total against the range's `goal` (or `max`), with the percentage and a caption in the centre. Its tiles show the total, the goal and what is still to go.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `SIZE = 216px square, drawn 1:1`
  Matches the preview's ring diameter, and keeps tooltip positions in plain CSS px with no viewBox scaling.
- `LOOKS = rings 8/4, labels 12/2, grid 8/4 without track, gauge 16 (stroke/gap px)`
  Five rings fit with a 50px hole on the plain look. The labelled look needs a 12px band for 8px type.
- `HEADROOM = 0.9`
  The largest item sweeps 324° instead of a closed circle, so every ring still shows where it ends.
- `MIN_HOLE = 26px`
  With many items the pitch shrinks so the innermost ring never collapses into the centre.
- `TIP_INSET = 52px`
  Keeps the roughly 110px-wide tooltip inside the chart square at the ring's far left or right.
- `tween = 520ms ease-out cubic (useTweenedValues)`
  Sweeps are tweened as fractions, so a period or look change starts from wherever the arcs are.

## API

```ts
function RadialChartCard(props: { title?: string; variant?: "rings" | "labels" | "grid" | "gauge"; ranges?: RadialRange[]; items?: RadialItem[]; delta?: number; max?: number; range?: string; defaultRange?: string; onRangeChange?: (id: string) => void; tiles?: boolean; showCenter?: boolean; gaugeCaption?: string; formatValue?: (value: number) => string; className?: string }): JSX.Element
type RadialItem = { label: string; value: number; color?: ChartColor }
type RadialRange = { id: string; label: string; items: RadialItem[]; delta?: number; goal?: number }
```

- `title: string` — default `"Visitors"`
  Header label while nothing is active. Also the gauge's item name and the card's accessible name.
- `variant: "rings" | "labels" | "grid" | "gauge"` — default `"rings"`
  Plain rings, names along each arc, rings over a circular grid, or one total against a goal.
- `ranges: RadialRange[]` — default `RADIAL_RANGES`
  Periods with their own items, delta and goal. Two or more show the period select.
- `items: RadialItem[]`
  A single item list, innermost first. Overrides `ranges` and hides the select.
- `delta: number`
  Headline chip percentage when `items` is used.
- `max: number` — default `largest ÷ 0.9 (rings), range goal (gauge)`
  The value of a full circle.
- `range: string`
  Controlled period id.
- `defaultRange: string` — default `first range id`
  Initial period when uncontrolled.
- `onRangeChange: (id: string) => void`
  Called when the period select changes.
- `tiles: boolean` — default `true`
  Stat tiles under the chart, three per row; hovering one focuses its ring.
- `showCenter: boolean` — default `false`
  Shows the active value (or the total) in the hole of the ring looks.
- `gaugeCaption: string` — default `"of goal"`
  Caption under the gauge's centre percentage.
- `formatValue: (value: number) => string` — default `en-US integer`
  Formats the headline, tooltip, tiles and the accessible labels.
- `className: string`
  Merged onto the card section.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/**
 * One ring: track, arc, optional name on a text path, and a transparent hit
 * stroke as wide as the ring pitch so the gaps between rings still hover.
 * The arc is a circle rotated to twelve o'clock with `pathLength=100`, so its
 * dash is simply the tweened fraction × 100 and round caps close it off.
 */
function RingView({
  item,
  index,
  ring,
  fraction,
  color,
  variant,
  active,
  pinned,
  focusVisible,
  label,
  pathId,
  onTarget,
  onFocusVisible,
  onTogglePin,
}: RingViewProps) {
  const tone = CHART_COLORS[color];
  const isActive = active === index;
  const dimmed = active !== null && !isActive;
  const look = LOOKS[variant];
  const dash = clamp01(fraction) * 100;
  const arcLength = clamp01(fraction) * 2 * Math.PI * ring.r;
  const showName =
    variant === "labels" && arcLength >= item.label.length * LABEL_CHAR + LABEL_OFFSET * 2 + ring.stroke;

  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onTogglePin();
  };

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={pinned}
      data-ring={item.label}
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
      onClick={onTogglePin}
      onKeyDown={onKeyDown}
    >
      {focusVisible ? (
        <circle
          cx={C}
          cy={C}
          r={ring.r}
          fill="none"
          stroke="var(--color-border-focus-ring)"
          strokeWidth={ring.stroke + Math.min(4, ring.pitch - ring.stroke + 2)}
        />
      ) : null}
      {look.track ? (
        <circle cx={C} cy={C} r={ring.r} fill="none" stroke="var(--color-chart-track)" strokeWidth={ring.stroke} />
      ) : null}
      {dash > 0 ? (
        <circle
          cx={C}
          cy={C}
          r={ring.r}
          fill="none"
          stroke={isActive ? tone.active : tone.fill}
          strokeWidth={ring.stroke}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${dash} 100`}
          transform={`rotate(-90 ${C} ${C})`}
          opacity={dimmed ? 0.3 : 1}
          className="transition-[stroke,opacity] duration-200 ease-out motion-reduce:transition-none"
        />
      ) : null}
      {variant === "labels" ? (
        <>
          <path id={pathId} d={circlePath(ring.r)} fill="none" stroke="none" />
          <text
            aria-hidden
            fontSize={LABEL_FONT}
            fontWeight={600}
            fill="#fff"
            dominantBaseline="central"
            opacity={showName ? (dimmed ? 0.5 : 1) : 0}
            className="pointer-events-none select-none transition-opacity duration-200 ease-out motion-reduce:transition-none"
          >
            <textPath href={`#${pathId}`} startOffset={LABEL_OFFSET}>
              {item.label}
            </textPath>
          </text>
        </>
      ) : null}
      <circle
        cx={C}
        cy={C}
        r={ring.r}
        fill="none"
        stroke="transparent"
        strokeWidth={ring.pitch}
        pointerEvents="stroke"
      />
    </g>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The sweep tween and the headline's `useCountUp` cancel their animation frame on every new target and on unmount. Hover, focus and pin are plain React state on SVG elements, with no document listeners.

**Reduced motion.** `useTweenedValues` is disabled, so the arcs render at their final sweeps and jump on a change. The stroke/opacity fades on arcs and names use `motion-reduce:transition-none`. The headline count runs over 1ms, and the number fade is off.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Drawing arcs with SVG `A` commands. A full or near-full sweep then needs special cases, because start and end coincide. A rotated circle with `pathLength=100` and a dash covers 0–100% with one formula.
- Hit-testing only the visible stroke. The 4px gaps between rings then flicker the hover off as the pointer crosses them. A transparent stroke as wide as the pitch makes the whole band one target.
- Showing ring names regardless of arc length. The name of a short arc then runs on past its end over the bare track. Hide it until the arc is longer than the text.

## Notes

- `RADIAL_RANGES`, `RadialItem`, `RadialRange` and `RadialVariant` are exported. Pass `items` (and `delta`) for one static list without the period select.
- `showCenter` writes the active item's value (or the total) in the hole of the ring looks.
- The frame, header, period select and stat tiles come from `funnel-chart-card-shell`.

## Definition of done

The card shows "Visitors", "925", a lime "+5.2%" chip and a "Last 7 days" select. Five rings follow, from the inside out: Other (lime), Edge (blue), Firefox (purple), Safari (pink) and Chrome (yellow), with Chrome sweeping about 324°. Five tiles sit three per row, the last row stretched. Hovering the Chrome ring fades the others, shows a tooltip "Chrome 275 30%" at its tip, and the header reads "Chrome", "275" and "30% of total". The Labels look writes each name along its arc. The Gauge look shows one ring with "62%" over "of goal" and tiles for Visitors 925, Goal 1,500 and To go 575. "Last 30 days" sweeps the arcs to the new values, and the headline counts to 4,005.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
