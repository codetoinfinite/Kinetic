# Build: Finance Dashboard

The BoardUI finance dashboard as one working page. The kit sidebar switches views in local state, and the header carries breadcrumbs, a live notification bell, a Filters menu that shows and hides each widget and an Add transaction dialog. Under it sit four KPI cards, a cash-flow Sankey, spending rings, a portfolio scatter, a daily-spending heatmap and a transactions table that searches, filters, sorts and pages.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A full finance dashboard page: in-block sidebar views, KPI cards, cash flow, spending, portfolio, daily spend and a live transactions table.

- Category: block
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. The frame comes from `home-dashboard-shell.tsx`: `DashboardFrame` is the `h-full w-full` sidebar and scrolling main column, and it turns nav clicks into view keys. `DashboardHeader` draws the title, the crumbs and the bell. `"finance"` renders the dashboard, and any other key renders `DashboardViewPlaceholder` with a "Back to Finance" button.
2. Filters is the shared `DashboardWidgetMenu` over `useWidgetToggles`, with six widget ids. The lower row counts its visible cards and sets one, two or three columns at `lg`, so hiding a card widens the others. When every widget is hidden, `DashboardEmptyGrid` offers "Show all widgets".
3. Add transaction opens a controlled `Modal`. Merchant and a positive amount are required, and submit stays disabled until both are valid. Direction signs the amount, and picking "Money in" switches the category to Income. Submitting prepends a completed row dated `today`, closes the dialog and fires a success toast.
4. The KPI cards are derived in a `useMemo` from fixed bases plus the rows added on this page. Money in raises Income and Total balance, money out raises Expenses and lowers the balance, and an Investing row also raises Invested. Each card's sparkline ends on its current value.
5. Every chart card is a kit item fed with fixed ranges. Cash flow is built from a sources-by-spending matrix (This month sums to $18,420). Spending uses the `labels` ring variant, so each ring names itself, innermost first from Subscriptions to Housing. The portfolio plots risk score against return with bubble size as the holding, and the daily heatmap is a deterministic weekday by week grid.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `today = 2026-11-05`
  Date stamped on added rows, fixed so server and client renders agree.
- `KPI bases = 84,230 / 18,420 / 9,140 / 32,400`
  Total balance, Income, Expenses and Invested before any row is added; the sample rows are already counted in them.
- `transactions pageSize = 8`
  Twenty sample rows give three pages, so paging is visible and works.
- `cash flow chartHeight = 320`
  Fits ten nodes on the right without crowding while the row of three cards stays above the fold at 1280x800.

## API

```ts
function FinanceDashboard(props: { view?: string; defaultView?: string; onViewChange?: (key: string) => void; transactions?: readonly Transaction[]; today?: string; defaultWidgets?: readonly FinanceWidget[]; className?: string }): JSX.Element
```

- `view: string`
  Nav key on screen. Controlled; pair with onViewChange.
- `defaultView: string` — default `"finance"`
  Initial nav key when uncontrolled. "finance" is the dashboard; any other key shows the placeholder view.
- `onViewChange: (key: string) => void`
  Called with the new key when a nav row, a crumb or a back button is used.
- `transactions: readonly Transaction[]` — default `FINANCE_TRANSACTIONS`
  Initial rows of the transactions table (twenty samples); added rows stay in local state.
- `today: string` — default `"2026-11-05"`
  ISO date stamped on rows added through the dialog.
- `defaultWidgets: readonly FinanceWidget[]` — default `all six`
  Widgets shown on first render: kpis, cashflow, spending, portfolio, daily, transactions.
