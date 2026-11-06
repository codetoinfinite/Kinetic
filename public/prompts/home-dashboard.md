# Build: Home Dashboard

The BoardUI home dashboard as one working page. The kit sidebar switches views in local state, the header carries breadcrumbs, a live notification bell, a Filters menu that shows and hides each widget and a Create ticket dialog. Under it sit Recent hires, Earned so far, Revenue, Contributions, four stat cards and a customers table that filters, sorts, selects, edits, duplicates and deletes rows.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A full home dashboard page: in-block sidebar views, hires, earnings, revenue, contributions, key numbers and a working customers table.

- Category: block
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0, @internationalized/date@^3.12.4, react-aria-components@^1.22.1

## How it works

1. `DashboardFrame` (in `home-dashboard-shell.tsx`) is a `h-full w-full` flex row: the sidebar and a `main` column that scrolls on its own. Every nav row gets `href="#view-<key>"`, and one `onClickCapture` on the sidebar wrapper finds the closest link, checks it is inside that wrapper in the DOM (so portalled menus are ignored), calls `preventDefault()` and reports the key. The `href="#"` Support row maps to a `support` view. Enter on a link fires the same click, so the keyboard path is covered.
2. The page holds the view key controlled or uncontrolled (`view` / `defaultView` / `onViewChange`). `"home"` renders the card grid; any other key renders `DashboardViewPlaceholder` with that row's icon and label and a "Back to Home" button. The title and the last breadcrumb follow the view, and the Board team and Mertcan crumbs jump to Home and Profile.
3. Filters is a `Dropdown` whose `DropdownItem`s are `aria-pressed` toggles over a `Set` of widget ids. A hidden widget is skipped, and when one half of a two-column row is hidden the other takes the full width. The trigger shows `shown/total` while anything is hidden, and "Show all" restores the full set.
4. Create ticket opens a controlled `Modal` with a Subject input and a Priority select. Submit stays disabled until the subject has text. Submitting closes the dialog, adds one to the Support tickets stat (708 to 709) and fires a success toast through the `Toaster` mounted inside the frame.
5. Recent hires is controlled by team: Board team shows all eight sample hires with a total of 56, and any other team filters the cards and counts the visible hires. The earnings and revenue cards get Weekly, Monthly and Yearly series whose last two points give the headline and its change (7,462 vs 6,500 = +14.8%, 18,240 vs 16,673 = +9.4%).
6. `HomeCustomersTable` keeps rows controlled or uncontrolled. Price, product and region selects and the search field filter the rows and reset to page 1. Columns sort through the table's `sortDescriptor`, and the header checkbox selects the page, with an indeterminate state. A bulk bar replaces the results count while rows are selected. Each row has an inline Purchase select and Edit, Duplicate and Delete actions; Edit opens a dialog that validates the price.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `today = 2026-11-05`
  Fixed anchor for the hires' relative start dates, so server and client renders agree.
- `customers pageSize = 8`
  Twenty-two sample rows give three pages, so pagination is visible and works.
- `Recent hires pageSize = 4`
  Four hire cards fill the left half of the first row at 1280px; Previous and Next page through the rest.
- `support tickets base = 708`
  The stat's starting value; each created ticket adds one.
- `first row split = minmax(0,0.82fr) / minmax(0,1fr)`
  Gives the earnings bars a little more room than the hire cards, as in the reference layout.

## API

```ts
function HomeDashboard(props: { view?: string; defaultView?: string; onViewChange?: (key: string) => void; userName?: string; today?: CalendarDate; hires?: Hire[]; customers?: readonly Customer[]; defaultWidgets?: readonly HomeWidget[]; className?: string }): JSX.Element
```

- `view: string`
  Nav key on screen. Controlled; pair with onViewChange.
- `defaultView: string` — default `"home"`
  Initial nav key when uncontrolled. "home" is the dashboard; any other key shows the placeholder view.
- `onViewChange: (key: string) => void`
  Called with the new key when a nav row, a crumb or a back button is used.
- `userName: string` — default `"Mertcan"`
  First name in the "Welcome" title.
- `today: CalendarDate` — default `parseDate("2026-11-05")`
  Anchor for the hires' relative start dates.
- `hires: Hire[]` — default `HOME_HIRES`
  Cards in Recent hires (eight sample hires across three teams).
- `customers: readonly Customer[]` — default `HOME_CUSTOMERS`
  Initial rows of the customers table; edits stay in local state.
- `defaultWidgets: readonly HomeWidget[]` — default `all six`
  Widgets shown on first render: hires, earnings, revenue, contributions, stats, customers.
- `className: string`
  Merged onto the frame root.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function HomeDashboard({
  view,
  defaultView = 'home',
  onViewChange,
  userName = 'Mertcan',
  today = HOME_TODAY,
  hires = HOME_HIRES,
  customers,
  defaultWidgets = ALL_WIDGETS,
  className,
}: HomeDashboardProps) {
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
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketsCreated, setTicketsCreated] = useState(0);
  const [team, setTeam] = useState<string | null>(null);

  const shown = widgets.isShown;

  const stats: Stat[] = [
    { icon: RiGroupLine, label: 'Customers', value: '14,592', delta: '+5.3%', deltaColor: 'lime' },
    { icon: RiBox3Line, label: 'Unit sold', value: '385', delta: '-2.1%', deltaColor: 'rose' },
    { icon: RiShoppingBasketLine, label: 'Orders', value: '1,394', delta: '0.00%', deltaColor: 'neutral' },
    {
      icon: RiChatSmile2Line,
      label: 'Support tickets',
      value: (SUPPORT_TICKETS + ticketsCreated).toLocaleString('en-US'),
      delta: '+12.8%',
      deltaColor: 'lime',
    },
  ];
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** No timers or listeners in the page; the nav handler is a React capture prop and the drawer is plain state. The composed charts, overlays and the Toaster clean up their own timers and frames.

**Reduced motion.** The page adds no motion of its own. The composed charts and cards follow `useReducedMotion` and draw at their final state, and the dropdown, dialogs and toasts fall back to instant open and close.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Letting the sidebar links navigate. Without the capture handler a click on a nav row writes a hash into the host page's URL.
- Using React's tree instead of DOM containment to decide whether a click came from the sidebar. Portalled menus bubble through React ancestors, so `event.currentTarget.contains(link)` is what keeps them out.
- Swapping the edit dialog's content out as it closes. The table keeps the edited customer in state and toggles a separate `open` flag, so the exit animation still has content to draw.

## Notes

- Every card is an existing kit item (`DashboardSidebar`, `DashboardPageHeader`, `NotificationBellBadge`, `RecentHiresCard`, `EarningsChartCard`, `LineChartCard`, `ContributionsCard`, `StatCards`, `Table`, `RowActions`, `Pagination`). The page owns the wiring, the ticket form and the customers table.
- The finance and marketing dashboard templates import `DashboardFrame`, `DashboardHeader`, `DashboardViewPlaceholder`, `DashboardWidgetMenu`, `useWidgetToggles` and `DashboardEmptyGrid` from `home-dashboard-shell.tsx`.

## Definition of done

At 1280x800 the sidebar shows Home selected and the main column shows "Welcome Mertcan", Recent hires next to Earned so far, Revenue next to Contributions, four stat cards and the customers table. Clicking Finance in the sidebar shows the Finance placeholder, and "Back to Home" returns. Unticking Revenue in Filters removes that card and the button reads 5/6. Creating a ticket with a subject raises Support tickets from 708 to 709 and shows a toast. Searching the table narrows the rows, Edit renames a row in place, and confirming Delete removes the row with a toast.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
