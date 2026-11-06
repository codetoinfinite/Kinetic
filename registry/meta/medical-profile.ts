import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'medical-profile',
  title: 'Medical Profile',
  category: 'block',
  kit: 'boardui',
  tags: ['dashboard', 'health', 'template', 'patients', 'page', 'boardui'],
  blurb:
    'A full patient dashboard page: profile, steps, sleep, a day picker driving activity rings, alerts and a filterable patients table.',
  cost: 'dom',
  motif: 'rings',

  files: [
    { path: 'registry/ui/medical-profile.tsx', type: 'registry:ui', role: 'page: sidebar views, header, card grid, table wiring' },
    { path: 'registry/ui/medical-profile-parts.tsx', type: 'registry:ui', role: 'patient card, Filters popover, File a report dialog, placeholder view' },
  ],
  dependencies: ['@remixicon/react@^4.9.0', '@internationalized/date@^3.12.4'],

  summary:
    'The Medical Profile template as one working page. A floating sidebar switches views in local state, the header carries a live notification bell, a Filters popover and a File a report dialog, and a three-column grid holds the patient card, steps and sleep charts, the most active days calendar wired to the activity rings, and the alerts feed, with the patients table underneath.',

  mechanism: [
    'The root is a `h-full w-full` flex row: `DashboardSidebar` (260px floating panel, theme toggle hidden) and a `main` column that scrolls on its own. The sidebar rows are `href="#"` links, so a single `onClickCapture` on the root finds the closest `a[href="#"]`, matches its `aria-label` against `DASHBOARD_NAV` and calls `setView(key)` after `preventDefault()`, keeping the host URL untouched.',
    'The view key decides the body. `"medical"` renders the dashboard; any other key renders `WorkspacePlaceholder` with that row\'s icon and label plus a "Back to Medical Report" button. The breadcrumb crumbs are `onPress` buttons that jump to the Home and Profile views, and the last crumb and the title follow the current view.',
    'The dashboard is a `grid-cols-3 gap-4` grid. `MostActiveDaysCard` is controlled (`selected={day}`, `onSelectedChange={setDay}`); `sampleDayActivity(day)` is memoised and its `rings` feed `ActivityRingsCard`, whose title becomes `Activity for <formatLongDate(day)>`. Picking a day in the calendar redraws the rings for that day.',
    'Filters is a `PopoverTrigger` with one `Checkbox` per section id held in a `Set`. Unchecking removes the id and the grid simply skips that card; the button shows the hidden count and "Show all" restores the full set.',
    'File a report is a controlled `ModalTrigger` around a form (report type `Select`, `Textarea` with a 280 character cap). Submit is disabled until the details are non-empty; submitting prepends a success item to the controlled notification list, so the bell badge goes up by one, and fires `toast.success`.',
    'The patients table gets the page\'s own `patients` state. Its row actions toast a short confirmation; Archive removes the row and the toast offers Undo, which splices the patient back at its old index.',
  ],

  constants: [
    { name: 'sidebar width', value: '260px (from DashboardSidebar)', why: 'Leaves about 990px for the main column inside the 1280px block viewport, enough for three 320px cards with 16px gaps.' },
    { name: 'grid', value: 'grid-cols-3, gap-4 (16px)', why: 'BoardUI\'s two rows of three cards; the cards share a row height so the chart cards line up with the patient card.' },
    { name: 'today', value: '2026-07-10', why: 'Fixed date so the calendar, the ring title and every server render agree; later days render as empty tracks.' },
    { name: 'patients pageSize', value: '8', why: 'Twelve sample rows give two pages, so pagination is visible and works.' },
    { name: 'report maxLength', value: '280', why: 'Keeps the note short enough to read as a single notification line in the bell.' },
  ],

  pitfalls: [
    'Letting the sidebar links navigate. They are `href="#"`; without the capture handler a click scrolls the host page and writes a hash into its URL.',
    'Using viewport breakpoints (`lg:`) inside the page. Blocks render in a scaled 1280px virtual viewport, so media queries see the real window and would collapse the layout on a phone even though the page is drawn at desktop width.',
    'Deriving the rings from the calendar\'s internal state. Make the calendar controlled and read `day` from the page, or the ring card cannot know which day is picked.',
    'Keeping object URLs from the photo picker alive. The patient card revokes the previous URL whenever the photo changes and on unmount.',
  ],

  notes: [
    'Every card is an existing kit item (`StepsCard`, `SleepScoreCard`, `MostActiveDaysCard`, `ActivityRingsCard`, `ImportantAlertsCard`, `PatientsTable`, `NotificationBellBadge`, `DashboardPageHeader`). The page only owns the wiring and the patient card, filter popover and report dialog in `medical-profile-parts.tsx`.',
    'A `Toaster` is mounted inside the page so the action toasts work wherever the block is dropped.',
  ],

  apiSignature:
    'function MedicalProfile(props: { patients?: Patient[]; defaultNotifications?: BellNotification[]; defaultView?: string; today?: CalendarDate; className?: string }): JSX.Element',

  props: [
    { name: 'patients', type: 'Patient[]', default: 'MEDICAL_PATIENTS', description: 'Rows of the patients table (12 sample patients by default). Archive and Undo edit a local copy.' },
    { name: 'defaultNotifications', type: 'BellNotification[]', default: 'MEDICAL_NOTIFICATIONS', description: 'Initial bell contents; unread items drive the badge count.' },
    { name: 'defaultView', type: 'string', default: '"medical"', description: 'Sidebar key shown first. "medical" is the dashboard, any other key shows the placeholder view.' },
    { name: 'today', type: 'CalendarDate', default: 'parseDate("2026-07-10")', description: 'Last day with activity data and the day picked at first.' },
    { name: 'className', type: 'string', description: 'Merged onto the root.' },
  ],

  reducedMotion:
    'The page adds no motion of its own. The composed charts (steps bars, sleep ring, activity rings) check `useReducedMotion` and draw at their final size, and overlays fall back to instant open and close.',

  cleanup:
    'No timers or listeners in the page itself; the nav handler is a React capture prop. The patient card revokes its object URL on change and unmount. The composed cards and the Toaster clean up their own frames and timers.',

  acceptance:
    'At 1280x800 the sidebar sits on the left with Medical Report selected, and the main column shows three cards per row and the patients table below. Clicking day 3 in Most active days changes the ring card title to "Activity for July 3, 2026" and the rings redraw. Unchecking Steps in Filters removes the Steps card and the button shows 1 hidden. Filing a report with some text closes the dialog, shows a toast and raises the bell count from 5 to 6. Clicking Calendar in the sidebar shows the placeholder, and "Back to Medical Report" returns to the dashboard.',

  criticalRegion: 'critical',
};

export default meta;
