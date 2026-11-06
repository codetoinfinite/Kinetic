# Build: Contributions Card

A grey dashboard card with a yearly total, a change chip and four stat tiles above a contributions calendar: one rounded cell per day, seven weekday rows by up to 53 week columns, coloured in five intensity steps of an accent family. Weekly, Monthly and Yearly tabs regroup the same counts into days, weeks of each month or whole months across years, at the same grid height. Hovering a cell or moving to it with the arrow keys rings it and shows a tooltip with the count and the date. Everything is a CSS grid of spans, with no chart library and no Date objects.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A GitHub-style contributions card: a week by weekday calendar in five intensity steps, stat tiles, month labels and nine accent palettes.

- Category: display
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. Counts are plain arrays, one number per day of the year. Calendar positions come from integer arithmetic: Sakamoto's formula gives the weekday of Jan 1, a month-length table gives each day its month and date, and a day at index i sits in row `(offset + i) % 7` and column `floor((offset + i) / 7)`. Without `Date` there is no time zone, so the server and the client always agree.
2. The view picks a matrix of cells. Weekly is 7 rows by `ceil((offset + days) / 7)` weeks, with `null` placeholders before Jan 1 and after Dec 31. Monthly sums days 1–7, 8–14, 15–21, 22–28 and 29–31 of each month into 5 rows by 12 columns. Yearly sums each month into one row per year.
3. A cell's tier is 0 for no activity, else `ceil((count / peak) ** 0.7 * 5)` clamped to 1–5, where peak is the busiest cell in the current view. The 0.7 power lifts the many quiet days off tier 1 so a single spike does not wash the year out. The cell carries it as `data-tier`, and the theme's `.contributions-grid[data-accent]` rules map tiers 0–5 to the neutral chart colour and the 200, 400, 500, 600 and 700 shades of the accent (950 to 500 in dark mode). Swapping `accent` recolours the whole grid with one attribute.
4. A ResizeObserver measures the grid. The weekly view keeps the most recent weeks that fit at 8px per cell plus a 3px gap, so a phone shows about half a year and a 640px grid shows all 53 weeks. Rows are as tall as the weekly cells are wide, clamped to 8–14px, and every view shares that seven-row height so switching tabs never resizes the card.
5. Month labels sit in an extra grid row with `grid-column-start` set to the week the month begins in. In the weekly view a label is dropped when the next month starts less than 3 columns later.
6. Cells pop in with `.animate-cell-pop`, delayed by `min(k * 9 + r * 12, 520)` ms so the sweep runs left to right. The grid is keyed by the view, so each tab switch replays it.
7. The grid is one tab stop (`role="group"`). Arrow keys move the active cell and skip placeholders, Home and End jump to the first and last day, and Escape, blur or leaving with the pointer clears it. The active cell gets a 2px outline and `z-10`, and holds a tooltip with the count and a label such as "Wed, Jan 1, 2025". A polite live line under the grid repeats it for screen readers.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `MIN_CELL / GAP = 8px / 3px`
  The smallest cell that still reads as a square with a visible gap. At this pitch a typical 640px card fits all 53 weeks.
- `tiers = 0 + 5 steps, ceil((count / peak)^0.7 × 5)`
  Empty days stay neutral grey, and any activity at all lands in at least tier 1, so a single contribution is never invisible.
- `ROW_HEIGHT = 8–14px`
  Weekly rows track the cell width so cells stay square; the clamp stops a wide card from growing a tall calendar.
- `label spacing = ≥ 3 weeks`
  A month that starts within two columns of the next would print its label on top of the neighbour, as happens when a year starts on a Saturday.

## API

```ts
function ContributionsCard(props?: ContributionsCardProps): JSX.Element
type ContributionYear = { year: number; counts: number[] }
type ContributionAccent = "emerald" | "green" | "teal" | "cyan" | "blue" | "indigo" | "violet" | "rose" | "amber"
type ContributionView = "weekly" | "monthly" | "yearly"
const CONTRIBUTION_YEARS: ContributionYear[]
```

- `title: string` — default `"Contributions this year"`
  Header label.
- `years: ContributionYear[]` — default `CONTRIBUTION_YEARS`
  Daily counts per year, oldest first. The last year is the one on show; the Yearly view lists them all.
- `accent: ContributionAccent` — default `"violet"`
  Accent family for tiers 1–5.
- `change: number` — default `change against the previous year`
  Percent for the chip.
- `stats: ContributionStat[] | false` — default `derived tiles`
  Tiles under the header, or false to hide them.
- `view: ContributionView`
  Controlled granularity.
