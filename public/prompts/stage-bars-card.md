# Build: Stage Bars Card

A dashboard card that lists funnel stages as rounded pills over the chart track: name on the left, value and share of the top stage on the right, a 14px icon at the start of each pill. The pills grow to their shares on mount and on every period change. Hovering, focusing or tapping a stage fades the others and swaps the count-up headline to that stage with its step conversion. With `stacked`, each pill splits into its breakdown parts with a legend, and hovering a part (or arrowing through it) shows that part's value and its share of the stage.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A funnel as rounded stage pills with value and share, optional stacked parts with a legend, stat tiles and a headline that follows hover.

- Category: display
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. The rows live in one CSS grid, `max-content | minmax(0,1fr) | max-content`, and every row is a `<button>` spanning it with `grid-cols-subgrid`. So the name column sizes to the longest stage name and all pills start on the same line.
2. Each pill is an absolutely positioned span inside a `bg-chart-track` track. Its width is `share * 100%`, where share is `value / top` tweened by `useTweenedValues` (520ms ease-out cubic, from 0 on mount and from the current shares on a new period). With an icon, the pill keeps a 20px minimum so the icon always sits on colour.
3. Stacked, the pill becomes a flex row with a 2px gap. Each part is `flex-basis: 0` with `flex-grow` set to its value, so the parts always fill exactly the pill. When a new period changes the mix, `flex-grow` moves through a 300ms CSS transition.
4. The legend is built from the parts' labels in first-seen order. Each series takes the next palette colour (lime, blue, purple, …) unless a part sets `color`. In mono, the series step down in opacity (1, 0.75, 0.5, floor 0.4) instead.
5. The target is `{ stage, segment | null }`. Pointer enter and focus on a row set the stage; pointer enter on a part sets the part, and leaving it goes back to the stage. On a focused stacked row, ArrowRight/ArrowLeft walk through the parts and back to the whole stage. Click toggles a pin (`aria-pressed`) that holds the stage when nothing is hovered.
6. The header shows the title, the top value and the delta chip at rest. A stage shows its name, its value and "58% of Sign-up" (step conversion) or "Top of funnel". A part shows "Sign-up · Paid", its value and "32% of Sign-up". The number counts up in a `<p>` keyed by the target, so the fade replays on every swap.
7. Inactive rows and tiles fade to 0.4 and 0.45 opacity over 200ms. Within a hovered stacked row the other parts fade to 0.35, and the active fill switches to the darker `--color-chart-N-active` tone (text-primary in mono).

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `pill = 20px tall (h-5), rounded-full, rows 28px + 4px gap`
  Matches the preview's pitch: six stages fit in about 190px, with room for a 14px icon and a hit area tall enough to hover.
- `ICON_PILL_MIN = 20px`
  A 3% stage would otherwise be a 7px sliver with its icon over the track; on the dark track the near-black icon would vanish.
- `tween = 520ms ease-out cubic, from 0 on mount`
  Shares are tweened rather than widths in px, so resizing the card never animates and a new period starts from wherever the bars are.
- `part transition = flex-grow, background-color and opacity over 300ms`
  Re-proportioning the parts at the same pace as the bar width keeps a period change reading as one motion.
- `monoOpacity = 1 − 0.25 × series index, floor 0.4`
  With one ink, stacked parts still need to read as different series; three steps stay apart on both themes.
- `tiles = 3 per row, 120px minimum`
  Six stages make two even rows, as in the preview; a 360px card wraps to two per row.

## API

```ts
function StageBarsCard(props: { title?: string; ranges?: StageRange[]; stages?: BarStage[]; delta?: number; range?: string; defaultRange?: string; onRangeChange?: (id: string) => void; stacked?: boolean; mono?: boolean; showIcons?: boolean; formatValue?: (value: number) => string; className?: string }): JSX.Element
type BarStage = { label: string; value: number; color?: ChartColor; icon?: ReactNode; segments?: StageSegment[] }
type StageSegment = { label: string; value: number; color?: ChartColor }
```

