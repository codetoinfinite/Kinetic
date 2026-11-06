/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Campaigns Table" (boardui.com/templates/marketing).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'campaigns-table',
  title: 'Campaigns Table',
  category: 'display',
  kit: 'boardui',
  tags: ['table', 'marketing', 'dashboard', 'sorting', 'progress', 'boardui'],
  blurb: 'A marketing campaigns table with channel icons, delivery status, budget-spent progress bars, CTR and sortable columns.',
  cost: 'dom',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/campaigns-table.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@internationalized/date@^3.12.4', '@remixicon/react@^4.9.0', 'react-aria-components@^1.22.1'],

  summary:
    'A bordered card with a result count, a status segmented control and a channel select over the kit Table. Each row shows the campaign and its objective, the channel with its brand icon, a delivery status pill with a coloured dot, spend against budget as a figure, a percent and a thin progress bar, the click-through rate and the last edit date. Every column sorts through React Aria, and the kit Pagination pages the result.',

  mechanism: [
    'Keep the sort in a React Aria `SortDescriptor` (controlled or local, newest edit first) and hand it to the kit `Table`; every column has `allowsSorting`, so a header click or Enter toggles it and sets `aria-sort`.',
    'Derive rows with `sortCampaigns`: filter by status and channel, then compare per column (channel by label, status by rank active, paused, draft, budget by `spent / budget`, dates as ISO strings) times -1 for descending, falling back to the id so ties keep their order.',
    'Compute CTR as `clicks / impressions` and return `null` with no impressions; the CTR sort puts null rows last in both directions instead of letting the sign flip them to the top.',
    'Draw the budget cell as spend "of" budget, a percent, and the kit `ProgressTrack` at `size="sm"` with the percentage clamped to 100; over budget the fill switches to chart-3 and the percent to the rose status text, so 108% still reads at a glance.',
    'Clamp the stored page to the page count and send every sort or filter change back to page 1; dates go through `parseDate(iso).toDate("UTC")` and a UTC formatter so server and client agree.',
  ],

  constants: [
    { name: 'pageSize', value: '6 (demo uses 5)', why: 'Two-line rows are about 56px; six plus the toolbar and pager keep the card on one dashboard fold.' },
    { name: 'table min width', value: '860px', why: 'The budget cell needs about 200px for "$30,884 of $40,000"; below this the kit Table wrapper scrolls instead of squeezing.' },
    { name: 'status rank', value: 'active 0, paused 1, draft 2', why: 'Status sorts by delivery stage, not alphabetically.' },
    { name: 'CTR precision', value: '2 decimals', why: 'Ad CTRs mostly sit between 0.5% and 8%, where a whole percent hides real differences.' },
  ],

  pitfalls: [
    'Do not multiply null CTRs by the sort sign. Treat "no impressions" as missing and pin it last, or drafts jump to the top of every descending CTR sort.',
    'Clamp the bar fill to 100% but keep the true percent in the text, otherwise an overspent campaign looks exactly like a fully spent one.',
    'The progress bar is decorative next to the written figures, so it is `aria-hidden`; giving it a role would make screen readers announce each row twice.',
  ],

  notes: [
    '`ctrOf`, `spentRatio` and `sortCampaigns` are exported for server-side sorting with the same rules.',
    'The status pill is static. Swap it for the kit Select to edit delivery inline.',
    'Spend and budget take whole currency units; amounts are formatted without decimals.',
  ],

  apiSignature:
    'type Campaign = { id: string; name: string; channel: "google" | "meta" | "x" | "linkedin" | "email" | "tiktok"; objective: string; status: "active" | "paused" | "draft"; budget: number; spent: number; impressions: number; clicks: number; updated: string }\nfunction CampaignsTable(props: CampaignsTableProps): JSX.Element\nfunction sortCampaigns(rows: Campaign[], sort: SortDescriptor, status?: CampaignStatus | "all", channel?: CampaignChannel | "all"): Campaign[]',

  props: [
    { name: 'campaigns', type: 'Campaign[]', description: 'All rows; filtering, sorting and paging happen inside.' },
    { name: 'pageSize', type: 'number', default: '6', description: 'Rows per page.' },
    { name: 'sortDescriptor / defaultSortDescriptor / onSortChange', type: 'SortDescriptor', default: '{ column: "updated", direction: "descending" }', description: 'Sort state, controlled or uncontrolled. Columns: name, channel, status, budget, ctr, updated.' },
    { name: 'currency', type: 'string', default: '"USD"', description: 'ISO 4217 code for spend and budget.' },
    { name: 'locale', type: 'string', default: '"en-US"', description: 'Locale for money, percents and dates.' },
    { name: 'label', type: 'string', default: '"Campaigns"', description: 'Accessible name of the card and the table.' },
    { name: 'className', type: 'string', description: 'Merged onto the card.' },
  ],

  reducedMotion:
    'The sort chevron rotates over 150ms and the kit ProgressTrack slides its fill over 500ms; both carry `motion-reduce:transition-none`, so under `prefers-reduced-motion: reduce` they change instantly.',

  cleanup: 'The component adds no timers or listeners. The kit SegmentedControl and Pagination disconnect their ResizeObservers on unmount.',

  acceptance:
    'The demo card reads "16 campaigns", newest edit first with "Founder story video · US" on top. Sorting CTR descending puts "Brand search · US" (7.50%) first and ascending puts "Creator collab · EU" (0.80%) first, with the three drafts showing "–" at the bottom both ways. "Newsletter promo · EU" shows 108% in rose with a full pink bar. Choosing "Draft" leaves 3 rows; choosing the Meta channel leaves 4 and hides the pager. At 360px the table scrolls inside the card. Light and dark both read correctly.',

  criticalRegion: 'critical',
};

export default meta;