- `defaultView: ContributionView` — default `"weekly"`
  Uncontrolled starting granularity.
- `onViewChange: (view: ContributionView) => void`
  Called when a tab is picked.
- `unit: [string, string]` — default `["contribution", "contributions"]`
  Singular and plural noun for the tooltip.
- `className: string`
  Merged onto the card section.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const summary = useMemo(() => {
  const total = current.counts.reduce((a, b) => a + b, 0);
  const previous = years[years.length - 2];
  const prevTotal = previous ? previous.counts.reduce((a, b) => a + b, 0) : 0;
  let best = 0;
  let bestAt = 0;
  let streak = 0;
  let longest = 0;
  current.counts.forEach((n, i) => {
    if (n > best) [best, bestAt] = [n, i];
    streak = n > 0 ? streak + 1 : 0;
    longest = Math.max(longest, streak);
  });
  const { m, d } = monthDay(current.year, bestAt);
  const derived: ContributionStat[] = [
    { label: "Active days", value: String(current.counts.filter((n) => n > 0).length) },
    { label: `Best day · ${MONTHS[m]} ${d}`, value: String(best) },
    { label: "Longest streak", value: `${longest} days` },
    { label: "Daily average", value: numberFormat.format(total / Math.max(1, current.counts.length)) },
  ];
  return { total, change: prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 1000) / 10 : undefined, derived };
}, [current, years]);

const matrix = useMemo(
  () => (view === "weekly" ? weeklyMatrix(current) : view === "monthly" ? monthlyMatrix(current) : yearlyMatrix(years)),
  [view, current, years],
);

// Weekly view keeps the most recent weeks that fit at MIN_CELL; the other views always fit.
const allCols = matrix.rows[0]?.length ?? 0;
const weeks = Math.ceil((weekday(current.year, 1, 1) + (isLeap(current.year) ? 366 : 365)) / 7);
const weekCols = width > 0 ? Math.max(1, Math.min(weeks, Math.floor((width + GAP) / (MIN_CELL + GAP)))) : weeks;
const cols = view === "weekly" ? weekCols : allCols;
const first = allCols - cols;
// Every view shares the height of seven square weekly rows, so switching never resizes the card.
const weekCell = width > 0 ? (width - (weekCols - 1) * GAP) / weekCols : 11;
const weekRow = Math.max(ROW_HEIGHT[0], Math.min(ROW_HEIGHT[1], weekCell));
const gridHeight = 7 * weekRow + 6 * GAP;
const rowHeight = (gridHeight - (matrix.rows.length - 1) * GAP) / matrix.rows.length;

const peak = Math.max(1, ...matrix.rows.flat().map((cell) => cell?.count ?? 0));
const tierOf = (count: number) => (count <= 0 ? 0 : Math.min(5, Math.max(1, Math.ceil((count / peak) ** 0.7 * 5))));
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `useResizeObserver` disconnects its observer on unmount. Everything else is CSS and React event props, so nothing else needs tearing down.

**Reduced motion.** Under `prefers-reduced-motion: reduce` the cells appear at once (`motion-reduce:animate-none` on `.animate-cell-pop`, which the theme also disables), and the tab colour change is instant.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Building the calendar with `new Date(year, month, day)`. Local time zones and DST shift days across the server and the client and cause hydration mismatches; integer weekday arithmetic is exact everywhere.
- Scaling tiers by the year's peak in every view. A month total is about thirty times a day, so each view needs its own peak or the Monthly view goes solid dark.
- Leaving the hovered cell at the default stacking order. The pop animation gives every cell its own stacking context, so later cells paint over the tooltip unless the active cell gets `z-10`.

## Notes

- `CONTRIBUTION_YEARS` (2023–2025, seeded with `createRng`) and the `ContributionYear`, `ContributionAccent`, `ContributionView` and `ContributionStat` types are exported.
- Pass `stats` to replace the derived tiles (Active days, Best day, Longest streak, Daily average), or `stats={false}` to hide them.
- The accent families come from the theme: emerald, green, teal, cyan, blue, indigo, violet, rose and amber.

## Definition of done

The default card reads "Contributions this year", "529" and a lime "+12.6%" chip, four stat tiles (191 active days, best day 10 on Jun 26, a 14-day streak, 1.4 a day), an "Activity" row with Weekly, Monthly and Yearly tabs, and a violet 7-row calendar with Jan–Dec labels and a Less → More legend. Hovering a cell rings it and shows a count and a date such as "Wed, Jan 1, 2025". Monthly shows 5 × 12 week cells and Yearly shows three year rows. Picking another swatch in the demo recolours the grid and the legend.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
