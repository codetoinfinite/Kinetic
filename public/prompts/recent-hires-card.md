# Build: Recent Hires Card

A grey dashboard card listing the newest people to join, newest start date first. The header pairs the title with a team switcher (a kit Dropdown) and shows the headline count with an optional "View all" link. Hires render as white tiles in a grid that goes from one to two columns once the card itself is wider than 28rem, with Previous / Next buttons paging through them. Team and page each work controlled or uncontrolled.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A recent hires card: team switcher, headline count and a paged grid of tiles with initials, status, start date and role.

- Category: display
- Runtime cost: css
- Dependencies: @internationalized/date@^3.12.4, @remixicon/react@^4.9.0

## How it works

1. Resolve `team` and `page` through a small controllable-state helper: a defined prop wins, otherwise local state seeded by `defaultTeam` / `defaultPage` holds the value, and the change callback fires either way.
2. Filter `hires` by `team` (null keeps every team) and sort by `startDate` descending with `CalendarDate.compare`, memoised on `[hires, team]`.
3. Compute `pageCount = max(1, ceil(visible.length / pageSize))` and clamp the requested page into `[1, pageCount]` before slicing, so a team switch that shrinks the list never leaves the grid on an empty page. Choosing a team also resets the page to 1 and closes the menu.
4. Each tile computes `today.compare(startDate)` (days since start) and passes it to `formatRelative`, which defaults to English captions: "Joined today", "Joined yesterday", "N days ago", "A week ago", "N weeks ago", then months; negative values read "Starts tomorrow" / "Starts in N days".
5. Format the start date with a memoised `DateFormatter(locale, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })` over `startDate.toDate("UTC")`, so the server and the browser print the same day whatever the viewer's time zone.
6. Key the `<ul>` on `team-page`, so each page mounts fresh tiles; the tiles enter with a 200ms `starting:` opacity + 4px rise, and `motion-reduce:transition-none` removes it.
7. Announce the visible range ("Showing 5–8 of 12") through an `sr-only` `aria-live="polite"` paragraph, and disable Previous / Next at the ends.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `pageSize = 4`
  Two rows of the two-column grid, the density of the reference card; the card stays short enough to sit beside a chart.
- `two-column breakpoint = @md (container 28rem)`
  A container query, not a viewport one, so the card reflows by its own width when it sits in a narrow dashboard column.
- `tile enter = 200ms ease-out, opacity 0 → 1, translate-y 4px → 0`
  Short enough to read as a page change rather than a show; it runs only on mount through @starting-style.

## API

```ts
type Hire = { id: string; name: string; role: string; startDate: CalendarDate; status: "active" | "onboarding" | "pending"; team?: string; initials?: string; avatarColor?: "neutral" | "blue" | "lime" | "pink" }
function RecentHiresCard(props: RecentHiresCardProps): JSX.Element
```

- `hires: Hire[]`
  Every hire; the card filters, sorts and pages them.
- `today: CalendarDate`
  Reference day for the relative caption under each name.
- `title: string` — default `"Recent hires"`
  Header label and the section's accessible name.
- `total: number | ((visible: Hire[]) => number)`
  Headline number. Defaults to the number of hires in the selected team.
- `teams: { value: string | null; label: string }[]`
  Team switcher options. A `null` value means every team. Omit to hide the switcher.
- `team / defaultTeam / onTeamChange: string | null` — default `null`
  Selected team, controlled or uncontrolled.
- `pageSize: number` — default `4`
  Tiles per page.
- `page / defaultPage / onPageChange: number` — default `1`
  One-based page, controlled or uncontrolled. Out-of-range values are clamped.
- `viewAllHref: string`
  Renders "View all" as a link.
- `onViewAll: () => void`
  Renders "View all" as a button when no href is given.
- `viewAllLabel: string` — default `"View all"`
  Link text.
- `statusLabels: Partial<Record<HireStatus, string>>`
  Overrides the status captions.
- `formatRelative: (daysSinceStart: number) => string` — default `relativeStart`
  Replaces the English relative caption; negative values are future starts.
- `locale: string` — default `"en-US"`
  Locale for the start date and the headline number.
- `className: string`
  Merged onto the card.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
// Filter by team, newest start first, then slice the page. The page is
// clamped rather than trusted, so a team switch that shrinks the list can
// never leave the grid on an empty page.
const visible = useMemo(
  () =>
    hires
      .filter((h) => team == null || h.team === team)
      .sort((a, b) => b.startDate.compare(a.startDate)),
  [hires, team],
);
const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
const current = Math.min(Math.max(1, page), pageCount);
const start = (current - 1) * pageSize;
const slice = visible.slice(start, start + pageSize);
const headline = typeof total === "function" ? total(visible) : (total ?? visible.length);
const teamLabel = teams?.find((t) => t.value === team)?.label ?? teams?.[0]?.label;

const chooseTeam = (next: string | null) => {
  setTeam(next);
  setPage(1);
  setMenuOpen(false);
};
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. There are no timers, listeners or observers; the dropdown popover is managed by react-aria and unmounts with the card.

**Reduced motion.** The only motion is the 200ms tile enter and the chevron flip. Both carry `motion-reduce:transition-none`, so under `prefers-reduced-motion: reduce` pages swap instantly.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Pass `today` from a fixed value (for example `parseDate("2026-11-05")` or a server-computed date). Calling `today(getLocalTimeZone())` during render can differ between server and client and cause a hydration mismatch.
- Give each hire a stable `id`. The tile key uses it, and duplicates break the enter transition and React reconciliation.
- In controlled mode, update `team` and `page` together: choosing a team calls `onTeamChange` and then `onPageChange(1)`.

## Notes

- The avatar colour comes from a hash of the name over the kit Avatar colours (blue, lime, pink, neutral) unless `avatarColor` is set, so a person keeps one colour across renders.
- Without `teams`, the switcher is hidden. Without `viewAllHref` or `onViewAll`, the "View all" link is hidden.
- Status labels default to "Active", "Onboarding" and "Starts soon"; override them with `statusLabels`.

## Definition of done

The card shows the title, the team switcher and the headline count, with four tiles newest first. Each tile has an initials avatar, the name, a relative caption, a status dot with its label, the start date and a role pill. Next and Previous page through the list and disable at the ends. Choosing a team from the menu filters the tiles, updates the count and returns to page 1. Escape closes the menu. Below 28rem of card width the grid is a single column. Light and dark both read correctly.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
