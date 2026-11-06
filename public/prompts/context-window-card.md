# Build: Context Window Card

A small usage tile that shows how much of a model's context window is taken and by what. Each category (messages, tools, memory, system prompt) is a coloured segment on a 4px track, and whatever is left of the track is the free space. A chevron next to the totals opens a legend with each category's tokens and share, and hovering a row or a segment dims the rest so the pair reads together.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

An agent's context window as one thin segmented bar by category, with a disclosable legend of token counts and shares.

- Category: display
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. Sum the segment tokens, clamped to `capacity`, as `used`; `free = capacity − used`; the header prints `formatTokens(used) / formatTokens(capacity) (pct%)` with the percentage in the semibold primary style.
2. Compute each segment's width as its share of the WHOLE window (`tokens / capacity × 100%`), walking a `remaining` budget so an over-full list never paints past the track. Draw them left to right in a `flex h-1 gap-px overflow-hidden rounded-full bg-chart-track` row, so the empty track on the right is the free space with no element of its own.
3. Give the bar `role="meter"` with `aria-valuemin`, `aria-valuemax=capacity`, `aria-valuenow=used` and an `aria-valuetext` like "820k of 1M tokens used (82%)". The segments themselves are decorative.
4. The header totals are a `<button aria-expanded aria-controls>` that toggles the legend (controlled `expanded` or uncontrolled `defaultExpanded`). The legend collapses with a `grid-rows-[0fr] → [1fr]` transition plus opacity, and is `inert` while closed so its rows leave the tab and reading order.
5. One `active` id is shared by the segments and the legend rows: `pointerenter` sets it, `pointerleave` clears it, and every other segment drops to 35% opacity (rows to 60%) while the active row gets the hover surface.
6. Segment widths transition over 500ms ease-out, so adding or compacting tokens visibly grows or shrinks the bar. `children` render below an `<hr>` divider, which is how plan limits share the same tile.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `bar height = h-1 (4px) with gap-px between segments`
  Matches the hairline bar on BoardUI's Agent limits tile. The 1px gap is what keeps seven adjacent colours readable as separate categories without outlines.
- `width transition = 500ms ease-out`
  Long enough to read a compaction as the bar draining, short enough that a fast run of turns does not lag behind the totals in the header.
- `dim opacity = segments 35%, legend rows 60%`
  The thin bar needs a stronger drop than the text rows for the highlighted segment to pop; rows keep 60% so their numbers stay legible.
- `compact format = ≥1M → one decimal M (trailing .0 dropped), ≥1k → rounded k`
  Gives "820k / 1M" exactly as on the tile; decimals in k would make the header jitter on every turn.

## API

```ts
function ContextWindowCard(props: { segments: ContextSegment[]; capacity: number; label?: ReactNode; freeLabel?: string; expanded?: boolean; defaultExpanded?: boolean; onExpandedChange?: (expanded: boolean) => void; formatTokens?: (tokens: number) => string; children?: ReactNode; className?: string }): JSX.Element
type ContextSegment = { id: string; label: string; tokens: number; color?: "blue" | "purple" | "pink" | "yellow" | "green" | "sky" | "teal" | "indigo" | "lime" }
function formatTokensCompact(tokens: number): string
```

- `segments: ContextSegment[]`
  Category usage drawn left to right: id, label, tokens and a palette colour.
- `capacity: number`
  Window size in tokens. Segment widths are shares of this, the rest is free track.
- `label: ReactNode` — default `"Context window"`
  Header label; also the meter's accessible name when it is a string.
- `freeLabel: string` — default `"Free space"`
  Legend label for the unused remainder.
- `expanded: boolean`
  Controlled legend state.
- `defaultExpanded: boolean` — default `false`
  Uncontrolled legend state on mount.
- `onExpandedChange: (expanded: boolean) => void`
  Called when the header toggle is pressed.
- `formatTokens: (tokens: number) => string` — default `formatTokensCompact`
  Formats every count in the header and legend.
- `children: ReactNode`
  Rows rendered under a divider in the same tile (plan limits, actions).
