import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'calendar-toolbar',
  title: 'Calendar Toolbar',
  category: 'navigation',
  kit: 'boardui',
  tags: ['calendar', 'toolbar', 'header', 'segmented-control', 'boardui'],
  blurb:
    'Calendar page header: month title, Today, month stepper, Day/Week/Month segments, event search and a New event button.',
  cost: 'css',
  motif: 'split',

  files: [{ path: 'registry/ui/calendar-toolbar.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: ['@internationalized/date@^3.12.4', '@remixicon/react@^4.9.0'],

  summary:
    'The header row of the calendar template, assembled from kit pieces: the month as a heading with a Today button on the left, and the month stepper, a Day / Week / Month segmented control, a search field and the primary New event button on the right. Month, view and search are each independently controlled or uncontrolled. The row wraps into a second line, then stacks, as its container narrows.',

  mechanism: [
    'Month state is a `CalendarDate` normalised with `startOfMonth`. `month` controls it; otherwise `defaultMonth`, then `today`, then the local current date seed internal state. Both the stepper and the Today button write through one `setMonth` that updates internal state and calls `onMonthChange`.',
    'The heading defaults to `DateFormatter(locale, { month: "long", year: "numeric", timeZone: "UTC" })` of the month and carries `aria-live="polite"`, so stepping the month is announced. Passing `title={null}` removes it; any other node replaces it.',
    'Today sets the month to `startOfMonth(today)` and calls `onToday(today)` so the parent can also select or scroll to the day. `today` is a prop so server-rendered pages can pin it and avoid a hydration mismatch.',
    'The view switch is the kit `SegmentedControl` with `selectedKeys={[view]}`. `onSelectionChange` reads the single key out of the Set, ignores anything that is not a known view, then updates internal state and calls `onViewChange`. `views` picks and orders the segments.',
    'The search is the kit `SearchField` passed `value`/`defaultValue`/`onChange` straight through, so Escape clears it. Layout is two flex groups in a `flex-wrap` row: from `sm` up the right group is `flex-1 justify-end flex-wrap`. Below `sm` both groups take `w-full` (title and Today pushed apart), and the stepper and search also take `w-full`, so on a phone they each get their own line.',
  ],

  constants: [
    { name: 'control height', value: '36px everywhere', why: 'Button medium, MonthStepper medium, SearchField medium and the solid SegmentedControl (4px track padding + 28px segment) all land on 36px, so the row reads as one baseline without per-control fixes.' },
    { name: 'stepper width', value: 'w-60 (240px) from sm up', why: 'Narrower than the stepper\'s 320px default so all five controls fit in one 1100px row, still wide enough that "September 2026" does not truncate.' },
    { name: 'search width', value: 'w-52 (208px) from sm up', why: 'Fits the "Search events" placeholder plus icon and clear button with room for a short query.' },
    { name: 'gaps', value: '12px between groups, 8px inside the control group', why: 'The tighter inner gap groups the controls visually, and the wider outer gap separates them from the title.' },
  ],

  pitfalls: [
    'Reading `onSelectionChange` keys as an array. React Aria passes a `Set<Key>`; spread it before destructuring.',
    'Defaulting `today` with `new Date()` on the server. Pass a fixed `CalendarDate` when the toolbar is server rendered, or the heading and Today target can disagree between server and client around midnight.',
    'Letting the segmented control allow an empty selection. The kit control sets `disallowEmptySelection`; keep a view selected or the grid under the toolbar has nothing to render.',
  ],

  notes: [
    'Use `actions` for the template\'s notification and inbox icon buttons; they render just before New event.',
    'The toolbar only reports state. Filtering events by the search text and switching between grid components is the parent\'s job.',
  ],

  apiSignature:
    'type CalendarView = "day" | "week" | "month"\nfunction CalendarToolbar(props: { month?: CalendarDate; defaultMonth?: CalendarDate; onMonthChange?: (month: CalendarDate) => void; today?: CalendarDate; onToday?: (today: CalendarDate) => void; view?: CalendarView; defaultView?: CalendarView; onViewChange?: (view: CalendarView) => void; views?: CalendarView[]; searchValue?: string; defaultSearchValue?: string; onSearchChange?: (value: string) => void; showSearch?: boolean; searchPlaceholder?: string; onNewEvent?: () => void; newEventLabel?: string; title?: ReactNode; actions?: ReactNode; locale?: string; className?: string; ref?: Ref<HTMLDivElement> }): JSX.Element',

  props: [
    { name: 'month / defaultMonth', type: 'CalendarDate', description: 'Shown month, controlled or uncontrolled.' },
    { name: 'onMonthChange', type: '(month: CalendarDate) => void', description: 'Called with the first day of the month from the stepper or Today.' },
    { name: 'today', type: 'CalendarDate', default: 'local today', description: 'Target of the Today button.' },
    { name: 'onToday', type: '(today: CalendarDate) => void', description: 'Called after Today moved the month.' },
    { name: 'view / defaultView', type: '"day" | "week" | "month"', default: '"month"', description: 'Selected segment.' },
    { name: 'onViewChange', type: '(view: CalendarView) => void', description: 'Called when a segment is chosen.' },
    { name: 'views', type: 'CalendarView[]', default: '["day", "week", "month"]', description: 'Segments to show, in order.' },
    { name: 'searchValue / defaultSearchValue / onSearchChange', type: 'string / string / (value: string) => void', description: 'Search text, controlled or uncontrolled.' },
    { name: 'showSearch', type: 'boolean', default: 'true', description: 'Render the search field.' },
    { name: 'onNewEvent', type: '() => void', description: 'Press handler of the primary button.' },
    { name: 'title', type: 'ReactNode', default: 'formatted month', description: 'Left heading; `null` hides it.' },
    { name: 'actions', type: 'ReactNode', description: 'Extra controls before New event.' },
  ],

  reducedMotion:
    'The toolbar adds no motion of its own. The month stepper skips its label slide and the segmented control\'s thumb follows the kit control\'s own behaviour.',

  cleanup: 'Nothing of its own. The composed kit components clean up their own effects and observers.',

  acceptance:
    'With month August 2026, the heading reads "August 2026". Pressing the stepper\'s next chevron changes the heading to "September 2026"; pressing Today returns it to "August 2026". Choosing "Week" in the segmented control marks it selected and reports `"week"`. Typing "sync" in the search reports the text and Escape clears it. New event calls `onNewEvent`. At 360px wide every control remains visible and nothing scrolls sideways.',

  criticalRegion: 'critical',
};

export default meta;
