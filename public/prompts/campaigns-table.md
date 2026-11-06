# Build: Campaigns Table

A bordered card with a result count, a status segmented control and a channel select over the kit Table. Each row shows the campaign and its objective, the channel with its brand icon, a delivery status pill with a coloured dot, spend against budget as a figure, a percent and a thin progress bar, the click-through rate and the last edit date. Every column sorts through React Aria, and the kit Pagination pages the result.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A marketing campaigns table with channel icons, delivery status, budget-spent progress bars, CTR and sortable columns.

- Category: display
- Runtime cost: dom
- Dependencies: @internationalized/date@^3.12.4, @remixicon/react@^4.9.0, react-aria-components@^1.22.1

## How it works

1. Keep the sort in a React Aria `SortDescriptor` (controlled or local, newest edit first) and hand it to the kit `Table`; every column has `allowsSorting`, so a header click or Enter toggles it and sets `aria-sort`.
2. Derive rows with `sortCampaigns`: filter by status and channel, then compare per column (channel by label, status by rank active, paused, draft, budget by `spent / budget`, dates as ISO strings) times -1 for descending, falling back to the id so ties keep their order.
3. Compute CTR as `clicks / impressions` and return `null` with no impressions; the CTR sort puts null rows last in both directions instead of letting the sign flip them to the top.
4. Draw the budget cell as spend "of" budget, a percent, and the kit `ProgressTrack` at `size="sm"` with the percentage clamped to 100; over budget the fill switches to chart-3 and the percent to the rose status text, so 108% still reads at a glance.
5. Clamp the stored page to the page count and send every sort or filter change back to page 1; dates go through `parseDate(iso).toDate("UTC")` and a UTC formatter so server and client agree.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `pageSize = 6 (demo uses 5)`
  Two-line rows are about 56px; six plus the toolbar and pager keep the card on one dashboard fold.
- `table min width = 860px`
  The budget cell needs about 200px for "$30,884 of $40,000"; below this the kit Table wrapper scrolls instead of squeezing.
- `status rank = active 0, paused 1, draft 2`
  Status sorts by delivery stage, not alphabetically.
- `CTR precision = 2 decimals`
  Ad CTRs mostly sit between 0.5% and 8%, where a whole percent hides real differences.

## API

```ts
type Campaign = { id: string; name: string; channel: "google" | "meta" | "x" | "linkedin" | "email" | "tiktok"; objective: string; status: "active" | "paused" | "draft"; budget: number; spent: number; impressions: number; clicks: number; updated: string }
function CampaignsTable(props: CampaignsTableProps): JSX.Element
function sortCampaigns(rows: Campaign[], sort: SortDescriptor, status?: CampaignStatus | "all", channel?: CampaignChannel | "all"): Campaign[]
```

- `campaigns: Campaign[]`
  All rows; filtering, sorting and paging happen inside.
- `pageSize: number` — default `6`
  Rows per page.
- `sortDescriptor / defaultSortDescriptor / onSortChange: SortDescriptor` — default `{ column: "updated", direction: "descending" }`
  Sort state, controlled or uncontrolled. Columns: name, channel, status, budget, ctr, updated.
- `currency: string` — default `"USD"`
  ISO 4217 code for spend and budget.
- `locale: string` — default `"en-US"`
  Locale for money, percents and dates.
- `label: string` — default `"Campaigns"`
  Accessible name of the card and the table.
- `className: string`
  Merged onto the card.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/** Click-through rate as a fraction, or null before the first impression. */
export function ctrOf(c: Pick<Campaign, "clicks" | "impressions">): number | null {
  return c.impressions > 0 ? c.clicks / c.impressions : null;
}

/** Share of budget spent; a zero budget counts as nothing spent. */
export function spentRatio(c: Pick<Campaign, "spent" | "budget">): number {
  return c.budget > 0 ? c.spent / c.budget : 0;
}

function compare(a: Campaign, b: Campaign, column: Key): number {
  switch (column) {
    case "name":
      return a.name.localeCompare(b.name);
    case "channel":
      return CHANNEL[a.channel].label.localeCompare(CHANNEL[b.channel].label);
    case "status":
      return STATUS[a.status].rank - STATUS[b.status].rank;
    case "budget":
      return spentRatio(a) - spentRatio(b);
    case "updated":
      return a.updated < b.updated ? -1 : a.updated > b.updated ? 1 : 0;
    default:
      return 0;
  }
}

/** Filter by status and channel, then sort. CTR is special-cased so rows
 *  without impressions stay at the bottom in both directions; every other
 *  tie falls back to the id for a stable order across pages. */
export function sortCampaigns(
  rows: Campaign[],
  sort: SortDescriptor,
  status: CampaignStatus | "all" = "all",
  channel: CampaignChannel | "all" = "all",
): Campaign[] {
  const sign = sort.direction === "descending" ? -1 : 1;
  return rows
    .filter((c) => (status === "all" || c.status === status) && (channel === "all" || c.channel === channel))
    .sort((a, b) => {
      if (sort.column === "ctr") {
        const x = ctrOf(a);
        const y = ctrOf(b);
        if (x === null || y === null) return x === y ? a.id.localeCompare(b.id) : x === null ? 1 : -1;
        return sign * (x - y) || a.id.localeCompare(b.id);
      }
      return sign * compare(a, b, sort.column) || a.id.localeCompare(b.id);
    });
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The component adds no timers or listeners. The kit SegmentedControl and Pagination disconnect their ResizeObservers on unmount.

**Reduced motion.** The sort chevron rotates over 150ms and the kit ProgressTrack slides its fill over 500ms; both carry `motion-reduce:transition-none`, so under `prefers-reduced-motion: reduce` they change instantly.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not multiply null CTRs by the sort sign. Treat "no impressions" as missing and pin it last, or drafts jump to the top of every descending CTR sort.
- Clamp the bar fill to 100% but keep the true percent in the text, otherwise an overspent campaign looks exactly like a fully spent one.
- The progress bar is decorative next to the written figures, so it is `aria-hidden`; giving it a role would make screen readers announce each row twice.

## Notes

- `ctrOf`, `spentRatio` and `sortCampaigns` are exported for server-side sorting with the same rules.
- The status pill is static. Swap it for the kit Select to edit delivery inline.
- Spend and budget take whole currency units; amounts are formatted without decimals.

## Definition of done

The demo card reads "16 campaigns", newest edit first with "Founder story video · US" on top. Sorting CTR descending puts "Brand search · US" (7.50%) first and ascending puts "Creator collab · EU" (0.80%) first, with the three drafts showing "–" at the bottom both ways. "Newsletter promo · EU" shows 108% in rose with a full pink bar. Choosing "Draft" leaves 3 rows; choosing the Meta channel leaves 4 and hides the pager. At 360px the table scrolls inside the card. Light and dark both read correctly.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