- `className: string`
  Merged onto the card surface.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function ContextWindowCard({
  segments,
  capacity,
  label = "Context window",
  freeLabel = "Free space",
  expanded,
  defaultExpanded = false,
  onExpandedChange,
  formatTokens = formatTokensCompact,
  children,
  className,
}: ContextWindowCardProps) {
  const legendId = useId();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultExpanded);
  const open = expanded ?? uncontrolledOpen;
  const [active, setActive] = useState<string | null>(null);

  const setOpen = (next: boolean) => {
    setUncontrolledOpen(next);
    onExpandedChange?.(next);
  };

  // Clamp so an over-full window never paints past the track.
  const used = Math.min(
    capacity,
    segments.reduce((sum, s) => sum + Math.max(0, s.tokens), 0),
  );
  const free = Math.max(0, capacity - used);
  const usedPct = Math.round(percentOf(used, capacity));

  // Each segment's width is its share of the WHOLE window, so the empty
  // track to the right is the free space with no extra element.
  let remaining = capacity;
  const widths = segments.map((s) => {
    const tokens = Math.min(Math.max(0, s.tokens), remaining);
    remaining -= tokens;
    return percentOf(tokens, capacity);
  });

  return (
    <section
      className={cx(
        "flex w-full min-w-0 flex-col gap-3 rounded-[14px] bg-background-secondary-default p-3.5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-caption-1-medium text-text-secondary">{label}</h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={legendId}
          onClick={() => setOpen(!open)}
          className="-me-1 inline-flex cursor-pointer items-center gap-1 rounded-md px-1 py-0.5 text-caption-1-medium text-text-secondary tabular-nums outline-none transition-colors duration-150 ease-out hover:bg-background-secondary-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring"
        >
          <span>
            {formatTokens(used)} / {formatTokens(capacity)}{" "}
            <span className="text-caption-1-semibold text-text-primary">({usedPct}%)</span>
          </span>
          <span className="sr-only">{open ? "Hide breakdown" : "Show breakdown"}</span>
          <ChevronDownSmall
            aria-hidden
            className={cx(
              "size-3.5 shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none",
              open && "rotate-180",
            )}
          />
        </button>
      </div>

      <div
        role="meter"
        aria-label={typeof label === "string" ? label : "Context window"}
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-valuenow={used}
        aria-valuetext={`${formatTokens(used)} of ${formatTokens(capacity)} tokens used (${usedPct}%)`}
        className="flex h-1 w-full gap-px overflow-hidden rounded-full bg-chart-track"
      >
        {segments.map((s, i) => (
          <span
            key={s.id}
            onPointerEnter={() => setActive(s.id)}
            onPointerLeave={() => setActive(null)}
            className={cx(
              "h-full shrink-0 first:rounded-s-full",
              "transition-[width,opacity] duration-500 ease-out motion-reduce:transition-none",
              swatch[s.color ?? DEFAULT_SEGMENT_COLOR],
              active !== null && active !== s.id && "opacity-35",
            )}
            style={{ width: `${widths[i] ?? 0}%` }}
          />
        ))}
      </div>

      <div
        id={legendId}
        className={cx(
          "grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out motion-reduce:transition-none",
          // Closed, the -mt-3 cancels the flex gap so the empty row adds no space.
          open ? "grid-rows-[1fr] opacity-100" : "-mt-3 grid-rows-[0fr] opacity-0",
        )}
        inert={!open}
      >
        <ul className="min-h-0 overflow-hidden">
          {segments.map((s, i) => (
            <li
              key={s.id}
              onPointerEnter={() => setActive(s.id)}
              onPointerLeave={() => setActive(null)}
              className={cx(
                "flex items-center gap-2 rounded-md px-1 py-1 text-caption-1-medium transition-[background-color,opacity] duration-150 ease-out",
                active === s.id && "bg-background-secondary-hover",
                active !== null && active !== s.id && "opacity-60",
              )}
            >
              <span aria-hidden className={cx("size-2 shrink-0 rounded-[3px]", swatch[s.color ?? DEFAULT_SEGMENT_COLOR])} />
              <span className="min-w-0 flex-1 truncate text-text-primary">{s.label}</span>
              <span className="shrink-0 text-text-secondary tabular-nums">{formatTokens(s.tokens)}</span>
              <span className="w-10 shrink-0 text-end text-text-tertiary tabular-nums">
                {(widths[i] ?? 0).toFixed(1)}%
              </span>
            </li>
          ))}
          <li className="flex items-center gap-2 px-1 py-1 text-caption-1-medium">
            <span aria-hidden className="size-2 shrink-0 rounded-[3px] bg-chart-track ring-1 ring-border-button-default ring-inset" />
            <span className="min-w-0 flex-1 truncate text-text-secondary">{freeLabel}</span>
            <span className="shrink-0 text-text-secondary tabular-nums">{formatTokens(free)}</span>
            <span className="w-10 shrink-0 text-end text-text-tertiary tabular-nums">
              {percentOf(free, capacity).toFixed(1)}%
            </span>
          </li>
        </ul>
      </div>

      {children != null && children !== false ? (
        <>
          <hr className="border-border-table" />
          {children}
        </>
      ) : null}
    </section>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up: two pieces of React state, pointer handlers on rendered elements, and CSS transitions that end on their own.

**Reduced motion.** Segment width, legend open/close and chevron rotation transitions carry `motion-reduce:transition-none`, so the bar and legend jump straight to their new state. Hover dimming still applies because it carries meaning, not motion.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Sizing segments as a share of `used` instead of `capacity`. The bar then always looks full and the free space disappears.
- Rendering a separate "free" segment. The track already is the free space, and an extra element breaks the 1px gap rhythm at the end.
- Hiding the collapsed legend with `height: 0` alone. Its rows stay focusable and announced; `inert` on the wrapper is what removes them.
- Animating `flex-grow` instead of `width`. Grow values are relative to each other, so one segment changing reflows all the others in the same frame.

## Notes

- `formatTokensCompact` is exported so surrounding UI (a composer badge, a toast) can print counts the same way.
- Colours come from the kit chart palette (`bg-chart-1…9`) plus `bg-accent-500` for the leading blue, so both themes are handled by the token sheet.

## Definition of done

The header reads "820k / 1M (82%)" for the demo data and the bar fills 82% of its track in seven colours with 1px gaps. Pressing the header toggle flips aria-expanded and shows or hides the legend; when hidden, Tab skips its rows. Hovering "System tools" in the legend dims every other segment. "Add a turn" grows the blue segment and the totals; "Compact" shrinks it back with an eased width change.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
