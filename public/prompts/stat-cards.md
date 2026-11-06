# Build: Stat Cards

The KPI row at the top of a dashboard, driven by an array of `Stat` objects. `variant="plain"` is a compact 132px card with an icon tile, a label, the value and a delta `Chip`. `variant="footer"` adds a tinted gradient icon tile, an optional info tooltip, a display-size value and an inner footer band with a comparison caption and a delta pill. The grid reflows from one or two columns up to four, and `count` and `columns` cut it down for narrower hosts.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A responsive row of KPI cards in two looks: a compact tile with a delta chip, or a gradient icon tile over a caption band and delta pill.

- Category: display
- Runtime cost: css
- Dependencies: @remixicon/react@^4.9.0, react-aria-components@^1.22.1

## How it works

1. `StatCards` picks `stats`, or the demo set that matches the variant (`DEFAULT_STATS` or `DEFAULT_FOOTER_STATS`), slices it to `count` and renders one card per entry keyed by `label`. The wrapper is a `grid w-full gap-4`.
2. Columns are set per variant. `columns={1}` is always `grid-cols-1`. Otherwise plain cards start at `grid-cols-2` and footer cards at `grid-cols-1 sm:grid-cols-2`, because a display-size value does not fit two-up on a phone. With `columns={4}` plain cards go four-up at `lg` and footer cards at `xl`.
3. Delta colour is data, not maths. Each stat carries `deltaColor: "lime" | "rose" | "neutral"`, and `DELTA_STYLES` maps it to a glyph (`RiArrowUpCircleFill`, `RiArrowDownCircleFill`, `RiIndeterminateCircleFill`), a text colour and a pill background. A rise that is bad news, such as refunds going up, can therefore read rose.
4. The plain card is a `section` with `h-[132px]`, `justify-between`, `rounded-2xl`, `bg-background-secondary-default` and `p-4`. The icon sits in a `bg-stat-card-icon-background` tile, the value is `text-title-1-medium`, and the delta is a `Chip variant="bold"` in the stat's colour. The value and chip row is `flex-wrap`, so a narrow card drops the chip below the number instead of overflowing.
5. The footer card is a `p-2` section in three parts. A header holds a 40px `rounded-2lg` icon tile filled with `bg-linear-to-b` from the `TILE_TONES[tone]` stops (blue by default), with a white glyph. The body holds a truncated label over a `text-display-4-medium tabular-nums` value. The band is an inner tile (`bg-background-inner-default shadow-card rounded-2lg`, `mt-auto`) holding the caption (default "From last month") and the `DeltaPill`.
6. When `hint` is set, `StatHint` renders a bare 20px info button inside React Aria's `TooltipTrigger` (200ms delay) wrapped in `Focusable`. The open state is controlled, so the tooltip opens on hover and focus as usual and the button's `onClick` also toggles it, because a glyph that small gets tapped. The button is labelled "About {label}".
7. Every subcomponent returns its JSX through `useTemplateCopy()`. With no `TemplateCopyProvider` this returns the node unchanged. With one, labels, captions and hints are translated while values and IDs are left alone.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `plain card height = h-[132px]`
  Fixed so a row of cards lines up whether or not a chip wraps. `justify-between` pins the icon to the top and the label and value to the bottom, so the row reads as one band across the dashboard.
- `footer icon tile = size-10 rounded-2lg, gradient from-*-500 to-*-600 (orange and sky use 400 to 500)`
  A top-to-bottom two-step gradient gives the tile a lit edge without an image. The tones are fixed Tailwind palette stops rather than theme tokens, so the tile reads the same on light and dark surfaces.
- `tooltip delay = 200ms`
  Long enough that sweeping the pointer across a row of cards does not flash four tooltips, short enough that a deliberate hover feels immediate. A click skips the delay altogether.
- `breakpoints = plain lg:grid-cols-4, footer sm:grid-cols-2 xl:grid-cols-4`
  The footer card's `display-4` value needs roughly a third more width than the plain card's `title-1`, so it reaches four-up one breakpoint later and stays single-column below `sm`.

## API

```ts
function StatCards(props?: { variant?: "plain" | "footer"; stats?: Stat[]; count?: number; columns?: 1 | 2 | 4; className?: string }): JSX.Element
type Stat = { icon: IconComponent; label: string; value: string; delta: string; deltaColor: "lime" | "rose" | "neutral"; tone?: StatTone; caption?: string; hint?: string }
type StatTone = "blue" | "orange" | "purple" | "pink" | "sky" | "emerald"
```

- `variant: "plain" | "footer"` — default `"plain"`
  Compact tile with a delta chip, or the gradient-tile card with a caption band and delta pill.
- `stats: Stat[]`
  Cards to render. Defaults to demo metrics that match the variant.
- `count: number`
  Render only the first `count` stats.
- `columns: 1 | 2 | 4` — default `4`
  Column count at the widest breakpoint. `2` stays two-up, `1` pins a single column at every width.
- `Stat.deltaColor: "lime" | "rose" | "neutral"`
  Picks the chip or pill colour and the up, down or flat glyph.
- `Stat.tone: StatTone` — default `"blue"`
  Footer variant only: the icon tile gradient.
