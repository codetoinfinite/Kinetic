# Build: Bar List Card

An analytics breakdown card: each row is a label and icon sitting on a pale bar whose width is the item against the largest one, with the metric on the right. Underline tabs switch between lists, and the caption doubles as a switch between shares of the list total and raw counts. Lists longer than `limit` end in a faded peek row with a small chevron pill that unfolds the rest. Hovering a row brings in the other number.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Ranked analytics rows on proportional bars behind underline tabs, with a share / count switch and a pill that unfolds long lists.

- Category: display
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0, react-aria-components@^1.22.1

## How it works

1. Each list is filtered to finite values of 0 or more, then sorted high to low. Every item gets `share = value / total` and `width = value / max`, so the top row always spans the full bar and hidden rows never change the visible ones.
2. A bar is an absolutely positioned span behind the row content, `width: width × 100%` with an 8px minimum so a tiny item still shows a rounded nub. `useGrown` holds the width at 0 for two animation frames after a list mounts, then a 500ms ease-out width transition grows every bar to its size.
3. The kit `Tabs` render one `TabPanel` per list. Only the selected panel is mounted, so switching tabs mounts the new list and its bars grow in. The tab strip sits in a sideways scroller with a 24px fade on the right, and `-mb-px` lays the blue underline over the header divider.
4. Rows past `limit` live in a second list inside a clipping box. Collapsed, the box is 30px tall: a 4px gap plus 26px of the first hidden row, masked from opaque to transparent, and `inert` so the hidden rows are neither focusable nor announced.
5. The chevron pill toggles the box between that peek and `hidden rows × 40px + 26px`, over a 300ms height transition. The extra 26px leaves a band for the pill under the last row, and the chevron turns 180°. Only one list is open at a time, and switching tabs folds it again.
6. The caption button flips the metric between `share` and `value`; its % / # marker shows which is live. Each row's number is keyed by the metric, so it replays the kit's `animate-number-fade` on every switch. On row hover the other number (count or share) fades in beside it in tertiary text.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `row = 36px tall (h-9), 4px gap, 8px radius`
  Gives the 40px pitch of the preview and lets the unfold height be computed exactly instead of measured.
- `PEEK = 30px`
  Shows enough of the next row (its icon, label and number) to read as "there is more" under the fade, while the pill sits on top of it.
- `PILL_SPACE = 26px`
  Room under the last row for the 18px pill when the list is open, so the pill never covers a number.
- `BAR_MIN = 8px`
  One radius wide: a 1% item still shows a rounded nub instead of a hairline.
- `grow = 500ms ease-out width, after two animation frames`
  Two frames guarantee the zero width is painted before the transition starts, even when a click mounts the panel synchronously.
- `unfold = 300ms ease-out height`
  Fast enough to follow the click, long enough to show the list growing rather than jumping.

## API

```ts
function BarListCard(props: { tabs?: BarListTab[]; items?: BarListItem[]; title?: string; tab?: string; defaultTab?: string; onTabChange?: (id: string) => void; metricLabel?: string; metric?: "share" | "value"; defaultMetric?: "share" | "value"; onMetricChange?: (metric: "share" | "value") => void; metricToggle?: boolean; limit?: number; mono?: boolean; formatValue?: (value: number) => string; className?: string }): JSX.Element
type BarListItem = { label: string; value: number; icon?: ReactNode }
type BarListTab = { id: string; label: string; items: BarListItem[] }
```

- `tabs: BarListTab[]` — default `TRAFFIC_TABS`
  Lists behind underline tabs. Ignored when `items` is set.
- `items: BarListItem[]`
  One list without tabs, headed by `title`.
- `title: string` — default `"Breakdown" (tabs) or `metricLabel` (items)`
  Header of a single list; the card's accessible name in both modes.
- `tab: string`
  Controlled tab id.
- `defaultTab: string` — default `first tab id`
  Initial tab when uncontrolled.
- `onTabChange: (id: string) => void`
  Called when a tab is selected.
- `metricLabel: string` — default `"Visitors"`
  Uppercase caption over the numbers.
- `metric: "share" | "value"`
  Controlled metric: share of the list total, or the raw value.
- `defaultMetric: "share" | "value"` — default `"share"`
  Initial metric when uncontrolled.
- `onMetricChange: (metric) => void`
  Called when the caption switch flips the metric.
- `metricToggle: boolean` — default `true`
  Turns the caption into a share / count switch with a % / # marker.
- `limit: number` — default `5`
  Rows shown before the rest fold behind the peek row and pill.
- `mono: boolean` — default `false`
  Grey chart-track bars instead of pale blue.
- `formatValue: (value: number) => string` — default `en-US integer`
  Formats counts in the rows and the hover detail.
