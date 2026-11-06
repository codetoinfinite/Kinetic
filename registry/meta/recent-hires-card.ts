/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Recent Hires Card" (boardui.com/templates/dashboard).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'recent-hires-card',
  title: 'Recent Hires Card',
  category: 'display',
  kit: 'boardui',
  tags: ['dashboard', 'people', 'list', 'pagination', 'hr', 'boardui'],
  blurb: 'A recent hires card: team switcher, headline count and a paged grid of tiles with initials, status, start date and role.',
  cost: 'css',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/recent-hires-card.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@internationalized/date@^3.12.4', '@remixicon/react@^4.9.0'],

  summary:
    'A grey dashboard card listing the newest people to join, newest start date first. The header pairs the title with a team switcher (a kit Dropdown) and shows the headline count with an optional "View all" link. Hires render as white tiles in a grid that goes from one to two columns once the card itself is wider than 28rem, with Previous / Next buttons paging through them. Team and page each work controlled or uncontrolled.',

  mechanism: [
    'Resolve `team` and `page` through a small controllable-state helper: a defined prop wins, otherwise local state seeded by `defaultTeam` / `defaultPage` holds the value, and the change callback fires either way.',
    'Filter `hires` by `team` (null keeps every team) and sort by `startDate` descending with `CalendarDate.compare`, memoised on `[hires, team]`.',
    'Compute `pageCount = max(1, ceil(visible.length / pageSize))` and clamp the requested page into `[1, pageCount]` before slicing, so a team switch that shrinks the list never leaves the grid on an empty page. Choosing a team also resets the page to 1 and closes the menu.',
    'Each tile computes `today.compare(startDate)` (days since start) and passes it to `formatRelative`, which defaults to English captions: "Joined today", "Joined yesterday", "N days ago", "A week ago", "N weeks ago", then months; negative values read "Starts tomorrow" / "Starts in N days".',
    'Format the start date with a memoised `DateFormatter(locale, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })` over `startDate.toDate("UTC")`, so the server and the browser print the same day whatever the viewer\'s time zone.',
    'Key the `<ul>` on `team-page`, so each page mounts fresh tiles; the tiles enter with a 200ms `starting:` opacity + 4px rise, and `motion-reduce:transition-none` removes it.',
    'Announce the visible range ("Showing 5–8 of 12") through an `sr-only` `aria-live="polite"` paragraph, and disable Previous / Next at the ends.',
  ],

  constants: [
    {
      name: 'pageSize',
      value: '4',
      why: 'Two rows of the two-column grid, the density of the reference card; the card stays short enough to sit beside a chart.',
    },
    {
      name: 'two-column breakpoint',
      value: '@md (container 28rem)',
      why: 'A container query, not a viewport one, so the card reflows by its own width when it sits in a narrow dashboard column.',
    },
    {
      name: 'tile enter',
      value: '200ms ease-out, opacity 0 → 1, translate-y 4px → 0',
      why: 'Short enough to read as a page change rather than a show; it runs only on mount through @starting-style.',
    },
  ],

  pitfalls: [
    'Pass `today` from a fixed value (for example `parseDate("2026-11-05")` or a server-computed date). Calling `today(getLocalTimeZone())` during render can differ between server and client and cause a hydration mismatch.',
    'Give each hire a stable `id`. The tile key uses it, and duplicates break the enter transition and React reconciliation.',
    'In controlled mode, update `team` and `page` together: choosing a team calls `onTeamChange` and then `onPageChange(1)`.',
  ],

  notes: [
    'The avatar colour comes from a hash of the name over the kit Avatar colours (blue, lime, pink, neutral) unless `avatarColor` is set, so a person keeps one colour across renders.',
    'Without `teams`, the switcher is hidden. Without `viewAllHref` or `onViewAll`, the "View all" link is hidden.',
    'Status labels default to "Active", "Onboarding" and "Starts soon"; override them with `statusLabels`.',
  ],

  apiSignature:
    'type Hire = { id: string; name: string; role: string; startDate: CalendarDate; status: "active" | "onboarding" | "pending"; team?: string; initials?: string; avatarColor?: "neutral" | "blue" | "lime" | "pink" }\nfunction RecentHiresCard(props: RecentHiresCardProps): JSX.Element',

  props: [
    { name: 'hires', type: 'Hire[]', description: 'Every hire; the card filters, sorts and pages them.' },
    { name: 'today', type: 'CalendarDate', description: 'Reference day for the relative caption under each name.' },
    { name: 'title', type: 'string', default: '"Recent hires"', description: 'Header label and the section\'s accessible name.' },
    { name: 'total', type: 'number | ((visible: Hire[]) => number)', description: 'Headline number. Defaults to the number of hires in the selected team.' },
    { name: 'teams', type: '{ value: string | null; label: string }[]', description: 'Team switcher options. A `null` value means every team. Omit to hide the switcher.' },
    { name: 'team / defaultTeam / onTeamChange', type: 'string | null', default: 'null', description: 'Selected team, controlled or uncontrolled.' },
    { name: 'pageSize', type: 'number', default: '4', description: 'Tiles per page.' },
    { name: 'page / defaultPage / onPageChange', type: 'number', default: '1', description: 'One-based page, controlled or uncontrolled. Out-of-range values are clamped.' },
    { name: 'viewAllHref', type: 'string', description: 'Renders "View all" as a link.' },
    { name: 'onViewAll', type: '() => void', description: 'Renders "View all" as a button when no href is given.' },
    { name: 'viewAllLabel', type: 'string', default: '"View all"', description: 'Link text.' },
    { name: 'statusLabels', type: 'Partial<Record<HireStatus, string>>', description: 'Overrides the status captions.' },
    { name: 'formatRelative', type: '(daysSinceStart: number) => string', default: 'relativeStart', description: 'Replaces the English relative caption; negative values are future starts.' },
    { name: 'locale', type: 'string', default: '"en-US"', description: 'Locale for the start date and the headline number.' },
    { name: 'className', type: 'string', description: 'Merged onto the card.' },
  ],

  reducedMotion:
    'The only motion is the 200ms tile enter and the chevron flip. Both carry `motion-reduce:transition-none`, so under `prefers-reduced-motion: reduce` pages swap instantly.',

  cleanup:
    'Nothing to clean up. There are no timers, listeners or observers; the dropdown popover is managed by react-aria and unmounts with the card.',

  acceptance:
    'The card shows the title, the team switcher and the headline count, with four tiles newest first. Each tile has an initials avatar, the name, a relative caption, a status dot with its label, the start date and a role pill. Next and Previous page through the list and disable at the ends. Choosing a team from the menu filters the tiles, updates the count and returns to page 1. Escape closes the menu. Below 28rem of card width the grid is a single column. Light and dark both read correctly.',

  criticalRegion: 'critical',
};

export default meta;
