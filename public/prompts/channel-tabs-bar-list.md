# Build: Channel Tabs Bar List

A grey card with the kit Tabs on top and an uppercase metric caption on the right. Each tab holds a ranked list where every row sits on a light blue bar sized against the leader, with an optional icon, the label and the row's share of the tab total. Five rows show by default; the last one fades and a chevron button reveals the rest.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A tabbed card of ranked horizontal bars: switch channels, campaigns or pages and each row shows its share of sessions.

- Category: display
- Runtime cost: css
- Dependencies: @remixicon/react@^4.9.0, react-aria-components@^1.22.1

## How it works

1. Render the kit `Tabs`, `TabList` and one `TabPanel` per tab, selection controlled (`selectedKey`) or uncontrolled (`defaultSelectedKey`, else the first tab); React Aria gives the arrow-key roving focus and `aria-selected`.
2. Rank each tab with `rankBars`: sort by value descending (label as tie-break), take `share = value / total` for the percent label and `width = value / max × 100` for the bar, so the leader always spans the row and the rest read as fractions of it.
3. Draw each row as a `relative isolate` list item with an absolutely positioned bar behind the content (`-z-10`), its width set through a `--bar` custom property and `w-(--bar)`, so the class can also carry `starting:w-0` and the bar grows from zero whenever a panel mounts.
4. Slice to `limit` rows while collapsed, fade the last visible row to 45% and show a small kit `IconButton` with `aria-expanded` and `aria-controls` pointing at the list; expanding rotates its chevron 180° and lists every row.
5. Show the metric caption beside the tabs from `@sm` (24rem), sharing the tab bar's bottom border, and as its own right-aligned line above the list in narrower containers so three tabs still fit at 300px.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `row height = 36px (h-9), 4px gap`
  Matches the 14px body line with room for the bar to read as a block rather than a stripe.
- `limit = 5`
  Five ranked rows cover most of the traffic; the long tail stays one click away.
- `bar grow = 500ms ease-out from 0 via @starting-style`
  Long enough to read the ranking settle when switching tabs, short enough not to delay reading values.
- `teaser opacity = 45%`
  Signals that more rows follow the fifth without hiding its value.

## API

```ts
type BarListItem = { id: string; label: string; value: number; icon?: ComponentType }
type BarListTab = { id: string; label: string; items: BarListItem[] }
function ChannelTabsBarList(props: ChannelTabsBarListProps): JSX.Element
function rankBars(items: BarListItem[]): (BarListItem & { share: number; width: number })[]
```

- `tabs: BarListTab[]`
  One tab per grouping, each with its rows in any order.
- `selectedKey / defaultSelectedKey / onSelectionChange: string` — default `first tab id`
  Selected tab, controlled or uncontrolled.
- `metricLabel: string` — default `"Sessions"`
  Caption for the value column and part of each list's accessible name.
- `display: "share" | "value"` — default `"share"`
  Percent of the tab total or the raw number.
- `limit: number` — default `5`
  Rows shown before the expand button.
- `locale: string` — default `"en-US"`
  Locale for numbers and percents.
- `aria-label: string` — default `"Traffic sources"`
  Accessible name of the card and the tab list.
- `className: string`
  Merged onto the card.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/** Sort largest first and size every bar against the leader, so the top row
 *  always spans the track and the rest read as fractions of it. Shares are
 *  of the tab total and drive the percent labels. */
export function rankBars(items: BarListItem[]): RankedRow[] {
  const total = items.reduce((sum, it) => sum + Math.max(0, it.value), 0);
  const max = items.reduce((m, it) => Math.max(m, it.value), 0);
  return [...items]
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .map((it) => ({
      ...it,
      share: total > 0 ? Math.max(0, it.value) / total : 0,
      width: max > 0 ? (Math.max(0, it.value) / max) * 100 : 0,
    }));
}

function BarRows({
  rows,
  limit,
  display,
  label,
  number,
  percent,
}: {
  rows: RankedRow[];
  limit: number;
  display: "share" | "value";
  label: string;
  number: Intl.NumberFormat;
  percent: Intl.NumberFormat;
}) {
  const listId = useId();
  const [expanded, setExpanded] = useState(false);
  const hidden = Math.max(0, rows.length - limit);
  const shown = expanded || hidden === 0 ? rows : rows.slice(0, limit);
  return (
    <div className="flex flex-col gap-2">
      <ol id={listId} aria-label={label} className="flex flex-col gap-1">
        {shown.map((row, i) => {
          const Icon = row.icon;
          // The last collapsed row fades out to say "the list goes on".
          const teaser = !expanded && hidden > 0 && i === shown.length - 1;
          return (
            <li key={row.id} className={cx("relative isolate h-9", teaser && "opacity-45")}>
              <span
                aria-hidden
                className="absolute inset-y-0 start-0 -z-10 w-(--bar) rounded-lg bg-status-blue-background transition-[width] duration-500 ease-out starting:w-0 motion-reduce:transition-none"
                style={{ "--bar": `${row.width.toFixed(2)}%` } as CSSProperties}
              />
              <span className="flex h-full items-center justify-between gap-3 px-2.5">
                <span className="flex min-w-0 items-center gap-2">
                  {Icon ? <Icon className="size-4 shrink-0 text-foreground-icon-secondary" aria-hidden /> : null}
                  <span className="truncate text-body-medium text-text-primary">{row.label}</span>
                </span>
                <span className="shrink-0 text-body-medium text-text-secondary tabular-nums">
                  {display === "share" ? percent.format(row.share) : number.format(row.value)}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      {hidden > 0 ? (
        <IconButton
          icon={RiArrowDownSLine}
          size="small"
          aria-label={expanded ? "Show fewer" : `Show ${hidden} more`}
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((v) => !v)}
          className={cx(
            "self-center [&>svg]:transition-transform [&>svg]:duration-200 [&>svg]:ease-out motion-reduce:[&>svg]:transition-none",
            expanded && "[&>svg]:rotate-180",
          )}
        />
      ) : null}
    </div>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The component adds no timers or listeners. The kit TabList disconnects its underline ResizeObserver on unmount.

**Reduced motion.** The bars grow over 500ms, the chevron rotates over 200ms and the kit tab underline slides; the bar and chevron carry `motion-reduce:transition-none`, so under `prefers-reduced-motion: reduce` they appear at full width and flip instantly.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Size bars against the largest value, not the total. Against the total, a 39% leader fills only 39% of the row and the list looks empty.
- Set the width through a CSS variable and a class. An inline `width` style beats the `starting:w-0` class, so the bars would never animate in.
- The bars are `aria-hidden`; the written percent carries the value, so each row reads once as "Google Ads 39%".

## Notes

- Pass `display="value"` to show raw session counts instead of shares.
- Inactive panels unmount (React Aria default), so the expanded state resets per tab and the bars regrow on every switch.
- `rankBars` is exported for reuse in other ranked lists.

## Definition of done

The demo opens on Channels with Google Ads 39%, Meta 25%, X Ads 14%, LinkedIn 8% and a faded Email 7%, each bar sized against Google Ads. Clicking the chevron shows TikTok 4% and Referral 3% and sets aria-expanded. Choosing Campaigns ranks "Free trial push · US" first with five rows and a "Show 1 more" button. At 360px the three tabs fit and the Sessions caption moves above the list. Light and dark both read correctly.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