- `className: string`
  Merged onto the card section.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
function BarRows({
  name,
  items,
  metric,
  metricLabel,
  limit,
  mono,
  expanded,
  onExpandedChange,
  formatValue,
}: RowsProps) {
  const reduced = useReducedMotion();
  const grown = useGrown(reduced);
  const moreId = useId();
  const ranked = useMemo(() => rank(items), [items]);

  const cap = Math.max(1, Math.floor(limit));
  const shown = ranked.slice(0, cap);
  const rest = ranked.slice(cap);
  // Shares are of the tab's total and widths of its largest item, so hidden
  // rows never change the visible bars when they expand.
  const openHeight = rest.length * ROW_PITCH + PILL_SPACE;
  const row = (item: RankedItem) => (
    <BarRow
      key={item.label}
      item={item}
      metric={metric}
      metricLabel={metricLabel}
      mono={mono}
      grown={grown}
      formatValue={formatValue}
    />
  );

  if (ranked.length === 0) {
    return <p className="px-2.5 py-2 text-body-regular text-text-tertiary">No data yet</p>;
  }

  return (
    <div className="flex flex-col">
      <ul aria-label={`${name} by ${metricLabel.toLowerCase()}`} className="flex flex-col gap-1">
        {shown.map(row)}
      </ul>
      {rest.length > 0 && (
        <div className="relative">
          <div
            id={moreId}
            inert={!expanded}
            data-expanded={expanded || undefined}
            className="overflow-hidden transition-[height] duration-300 ease-out motion-reduce:transition-none"
            style={{
              height: expanded ? openHeight : PEEK,
              maskImage: expanded ? undefined : 'linear-gradient(to bottom, black, transparent)',
              WebkitMaskImage: expanded ? undefined : 'linear-gradient(to bottom, black, transparent)',
            }}
          >
            <ul aria-label={`More ${name.toLowerCase()}`} className="flex flex-col gap-1 pt-1">
              {rest.map(row)}
            </ul>
          </div>
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={moreId}
            aria-label={expanded ? 'Show fewer' : `Show ${rest.length} more`}
            onClick={() => onExpandedChange(!expanded)}
            className="absolute bottom-1 left-1/2 flex h-4.5 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-border-button-default bg-background-primary-default text-foreground-icon-primary shadow-xs outline-none transition-colors duration-150 ease-out after:absolute after:-inset-x-2 after:-inset-y-3 hover:bg-background-secondary-default focus-visible:ring-2 focus-visible:ring-border-focus-ring"
          >
            <RiArrowDownSLine
              aria-hidden
              className={cx(
                'size-3.5 transition-transform duration-300 ease-out motion-reduce:transition-none',
                expanded && 'rotate-180',
              )}
            />
          </button>
        </div>
      )}
    </div>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `useGrown` cancels both of its animation frames on unmount, so switching tabs mid-grow leaves nothing running. Everything else is React state and CSS transitions; the kit `TabList` disconnects its own observers.

**Reduced motion.** `useGrown` is skipped, so the bars render at their final widths. The width, height, chevron, colour and fade transitions are removed with `motion-reduce:transition-none`, and the number fade with `motion-reduce:animate-none`. The list unfolds and folds at once.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Scaling bar widths to the list total. The top item of a flat list then stops halfway across, and every bar looks short. Widths are against the largest item; shares are against the total.
- Hiding folded rows with `display: none` or opacity alone. Neither gives the peek, and opacity leaves the rows focusable. A clipping box with a mask, plus `inert`, does both.
- Putting the tab underline inside a scroll container without the strip. The underline would stay put while the tabs scroll. The whole `TabList` (with its underline) scrolls together inside one wrapper.

## Notes

- `TRAFFIC_TABS`, `BarListItem`, `BarListTab` and `BarListMetric` are exported. With neither `tabs` nor `items`, the card shows the traffic sample.
- `icon` takes any 16px node. The sample countries use small text code chips rather than flag images, so the card works offline.
- Pass `metricToggle={false}` for a plain caption, or control `metric` from outside.

## Definition of done

The left card shows Devices, Browsers, Operating systems and Countries tabs and a "VISITORS % #" caption. Under Devices are Desktop 61%, Mobile 31% and Tablet 8%, with blue bars at full, about half and about an eighth of the width. Browsers shows four rows, then a faded Opera row under a chevron pill. Clicking the pill unfolds Opera, Samsung Internet and Other, and the chevron turns up. Back on Devices, clicking the caption changes Desktop to 3,120. Hovering a row shows the other number. The right card lists Pages in views: / 12,480, /pricing 6,210, /components 4,880, then /blog/launch peeking. Mono turns every bar grey.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
