# Build: Medical Profile

The Medical Profile template as one working page. A floating sidebar switches views in local state, the header carries a live notification bell, a Filters popover and a File a report dialog, and a three-column grid holds the patient card, steps and sleep charts, the most active days calendar wired to the activity rings, and the alerts feed, with the patients table underneath.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A full patient dashboard page: profile, steps, sleep, a day picker driving activity rings, alerts and a filterable patients table.

- Category: block
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0, @internationalized/date@^3.12.4

## How it works

1. The root is a `h-full w-full` flex row: `DashboardSidebar` (260px floating panel, theme toggle hidden) and a `main` column that scrolls on its own. The sidebar rows are `href="#"` links, so a single `onClickCapture` on the root finds the closest `a[href="#"]`, matches its `aria-label` against `DASHBOARD_NAV` and calls `setView(key)` after `preventDefault()`, keeping the host URL untouched.
2. The view key decides the body. `"medical"` renders the dashboard; any other key renders `WorkspacePlaceholder` with that row's icon and label plus a "Back to Medical Report" button. The breadcrumb crumbs are `onPress` buttons that jump to the Home and Profile views, and the last crumb and the title follow the current view.
3. The dashboard is a `grid-cols-3 gap-4` grid. `MostActiveDaysCard` is controlled (`selected={day}`, `onSelectedChange={setDay}`); `sampleDayActivity(day)` is memoised and its `rings` feed `ActivityRingsCard`, whose title becomes `Activity for <formatLongDate(day)>`. Picking a day in the calendar redraws the rings for that day.
4. Filters is a `PopoverTrigger` with one `Checkbox` per section id held in a `Set`. Unchecking removes the id and the grid simply skips that card; the button shows the hidden count and "Show all" restores the full set.
5. File a report is a controlled `ModalTrigger` around a form (report type `Select`, `Textarea` with a 280 character cap). Submit is disabled until the details are non-empty; submitting prepends a success item to the controlled notification list, so the bell badge goes up by one, and fires `toast.success`.
6. The patients table gets the page's own `patients` state. Its row actions toast a short confirmation; Archive removes the row and the toast offers Undo, which splices the patient back at its old index.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `sidebar width = 260px (from DashboardSidebar)`
  Leaves about 990px for the main column inside the 1280px block viewport, enough for three 320px cards with 16px gaps.
- `grid = grid-cols-3, gap-4 (16px)`
  BoardUI's two rows of three cards; the cards share a row height so the chart cards line up with the patient card.
- `today = 2026-07-10`
  Fixed date so the calendar, the ring title and every server render agree; later days render as empty tracks.
- `patients pageSize = 8`
  Twelve sample rows give two pages, so pagination is visible and works.
- `report maxLength = 280`
  Keeps the note short enough to read as a single notification line in the bell.

## API

```ts
function MedicalProfile(props: { patients?: Patient[]; defaultNotifications?: BellNotification[]; defaultView?: string; today?: CalendarDate; className?: string }): JSX.Element
```

- `patients: Patient[]` — default `MEDICAL_PATIENTS`
  Rows of the patients table (12 sample patients by default). Archive and Undo edit a local copy.
- `defaultNotifications: BellNotification[]` — default `MEDICAL_NOTIFICATIONS`
  Initial bell contents; unread items drive the badge count.
- `defaultView: string` — default `"medical"`
  Sidebar key shown first. "medical" is the dashboard, any other key shows the placeholder view.
- `today: CalendarDate` — default `parseDate("2026-07-10")`
  Last day with activity data and the day picked at first.
- `className: string`
  Merged onto the root.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
// The sidebar's rows are `href="#"` links. One capture listener turns a
// click on any of them into a view switch, so the host URL never changes.
const onNavClickCapture = (event: MouseEvent<HTMLDivElement>) => {
  if (!(event.target instanceof Element)) return;
  const link = event.target.closest('a[href="#"]');
  if (!link) return;
  event.preventDefault();
  const item = DASHBOARD_NAV.find((entry) => entry.label === link.getAttribute("aria-label"));
  if (item) setView(item.key);
};

const fileReport = (report: FiledReport) => {
  const kind = REPORT_KINDS.find((k) => k.id === report.kind)?.label ?? "Report";
  setNotifications((list) => [
    { id: `report-${list.length + 1}`, title: `${kind} filed`, description: report.details, time: "Just now", icon: RiFileList3Line, tone: "success" },
    ...list,
  ]);
  toast.success("Report filed", { description: `${kind} sent to Dr. Clarkson.` });
};

const onPatientAction = (action: PatientAction, patient: Patient) => {
  if (action !== "archive") {
    toast(ACTION_COPY[action](patient.name));
    return;
  }
  const index = patients.findIndex((p) => p.id === patient.id);
  setPatients((list) => list.filter((p) => p.id !== patient.id));
  toast(`${patient.name} archived`, {
    actions: [
      {
        label: "Undo",
        onClick: () =>
          setPatients((list) => {
            if (list.some((p) => p.id === patient.id)) return list;
            const next = [...list];
            next.splice(Math.max(index, 0), 0, patient);
            return next;
          }),
      },
    ],
  });
};
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** No timers or listeners in the page itself; the nav handler is a React capture prop. The patient card revokes its object URL on change and unmount. The composed cards and the Toaster clean up their own frames and timers.

**Reduced motion.** The page adds no motion of its own. The composed charts (steps bars, sleep ring, activity rings) check `useReducedMotion` and draw at their final size, and overlays fall back to instant open and close.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Letting the sidebar links navigate. They are `href="#"`; without the capture handler a click scrolls the host page and writes a hash into its URL.
- Using viewport breakpoints (`lg:`) inside the page. Blocks render in a scaled 1280px virtual viewport, so media queries see the real window and would collapse the layout on a phone even though the page is drawn at desktop width.
- Deriving the rings from the calendar's internal state. Make the calendar controlled and read `day` from the page, or the ring card cannot know which day is picked.
- Keeping object URLs from the photo picker alive. The patient card revokes the previous URL whenever the photo changes and on unmount.

## Notes

- Every card is an existing kit item (`StepsCard`, `SleepScoreCard`, `MostActiveDaysCard`, `ActivityRingsCard`, `ImportantAlertsCard`, `PatientsTable`, `NotificationBellBadge`, `DashboardPageHeader`). The page only owns the wiring and the patient card, filter popover and report dialog in `medical-profile-parts.tsx`.
- A `Toaster` is mounted inside the page so the action toasts work wherever the block is dropped.

## Definition of done

At 1280x800 the sidebar sits on the left with Medical Report selected, and the main column shows three cards per row and the patients table below. Clicking day 3 in Most active days changes the ring card title to "Activity for July 3, 2026" and the rings redraw. Unchecking Steps in Filters removes the Steps card and the button shows 1 hidden. Filing a report with some text closes the dialog, shows a toast and raises the bell count from 5 to 6. Clicking Calendar in the sidebar shows the placeholder, and "Back to Medical Report" returns to the dashboard.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
