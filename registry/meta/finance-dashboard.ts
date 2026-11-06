import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'finance-dashboard',
  title: 'Finance Dashboard',
  category: 'block',
  kit: 'boardui',
  tags: ['dashboard', 'template', 'page', 'finance', 'charts', 'boardui'],
  blurb:
    'A full finance dashboard page: in-block sidebar views, KPI cards, cash flow, spending, portfolio, daily spend and a live transactions table.',
  cost: 'dom',
  motif: 'grid',

  files: [{ path: 'registry/ui/finance-dashboard.tsx', type: 'registry:ui', role: 'page: view state, Filters widget menu, Add transaction dialog, chart grid, sample data' }],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'The BoardUI finance dashboard as one working page. The kit sidebar switches views in local state, and the header carries breadcrumbs, a live notification bell, a Filters menu that shows and hides each widget and an Add transaction dialog. Under it sit four KPI cards, a cash-flow Sankey, spending rings, a portfolio scatter, a daily-spending heatmap and a transactions table that searches, filters, sorts and pages.',

  mechanism: [
    'The frame comes from `home-dashboard-shell.tsx`: `DashboardFrame` is the `h-full w-full` sidebar and scrolling main column, and it turns nav clicks into view keys. `DashboardHeader` draws the title, the crumbs and the bell. `"finance"` renders the dashboard, and any other key renders `DashboardViewPlaceholder` with a "Back to Finance" button.',
    'Filters is the shared `DashboardWidgetMenu` over `useWidgetToggles`, with six widget ids. The lower row counts its visible cards and sets one, two or three columns at `lg`, so hiding a card widens the others. When every widget is hidden, `DashboardEmptyGrid` offers "Show all widgets".',
    'Add transaction opens a controlled `Modal`. Merchant and a positive amount are required, and submit stays disabled until both are valid. Direction signs the amount, and picking "Money in" switches the category to Income. Submitting prepends a completed row dated `today`, closes the dialog and fires a success toast.',
    'The KPI cards are derived in a `useMemo` from fixed bases plus the rows added on this page. Money in raises Income and Total balance, money out raises Expenses and lowers the balance, and an Investing row also raises Invested. Each card\'s sparkline ends on its current value.',
    'Every chart card is a kit item fed with fixed ranges. Cash flow is built from a sources-by-spending matrix (This month sums to $18,420). Spending uses the `labels` ring variant, so each ring names itself, innermost first from Subscriptions to Housing. The portfolio plots risk score against return with bubble size as the holding, and the daily heatmap is a deterministic weekday by week grid.',
  ],

  constants: [
    { name: 'today', value: '2026-11-05', why: 'Date stamped on added rows, fixed so server and client renders agree.' },
    { name: 'KPI bases', value: '84,230 / 18,420 / 9,140 / 32,400', why: 'Total balance, Income, Expenses and Invested before any row is added; the sample rows are already counted in them.' },
    { name: 'transactions pageSize', value: '8', why: 'Twenty sample rows give three pages, so paging is visible and works.' },
    { name: 'cash flow chartHeight', value: '320', why: 'Fits ten nodes on the right without crowding while the row of three cards stays above the fold at 1280x800.' },
  ],

  pitfalls: [
    'Passing Remix icons straight into `FinanceKpi.icon`. Their type includes a class component whose `defaultProps` does not match the row\'s icon type, so the page wraps each one in a small function component.',
    'Recomputing the KPIs from every table row. The bases already include the sample rows, so only rows added through the dialog move the cards.',
    'Sankey links index into one node list. The sources come first, so each spending target index is offset by the number of sources.',
    'Mounting the Sankey in the same commit as the whole page. Its sweep reads the frame timestamp, which can be earlier than the start time taken after a long commit, giving a negative clip width. `CashFlowCard` therefore mounts the chart a frame later in its own small subtree, holding the card\'s height with a spacer meanwhile.',
  ],

  notes: [
    'Every card is an existing kit item (`FinanceKpiRow`, `SankeyChartCard`, `RadialChartCard`, `ScatterChartCard`, `HeatmapChartCard`, `TransactionsTable`, `Modal`, `Select`, `Input`). The page owns the wiring, the sample data and the transaction form.',
    'Search, status filter, sort and paging are built into `TransactionsTable`, so the page only owns the rows.',
  ],

  apiSignature:
    'function FinanceDashboard(props: { view?: string; defaultView?: string; onViewChange?: (key: string) => void; transactions?: readonly Transaction[]; today?: string; defaultWidgets?: readonly FinanceWidget[]; className?: string }): JSX.Element',

  props: [
    { name: 'view', type: 'string', description: 'Nav key on screen. Controlled; pair with onViewChange.' },
    { name: 'defaultView', type: 'string', default: '"finance"', description: 'Initial nav key when uncontrolled. "finance" is the dashboard; any other key shows the placeholder view.' },
    { name: 'onViewChange', type: '(key: string) => void', description: 'Called with the new key when a nav row, a crumb or a back button is used.' },
    { name: 'transactions', type: 'readonly Transaction[]', default: 'FINANCE_TRANSACTIONS', description: 'Initial rows of the transactions table (twenty samples); added rows stay in local state.' },
    { name: 'today', type: 'string', default: '"2026-11-05"', description: 'ISO date stamped on rows added through the dialog.' },
    { name: 'defaultWidgets', type: 'readonly FinanceWidget[]', default: 'all six', description: 'Widgets shown on first render: kpis, cashflow, spending, portfolio, daily, transactions.' },
    { name: 'className', type: 'string', description: 'Merged onto the frame root.' },
  ],

  reducedMotion:
    'The page adds no motion of its own. The composed chart cards follow `useReducedMotion` and draw at their final state, and the dropdown, dialog and toasts fall back to instant open and close.',

  cleanup:
    '`CashFlowCard` schedules one animation frame and one zero-delay timeout to mount the Sankey, and its effect cancels both on unmount. The page adds no listeners; the id counter is a ref and everything else is React state. The composed charts, overlays and the Toaster clean up their own timers and frames.',

  acceptance:
    'At 1280x800 the sidebar shows Finance selected and the main column shows the Finance title, four KPI cards, Cash flow, a row of Spending by category, Portfolio and Daily spending, and the transactions table. Clicking Home in the sidebar shows the Home placeholder, and "Back to Finance" returns. Unticking Portfolio in Filters removes that card and the button reads 5/6. Adding a $250 money-out transaction puts it at the top of the table, raises Expenses from $9,140 to $9,390 and shows a toast.',

  criticalRegion: 'critical',
};

export default meta;
