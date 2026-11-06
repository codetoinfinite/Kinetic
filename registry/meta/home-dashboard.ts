import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'home-dashboard',
  title: 'Home Dashboard',
  category: 'block',
  kit: 'boardui',
  tags: ['dashboard', 'template', 'page', 'customers', 'charts', 'boardui'],
  blurb:
    'A full home dashboard page: in-block sidebar views, hires, earnings, revenue, contributions, key numbers and a working customers table.',
  cost: 'dom',
  motif: 'grid',

  files: [
    { path: 'registry/ui/home-dashboard.tsx', type: 'registry:ui', role: 'page: view state, Filters widget menu, Create ticket dialog, card grid' },
    { path: 'registry/ui/home-dashboard-shell.tsx', type: 'registry:ui', role: 'shared dashboard frame: sidebar view switching, mobile drawer, header, placeholder view, Filters widget menu' },
    { path: 'registry/ui/home-dashboard-customers.tsx', type: 'registry:ui', role: 'customers table: filters, search, sort, selection, inline status, edit dialog' },
  ],
  dependencies: ['@remixicon/react@^4.9.0', '@internationalized/date@^3.12.4', 'react-aria-components@^1.22.1'],

  summary:
    'The BoardUI home dashboard as one working page. The kit sidebar switches views in local state, the header carries breadcrumbs, a live notification bell, a Filters menu that shows and hides each widget and a Create ticket dialog. Under it sit Recent hires, Earned so far, Revenue, Contributions, four stat cards and a customers table that filters, sorts, selects, edits, duplicates and deletes rows.',

  mechanism: [
    '`DashboardFrame` (in `home-dashboard-shell.tsx`) is a `h-full w-full` flex row: the sidebar and a `main` column that scrolls on its own. Every nav row gets `href="#view-<key>"`, and one `onClickCapture` on the sidebar wrapper finds the closest link, checks it is inside that wrapper in the DOM (so portalled menus are ignored), calls `preventDefault()` and reports the key. The `href="#"` Support row maps to a `support` view. Enter on a link fires the same click, so the keyboard path is covered.',
    'The page holds the view key controlled or uncontrolled (`view` / `defaultView` / `onViewChange`). `"home"` renders the card grid; any other key renders `DashboardViewPlaceholder` with that row\'s icon and label and a "Back to Home" button. The title and the last breadcrumb follow the view, and the Board team and Mertcan crumbs jump to Home and Profile.',
    'Filters is a `Dropdown` whose `DropdownItem`s are `aria-pressed` toggles over a `Set` of widget ids. A hidden widget is skipped, and when one half of a two-column row is hidden the other takes the full width. The trigger shows `shown/total` while anything is hidden, and "Show all" restores the full set.',
    'Create ticket opens a controlled `Modal` with a Subject input and a Priority select. Submit stays disabled until the subject has text. Submitting closes the dialog, adds one to the Support tickets stat (708 to 709) and fires a success toast through the `Toaster` mounted inside the frame.',
    'Recent hires is controlled by team: Board team shows all eight sample hires with a total of 56, and any other team filters the cards and counts the visible hires. The earnings and revenue cards get Weekly, Monthly and Yearly series whose last two points give the headline and its change (7,462 vs 6,500 = +14.8%, 18,240 vs 16,673 = +9.4%).',
    '`HomeCustomersTable` keeps rows controlled or uncontrolled. Price, product and region selects and the search field filter the rows and reset to page 1. Columns sort through the table\'s `sortDescriptor`, and the header checkbox selects the page, with an indeterminate state. A bulk bar replaces the results count while rows are selected. Each row has an inline Purchase select and Edit, Duplicate and Delete actions; Edit opens a dialog that validates the price.',
  ],

  constants: [
    { name: 'today', value: '2026-11-05', why: 'Fixed anchor for the hires\' relative start dates, so server and client renders agree.' },
    { name: 'customers pageSize', value: '8', why: 'Twenty-two sample rows give three pages, so pagination is visible and works.' },
    { name: 'Recent hires pageSize', value: '4', why: 'Four hire cards fill the left half of the first row at 1280px; Previous and Next page through the rest.' },
    { name: 'support tickets base', value: '708', why: 'The stat\'s starting value; each created ticket adds one.' },
    { name: 'first row split', value: 'minmax(0,0.82fr) / minmax(0,1fr)', why: 'Gives the earnings bars a little more room than the hire cards, as in the reference layout.' },
  ],

  pitfalls: [
    'Letting the sidebar links navigate. Without the capture handler a click on a nav row writes a hash into the host page\'s URL.',
    'Using React\'s tree instead of DOM containment to decide whether a click came from the sidebar. Portalled menus bubble through React ancestors, so `event.currentTarget.contains(link)` is what keeps them out.',
    'Swapping the edit dialog\'s content out as it closes. The table keeps the edited customer in state and toggles a separate `open` flag, so the exit animation still has content to draw.',
  ],

  notes: [
    'Every card is an existing kit item (`DashboardSidebar`, `DashboardPageHeader`, `NotificationBellBadge`, `RecentHiresCard`, `EarningsChartCard`, `LineChartCard`, `ContributionsCard`, `StatCards`, `Table`, `RowActions`, `Pagination`). The page owns the wiring, the ticket form and the customers table.',
    'The finance and marketing dashboard templates import `DashboardFrame`, `DashboardHeader`, `DashboardViewPlaceholder`, `DashboardWidgetMenu`, `useWidgetToggles` and `DashboardEmptyGrid` from `home-dashboard-shell.tsx`.',
  ],

  apiSignature:
    'function HomeDashboard(props: { view?: string; defaultView?: string; onViewChange?: (key: string) => void; userName?: string; today?: CalendarDate; hires?: Hire[]; customers?: readonly Customer[]; defaultWidgets?: readonly HomeWidget[]; className?: string }): JSX.Element',

  props: [
    { name: 'view', type: 'string', description: 'Nav key on screen. Controlled; pair with onViewChange.' },
    { name: 'defaultView', type: 'string', default: '"home"', description: 'Initial nav key when uncontrolled. "home" is the dashboard; any other key shows the placeholder view.' },
    { name: 'onViewChange', type: '(key: string) => void', description: 'Called with the new key when a nav row, a crumb or a back button is used.' },
    { name: 'userName', type: 'string', default: '"Mertcan"', description: 'First name in the "Welcome" title.' },
    { name: 'today', type: 'CalendarDate', default: 'parseDate("2026-11-05")', description: 'Anchor for the hires\' relative start dates.' },
    { name: 'hires', type: 'Hire[]', default: 'HOME_HIRES', description: 'Cards in Recent hires (eight sample hires across three teams).' },
    { name: 'customers', type: 'readonly Customer[]', default: 'HOME_CUSTOMERS', description: 'Initial rows of the customers table; edits stay in local state.' },
    { name: 'defaultWidgets', type: 'readonly HomeWidget[]', default: 'all six', description: 'Widgets shown on first render: hires, earnings, revenue, contributions, stats, customers.' },
    { name: 'className', type: 'string', description: 'Merged onto the frame root.' },
  ],

  reducedMotion:
    'The page adds no motion of its own. The composed charts and cards follow `useReducedMotion` and draw at their final state, and the dropdown, dialogs and toasts fall back to instant open and close.',

  cleanup:
    'No timers or listeners in the page; the nav handler is a React capture prop and the drawer is plain state. The composed charts, overlays and the Toaster clean up their own timers and frames.',

  acceptance:
    'At 1280x800 the sidebar shows Home selected and the main column shows "Welcome Mertcan", Recent hires next to Earned so far, Revenue next to Contributions, four stat cards and the customers table. Clicking Finance in the sidebar shows the Finance placeholder, and "Back to Home" returns. Unticking Revenue in Filters removes that card and the button reads 5/6. Creating a ticket with a subject raises Support tickets from 708 to 709 and shows a toast. Searching the table narrows the rows, Edit renames a row in place, and confirming Delete removes the row with a toast.',

  criticalRegion: 'critical',
};

export default meta;