- `title: string` — default `"Pipeline"`
  Header label while nothing is active; also the card's accessible name.
- `ranges: StageRange[]` — default `PIPELINE_RANGES`
  Periods with their own stages, delta and optional headline. Two or more show the period select.
- `stages: BarStage[]`
  A single stage list, top first. Overrides `ranges` and hides the select.
- `delta: number`
  Headline chip percentage when `stages` is used.
- `range: string`
  Controlled period id.
- `defaultRange: string` — default `first range id`
  Initial period when uncontrolled.
- `onRangeChange: (id: string) => void`
  Called when the period select changes.
- `stacked: boolean` — default `false`
  Splits each pill into its stage's `segments` and shows a legend. Tile swatches are hidden, since colour then means the part.
- `mono: boolean` — default `false`
  One ink for every pill (secondary text colour, primary when active) and no tile swatches.
- `showIcons: boolean` — default `true`
  Draws each stage's `icon` at the left end inside its pill.
- `formatValue: (value: number) => string` — default `en-US integer`
  Formats the headline, row values, tiles and the accessible labels.
- `className: string`
  Merged onto the card section.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/**
 * One stage: a subgrid row of [name | pill on the track | value + share].
 * The pill's width is the tweened share of the top stage. Stacked, it is a
 * flex row of parts whose `flex-grow` is their value, so the parts always fill
 * exactly the pill and re-proportion with a CSS transition on a new period.
 */