- `className: string`
  Merged onto the frame root.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function FinanceDashboard({
  view,
  defaultView = 'finance',
  onViewChange,
  transactions: initialTransactions = FINANCE_TRANSACTIONS,
  today = '2026-11-05',
  defaultWidgets = ALL_WIDGETS,
  className,
}: FinanceDashboardProps) {
  const [innerView, setInnerView] = useState(defaultView);
  const current = view ?? innerView;
  const go = useCallback(
    (key: string) => {
      if (view === undefined) setInnerView(key);
      onViewChange?.(key);
    },
    [view, onViewChange],
  );

  const widgets = useWidgetToggles(ALL_WIDGETS, defaultWidgets);
  const shown = widgets.isShown;
  const [rows, setRows] = useState<Transaction[]>(() => [...initialTransactions]);
  const [added, setAdded] = useState<Transaction[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const nextId = useRef(1);


  // Only transactions added on this page move the cards; the sample rows are already in the bases.
  const kpis = useMemo<FinanceKpi[]>(() => {
    const inflow = added.reduce((sum, t) => sum + Math.max(0, t.amount), 0);
    const outflow = added.reduce((sum, t) => sum + Math.max(0, -t.amount), 0);
    const invested = added.reduce((sum, t) => sum + (t.category === 'investing' ? -t.amount : 0), 0);
    const balance = BASE.balance + inflow - outflow;
    return [
      { id: 'balance', label: 'Total balance', icon: WalletIcon, value: balance, change: 0.032, trend: [...TRENDS.balance, balance] },
      { id: 'income', label: 'Income', icon: IncomeIcon, value: BASE.income + inflow, change: 0.061, trend: [...TRENDS.income, BASE.income + inflow] },
      {
        id: 'expenses',
        label: 'Expenses',
        icon: CardIcon,
        value: BASE.expenses + outflow,
        change: 0.024,
        goodDirection: 'down',
        trend: [...TRENDS.expenses, BASE.expenses + outflow],
      },
      { id: 'invested', label: 'Invested', icon: InvestIcon, value: BASE.invested + invested, change: 0.084, trend: [...TRENDS.invested, BASE.invested + invested] },
    ];
  }, [added]);

  const addTransaction = (draft: Omit<Transaction, 'id' | 'date' | 'status'>) => {
    const tx: Transaction = { ...draft, id: `tx-new-${nextId.current++}`, date: today, status: 'completed' };
    setRows((prev) => [tx, ...prev]);
    setAdded((prev) => [...prev, tx]);
    setFormOpen(false);
    toast('Transaction added', { status: 'success', description: `${tx.name}: ${tx.amount > 0 ? '+' : '-'}${formatMoney(Math.abs(tx.amount))}` });
  };
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `CashFlowCard` schedules one animation frame and one zero-delay timeout to mount the Sankey, and its effect cancels both on unmount. The page adds no listeners; the id counter is a ref and everything else is React state. The composed charts, overlays and the Toaster clean up their own timers and frames.

**Reduced motion.** The page adds no motion of its own. The composed chart cards follow `useReducedMotion` and draw at their final state, and the dropdown, dialog and toasts fall back to instant open and close.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Passing Remix icons straight into `FinanceKpi.icon`. Their type includes a class component whose `defaultProps` does not match the row's icon type, so the page wraps each one in a small function component.
- Recomputing the KPIs from every table row. The bases already include the sample rows, so only rows added through the dialog move the cards.
- Sankey links index into one node list. The sources come first, so each spending target index is offset by the number of sources.
- Mounting the Sankey in the same commit as the whole page. Its sweep reads the frame timestamp, which can be earlier than the start time taken after a long commit, giving a negative clip width. `CashFlowCard` therefore mounts the chart a frame later in its own small subtree, holding the card's height with a spacer meanwhile.

## Notes

- Every card is an existing kit item (`FinanceKpiRow`, `SankeyChartCard`, `RadialChartCard`, `ScatterChartCard`, `HeatmapChartCard`, `TransactionsTable`, `Modal`, `Select`, `Input`). The page owns the wiring, the sample data and the transaction form.
- Search, status filter, sort and paging are built into `TransactionsTable`, so the page only owns the rows.

## Definition of done

At 1280x800 the sidebar shows Finance selected and the main column shows the Finance title, four KPI cards, Cash flow, a row of Spending by category, Portfolio and Daily spending, and the transactions table. Clicking Home in the sidebar shows the Home placeholder, and "Back to Finance" returns. Unticking Portfolio in Filters removes that card and the button reads 5/6. Adding a $250 money-out transaction puts it at the top of the table, raises Expenses from $9,140 to $9,390 and shows a toast.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
