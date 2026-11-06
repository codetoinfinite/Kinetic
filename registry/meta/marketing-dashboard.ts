import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'marketing-dashboard',
  title: 'Marketing Dashboard',
  category: 'block',
  kit: 'boardui',
  tags: ['dashboard', 'template', 'page', 'marketing', 'charts', 'boardui'],
  blurb:
    'A full marketing dashboard page: in-block sidebar views, key metrics, funnel, channel spend, traffic, ad spend, visitors and campaigns.',
  cost: 'dom',
  motif: 'grid',

  files: [{ path: 'registry/ui/marketing-dashboard.tsx', type: 'registry:ui', role: 'page: view state, Filters widget menu, New campaign dialog, chart grid, sample data' }],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'The BoardUI marketing dashboard as one working page. The kit sidebar switches views in local state, and the header carries breadcrumbs, a live notification bell, a Filters menu that shows and hides each widget and a New campaign dialog. Under it sit four stat cards, an acquisition funnel, spend by channel, traffic sources, ad spend with click-through rate, visitors by source and a campaigns table that filters, sorts and pages.',

  mechanism: [
    'The frame comes from `home-dashboard-shell.tsx`: `DashboardFrame` is the `h-full w-full` sidebar and scrolling main column, and it turns nav clicks into view keys. `DashboardHeader` draws the title, the crumbs and the bell. `"marketing"` renders the dashboard, and any other key renders `DashboardViewPlaceholder` with a "Back to Marketing" button.',
    'Filters is the shared `DashboardWidgetMenu` over `useWidgetToggles`, with seven widget ids. The funnel, spend and traffic row and the ad spend and visitors row each count their visible cards and set one, two or three columns at `lg`, so hiding a card widens the rest. When every widget is hidden, `DashboardEmptyGrid` offers "Show all widgets".',
    'New campaign opens a controlled `Modal`. A name and a budget above zero are required, and submit stays disabled until both are valid. Submitting prepends a draft campaign with nothing spent, stamped `today`, so it sorts first under the table\'s default updated-newest order. It also closes the dialog and fires a success toast.',
    'The stat cards are derived in a `useMemo` over the campaign rows. Ad spend, Impressions and Conversions are fixed figures for last month, and Draft campaigns counts the rows whose status is draft, with the row total as its caption.',
    'Every chart card is a kit item fed with fixed ranges. The funnel has three ranges of Visits, Sign-ups, Trials and Customers. Spend by channel is a segmented gauge over four channels formatted as dollars. Traffic sources tabs between channels, campaigns and landing pages. Ad spend pairs monthly bars with a CTR line on its own axis, and Visitors stacks organic, paid and social traffic.',
  ],

  constants: [
    { name: 'today', value: '2026-11-05', why: 'Date stamped on new campaigns, fixed so server and client renders agree and new rows sort above the newest sample (2026-11-04).' },
    { name: 'campaigns pageSize', value: '6', why: 'Fourteen sample campaigns give three pages, so paging is visible and works.' },
    { name: 'sample drafts', value: '3 of 14', why: 'The Draft campaigns card starts at 3 with "14 total" and moves to 4 and "15 total" after one new campaign.' },
  ],

  pitfalls: [
    'Passing Remix icons straight into `BarListItem.icon`. Their type includes a class component whose props do not match the bar list\'s narrow icon type, so the page wraps each one in a small function component.',
    'Giving a new campaign an older date. `CampaignsTable` sorts by updated date, newest first, by default, so a row stamped before the newest sample would land on a later page.',
    'Opening Filters and then scrolling. The menu is a react-aria popover, which closes on scroll, so its toggles should be used before moving down the page.',
  ],

  notes: [
    'Every card is an existing kit item (`StatCards`, `FunnelChartCard`, `SpeedometerChartCard`, `ChannelTabsBarList`, `ComboChartCard`, `AreaChartCard`, `CampaignsTable`, `Modal`, `Select`, `Input`). The page owns the wiring, the sample data and the campaign form.',
    'The status filter, channel filter, sort and paging are built into `CampaignsTable`, so the page only owns the rows.',
  ],

  apiSignature:
    'function MarketingDashboard(props: { view?: string; defaultView?: string; onViewChange?: (key: string) => void; campaigns?: readonly Campaign[]; today?: string; defaultWidgets?: readonly MarketingWidget[]; className?: string }): JSX.Element',

  props: [
    { name: 'view', type: 'string', description: 'Nav key on screen. Controlled; pair with onViewChange.' },
    { name: 'defaultView', type: 'string', default: '"marketing"', description: 'Initial nav key when uncontrolled. "marketing" is the dashboard; any other key shows the placeholder view.' },
    { name: 'onViewChange', type: '(key: string) => void', description: 'Called with the new key when a nav row, a crumb or a back button is used.' },
    { name: 'campaigns', type: 'readonly Campaign[]', default: 'MARKETING_CAMPAIGNS', description: 'Initial rows of the campaigns table (fourteen samples); new campaigns stay in local state.' },
    { name: 'today', type: 'string', default: '"2026-11-05"', description: 'ISO date stamped on campaigns created through the dialog.' },
    { name: 'defaultWidgets', type: 'readonly MarketingWidget[]', default: 'all seven', description: 'Widgets shown on first render: kpis, funnel, spend, traffic, adspend, visitors, campaigns.' },
    { name: 'className', type: 'string', description: 'Merged onto the frame root.' },
  ],

  reducedMotion:
    'The page adds no motion of its own. The composed chart cards follow `useReducedMotion` and draw at their final state, and the dropdown, dialog and toasts fall back to instant open and close.',

  cleanup:
    'No timers or listeners in the page; the id counter is a ref and everything else is React state. The composed charts, overlays and the Toaster clean up their own timers and frames.',

  acceptance:
    'At 1280x800 the sidebar shows Marketing selected and the main column shows the Marketing title, four stat cards, a row of Acquisition funnel, Spend by channel and Traffic sources, then Ad spend and Visitors, then the campaigns table. Clicking Home in the sidebar shows the Home placeholder, and "Back to Marketing" returns. Unticking Visitors in Filters removes that card and the button reads 6/7. Creating a campaign puts it at the top of the table as a draft, moves Draft campaigns from 3 to 4 and shows a toast.',

  criticalRegion: 'critical',
};

export default meta;