function StageRow({
  stage,
  index,
  share,
  topLabel,
  topValue,
  series,
  mono,
  showIcons,
  active,
  pinned,
  formatValue,
  onTarget,
  onTogglePin,
}: StageRowProps) {
  const parts = series.length > 0 ? partsOf(stage) : [];
  const isActive = active?.stage === index;
  const activePart = isActive ? (active?.segment ?? null) : null;
  const color = CHART_COLORS[chartColorAt(index, stage.color)];
  const solid = mono ? (isActive ? "var(--color-text-primary)" : MONO_FILL) : isActive ? color.active : color.fill;
  const icon = showIcons && stage.icon ? stage.icon : null;
  const percent = pct(stage.value, topValue);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (parts.length === 0 || (event.key !== "ArrowRight" && event.key !== "ArrowLeft")) return;
    event.preventDefault();
    const last = parts.length - 1;
    // Right walks 0..last then back to the whole stage; Left walks the other way.
    const next =
      event.key === "ArrowRight"
        ? activePart === null ? 0 : activePart < last ? activePart + 1 : null
        : activePart === null ? last : activePart > 0 ? activePart - 1 : null;
    onTarget({ stage: index, segment: next });
  };

  const breakdown = parts.map((p) => `${p.label} ${formatValue(p.value)}`).join(", ");

  return (
    <button
      type="button"
      aria-pressed={pinned}
      aria-label={`${stage.label}: ${formatValue(stage.value)}, ${percent}% of ${topLabel}${breakdown ? `. ${breakdown}` : ""}`}
      aria-keyshortcuts={parts.length > 0 ? "ArrowLeft ArrowRight" : undefined}
      onPointerEnter={() => onTarget({ stage: index, segment: null })}
      onFocus={() => onTarget({ stage: index, segment: null })}
      onBlur={() => onTarget(null)}
      onClick={onTogglePin}
      onKeyDown={onKeyDown}
      className={cx(
        "col-span-3 grid cursor-pointer grid-cols-subgrid items-center rounded-md py-1 text-left outline-none",
        "transition-opacity duration-200 ease-out motion-reduce:transition-none",
        "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
        active !== null && !isActive && "opacity-40",
      )}
    >
      <span className="text-right text-body-regular whitespace-nowrap text-text-secondary">{stage.label}</span>
      <span className="relative h-5 min-w-0 rounded-full bg-chart-track">
        <span
          className="absolute inset-y-0 left-0 flex gap-0.5 overflow-hidden rounded-full"
          style={{
            width: `${Math.max(0, share) * 100}%`,
            minWidth: icon && stage.value > 0 ? ICON_PILL_MIN : undefined,
          }}
        >
          {parts.length > 0 ? (
            parts.map((part, partIndex) => {
              const seriesIndex = series.findIndex((s) => s.label === part.label);
              const tone = CHART_COLORS[series[seriesIndex]?.color ?? "lime"];
              const lit = activePart === partIndex;
              return (
                <span
                  key={part.label}
                  data-part={part.label}
                  onPointerEnter={() => onTarget({ stage: index, segment: partIndex })}
                  onPointerLeave={() => onTarget({ stage: index, segment: null })}
                  className="h-full min-w-0 basis-0 transition-[flex-grow,background-color,opacity] duration-300 ease-out motion-reduce:transition-none"
                  style={{
                    flexGrow: part.value,
                    backgroundColor: mono ? (lit ? "var(--color-text-primary)" : MONO_FILL) : lit ? tone.active : tone.fill,
                    opacity: activePart !== null && !lit ? 0.35 : mono ? monoOpacity(seriesIndex) : 1,
                  }}
                />
              );
            })
          ) : (
            <span
              className="h-full flex-1 transition-[background-color] duration-200 ease-out motion-reduce:transition-none"
              style={{ backgroundColor: solid }}
            />
          )}
        </span>
        {icon ? (
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-[3px] flex size-3.5 -translate-y-1/2 items-center justify-center text-neutral-950"
          >
            {icon}
          </span>
        ) : null}
      </span>
      <span className="flex items-baseline justify-end gap-1.5 tabular-nums">
        <span className="text-body-medium text-text-primary">{formatValue(stage.value)}</span>
        <span className="min-w-[4ch] text-caption-1-regular text-text-tertiary">{percent}%</span>
      </span>
    </button>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The width tween and `useCountUp` cancel their animation frame on every new target and on unmount. Hover, pin and keyboard targets are plain React state; there are no listeners outside React.

**Reduced motion.** `useTweenedValues` is disabled, so the pills render at their final widths on mount and jump on a period change. The parts' flex-grow/colour/opacity transitions and the row fades are removed with `motion-reduce:transition-none`. The headline count runs over 1ms, and the number fade is off.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Sizing stacked parts as percentages of the track. Their sum then drifts from the pill width as soon as the 2px gaps or the icon minimum come in. Flex-grow by value always fills the pill exactly.
- Putting the label, bar and numbers in separate flex rows. Each row then sizes its own name column and the pills start at different x positions. A shared grid with subgrid rows keeps one column for every row.
- Making stacked parts separate tab stops. Six stages × three parts is 18 stops; arrow keys on the focused stage reach the same detail with one stop per row.

## Notes

- `PIPELINE_RANGES`, `BarStage`, `StageSegment` and `StageRange` are exported. Pass `stages` (and `delta`) for one static list without the period select.
- Stages share the funnel's shape (`label`, `value`, `color`) plus `icon` and `segments`, so the same data can drive the Funnel Chart Card.
- The frame, header, period select and stat tiles come from `funnel-chart-card-shell`.

## Definition of done

The card shows "Pipeline", "1,180" and a lime "+2.4%" chip. Six rows follow: Visits 1,180 100%, Sign-up 790 67%, Active 460 39%, Pro 250 21%, Team 120 10% and Enterprise 40 3%, with lime, blue, purple, pink, yellow and emerald pills and icons. Six tiles sit three per row. Hovering Active fades the other rows and the header reads "Active", "460" and "58% of Sign-up". With "By channel", each pill splits into three parts with an Organic / Paid / Referral legend. Hovering Sign-up's second part reads "Sign-up · Paid", "253" and "32% of Sign-up". "Last 30 days" grows the pills and the headline counts to 4,820.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
