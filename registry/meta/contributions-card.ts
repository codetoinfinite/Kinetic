/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Contributions Card" (boardui.com/components/contributions-card).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'contributions-card',
  title: 'Contributions Card',
  category: 'display',
  kit: 'boardui',
  tags: ['chart', 'calendar', 'heatmap', 'contributions', 'dashboard', 'boardui'],
  blurb:
    'A GitHub-style contributions card: a week by weekday calendar in five intensity steps, stat tiles, month labels and nine accent palettes.',
  cost: 'css',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/contributions-card.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],

  summary:
    'A grey dashboard card with a yearly total, a change chip and four stat tiles above a contributions calendar: one rounded cell per day, seven weekday rows by up to 53 week columns, coloured in five intensity steps of an accent family. Weekly, Monthly and Yearly tabs regroup the same counts into days, weeks of each month or whole months across years, at the same grid height. Hovering a cell or moving to it with the arrow keys rings it and shows a tooltip with the count and the date. Everything is a CSS grid of spans, with no chart library and no Date objects.',

  mechanism: [
    'Counts are plain arrays, one number per day of the year. Calendar positions come from integer arithmetic: Sakamoto\'s formula gives the weekday of Jan 1, a month-length table gives each day its month and date, and a day at index i sits in row `(offset + i) % 7` and column `floor((offset + i) / 7)`. Without `Date` there is no time zone, so the server and the client always agree.',
    'The view picks a matrix of cells. Weekly is 7 rows by `ceil((offset + days) / 7)` weeks, with `null` placeholders before Jan 1 and after Dec 31. Monthly sums days 1–7, 8–14, 15–21, 22–28 and 29–31 of each month into 5 rows by 12 columns. Yearly sums each month into one row per year.',
    'A cell\'s tier is 0 for no activity, else `ceil((count / peak) ** 0.7 * 5)` clamped to 1–5, where peak is the busiest cell in the current view. The 0.7 power lifts the many quiet days off tier 1 so a single spike does not wash the year out. The cell carries it as `data-tier`, and the theme\'s `.contributions-grid[data-accent]` rules map tiers 0–5 to the neutral chart colour and the 200, 400, 500, 600 and 700 shades of the accent (950 to 500 in dark mode). Swapping `accent` recolours the whole grid with one attribute.',
    'A ResizeObserver measures the grid. The weekly view keeps the most recent weeks that fit at 8px per cell plus a 3px gap, so a phone shows about half a year and a 640px grid shows all 53 weeks. Rows are as tall as the weekly cells are wide, clamped to 8–14px, and every view shares that seven-row height so switching tabs never resizes the card.',
    'Month labels sit in an extra grid row with `grid-column-start` set to the week the month begins in. In the weekly view a label is dropped when the next month starts less than 3 columns later.',
    'Cells pop in with `.animate-cell-pop`, delayed by `min(k * 9 + r * 12, 520)` ms so the sweep runs left to right. The grid is keyed by the view, so each tab switch replays it.',
    'The grid is one tab stop (`role="group"`). Arrow keys move the active cell and skip placeholders, Home and End jump to the first and last day, and Escape, blur or leaving with the pointer clears it. The active cell gets a 2px outline and `z-10`, and holds a tooltip with the count and a label such as "Wed, Jan 1, 2025". A polite live line under the grid repeats it for screen readers.',
  ],

  constants: [
    {
      name: 'MIN_CELL / GAP',
      value: '8px / 3px',
      why: 'The smallest cell that still reads as a square with a visible gap. At this pitch a typical 640px card fits all 53 weeks.',
    },
    {
      name: 'tiers',
      value: '0 + 5 steps, ceil((count / peak)^0.7 × 5)',
      why: 'Empty days stay neutral grey, and any activity at all lands in at least tier 1, so a single contribution is never invisible.',
    },
    {
      name: 'ROW_HEIGHT',
      value: '8–14px',
      why: 'Weekly rows track the cell width so cells stay square; the clamp stops a wide card from growing a tall calendar.',
    },
    {
      name: 'label spacing',
      value: '≥ 3 weeks',
      why: 'A month that starts within two columns of the next would print its label on top of the neighbour, as happens when a year starts on a Saturday.',
    },
  ],

  pitfalls: [
    'Building the calendar with `new Date(year, month, day)`. Local time zones and DST shift days across the server and the client and cause hydration mismatches; integer weekday arithmetic is exact everywhere.',
    'Scaling tiers by the year\'s peak in every view. A month total is about thirty times a day, so each view needs its own peak or the Monthly view goes solid dark.',
    'Leaving the hovered cell at the default stacking order. The pop animation gives every cell its own stacking context, so later cells paint over the tooltip unless the active cell gets `z-10`.',
  ],

  notes: [
    '`CONTRIBUTION_YEARS` (2023–2025, seeded with `createRng`) and the `ContributionYear`, `ContributionAccent`, `ContributionView` and `ContributionStat` types are exported.',
    'Pass `stats` to replace the derived tiles (Active days, Best day, Longest streak, Daily average), or `stats={false}` to hide them.',
    'The accent families come from the theme: emerald, green, teal, cyan, blue, indigo, violet, rose and amber.',
  ],

  apiSignature:
    'function ContributionsCard(props?: ContributionsCardProps): JSX.Element\ntype ContributionYear = { year: number; counts: number[] }\ntype ContributionAccent = "emerald" | "green" | "teal" | "cyan" | "blue" | "indigo" | "violet" | "rose" | "amber"\ntype ContributionView = "weekly" | "monthly" | "yearly"\nconst CONTRIBUTION_YEARS: ContributionYear[]',

  props: [
    { name: 'title', type: 'string', default: '"Contributions this year"', description: 'Header label.' },
    { name: 'years', type: 'ContributionYear[]', default: 'CONTRIBUTION_YEARS', description: 'Daily counts per year, oldest first. The last year is the one on show; the Yearly view lists them all.' },
    { name: 'accent', type: 'ContributionAccent', default: '"violet"', description: 'Accent family for tiers 1–5.' },
    { name: 'change', type: 'number', default: 'change against the previous year', description: 'Percent for the chip.' },
    { name: 'stats', type: 'ContributionStat[] | false', default: 'derived tiles', description: 'Tiles under the header, or false to hide them.' },
    { name: 'view', type: 'ContributionView', description: 'Controlled granularity.' },
    { name: 'defaultView', type: 'ContributionView', default: '"weekly"', description: 'Uncontrolled starting granularity.' },
    { name: 'onViewChange', type: '(view: ContributionView) => void', description: 'Called when a tab is picked.' },
    { name: 'unit', type: '[string, string]', default: '["contribution", "contributions"]', description: 'Singular and plural noun for the tooltip.' },
    { name: 'className', type: 'string', description: 'Merged onto the card section.' },
  ],

  reducedMotion:
    'Under `prefers-reduced-motion: reduce` the cells appear at once (`motion-reduce:animate-none` on `.animate-cell-pop`, which the theme also disables), and the tab colour change is instant.',

  cleanup:
    '`useResizeObserver` disconnects its observer on unmount. Everything else is CSS and React event props, so nothing else needs tearing down.',

  acceptance:
    'The default card reads "Contributions this year", "529" and a lime "+12.6%" chip, four stat tiles (191 active days, best day 10 on Jun 26, a 14-day streak, 1.4 a day), an "Activity" row with Weekly, Monthly and Yearly tabs, and a violet 7-row calendar with Jan–Dec labels and a Less → More legend. Hovering a cell rings it and shows a count and a date such as "Wed, Jan 1, 2025". Monthly shows 5 × 12 week cells and Yearly shows three year rows. Picking another swatch in the demo recolours the grid and the legend.',

  criticalRegion: 'critical',
};

export default meta;