- `Stat.hint: string`
  Footer variant only: adds an info button whose tooltip shows this text.
- `Stat.caption: string` — default `"From last month"`
  Footer variant only: the comparison caption in the band.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
function FooterStatCard({ stat }: { stat: Stat }) {
  const localize = useTemplateCopy();
  return localize((
    <section className="flex min-w-0 flex-col rounded-2xl bg-background-secondary-default p-2">
      {/* Icon tile + optional info glyph, both hanging from the same top inset */}
      <div className="flex w-full items-start justify-between gap-2.5 p-2">
        <span
          className={cx(
            "flex size-10 shrink-0 items-center justify-center rounded-2lg bg-linear-to-b",
            TILE_TONES[stat.tone ?? "blue"],
          )}
        >
          <stat.icon className="size-5 shrink-0 text-white" aria-hidden />
        </span>
        {stat.hint && <StatHint label={stat.label} hint={stat.hint} />}
      </div>

      {/* Label sits directly over the number, as on the plain cards */}
      <div className="flex flex-col gap-0.5 px-2 pt-2.5 pb-3.5">
        <p className="truncate text-body-medium text-text-secondary">{stat.label}</p>
        <p className="text-display-4-medium whitespace-nowrap text-text-primary tabular-nums">
          {stat.value}
        </p>
      </div>

      {/* Footer band: comparison caption + delta pill on an inner tile */}
      <div className="mt-auto flex w-full items-center justify-between gap-2 rounded-2lg bg-background-inner-default py-1.5 pe-1.5 ps-2.5 shadow-card">
        <p className="truncate text-body-regular text-text-secondary">
          {stat.caption ?? "From last month"}
        </p>
        <DeltaPill delta={stat.delta} deltaColor={stat.deltaColor} />
      </div>
    </section>
  ));
}

export function StatCards({
  variant = "plain",
  stats,
  count,
  columns = 4,
  className,
}: {
  variant?: StatCardsVariant;
  /** KPI cards to render; defaults to demo metrics matching the variant. */
  stats?: Stat[];
  /** How many KPI cards to render (from the start of the list). */
  count?: number;
  /** Columns at the widest breakpoint - 2 keeps the grid two-up for
   *  narrower hosts (docs previews, split layouts), 1 pins a single
   *  column at every width. */
  columns?: 1 | 2 | 4;
  className?: string;
} = {}) {
  const localize = useTemplateCopy();
  const items =
    stats ?? (variant === "footer" ? DEFAULT_FOOTER_STATS : DEFAULT_STATS);
  return localize((
    <div
      className={cx(
        "grid w-full gap-4",
        // The footer cards carry a display-size value, so they go one per
        // row on phones where the plain cards still fit two up.
        columns === 1
          ? "grid-cols-1"
          : variant === "footer"
            ? "grid-cols-1 sm:grid-cols-2"
            : "grid-cols-2",
        columns === 4 && (variant === "footer" ? "xl:grid-cols-4" : "lg:grid-cols-4"),
        className,
      )}
    >
      {items.slice(0, count ?? items.length).map((stat) =>
        variant === "footer" ? (
          <FooterStatCard key={stat.label} stat={stat} />
        ) : (
          <PlainStatCard key={stat.label} stat={stat} />
        ),
      )}
    </div>
  ));
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up in the cards. The tooltip is a React Aria overlay, and React Aria removes its portal and listeners when it closes or unmounts.

**Reduced motion.** The cards do not move. The only motion is the tooltip's 200ms blur and scale-in, a CSS transition on React Aria's `data-entering` and `data-exiting` states. It is short and does not travel, so it is kept under reduced motion.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Deriving the delta colour from the sign of the number. Whether a change is good depends on the metric. Pass `deltaColor` with the data, as the default refunds card does.
- Removing `Focusable` around the info button. React Aria's `TooltipTrigger` hands its hover and focus handlers to its child through a context, and a plain `<button>` does not read that context, so neither hover nor focus would open the tooltip.
- Making the tooltip hover-only. The info glyph is 20px and touch users tap it, which is why `onClick` toggles the controlled `open` state as well.
- Giving cards a fixed width so the values line up. The grid sizes them, and the values use `tabular-nums`. A fixed width clips "$152,313.92" at the `display-4` size.
- Keying cards by array index. They are keyed by `label`, so a reordered `stats` array keeps tooltip state with the right card. Labels must be unique.

## Notes

- `count` slices from the start of the list. Together with `columns={1}` it makes a single-card preview or sidebar summary.
- The tone palette (`blue`, `orange`, `purple`, `pink`, `sky`, `emerald`) only affects the footer variant. The plain variant always uses the neutral `stat-card-icon-background` tile.

## Definition of done

The footer variant shows a blue revenue card and an orange orders card side by side, each with a white glyph on a gradient tile, a large tabular value and a band reading "From last month" with a lime up-arrow pill. Hovering or clicking the info glyph opens a tooltip with the hint after about 200ms. The plain variant shows four 132px cards whose chips are lime, rose and neutral. Below `sm` the footer cards stack in one column while the plain cards stay two-up.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
