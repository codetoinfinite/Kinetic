import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'calendar',
  title: 'Calendar',
  category: 'block',
  kit: 'boardui',
  tags: ['calendar', 'schedule', 'events', 'template', 'page', 'boardui'],
  blurb:
    'A full calendar page: Day, Week and Month views, anchored event popovers with guests and RSVP, new events, and an invitation inbox.',
  cost: 'dom',
  motif: 'grid',

  files: [
    { path: 'registry/ui/calendar.tsx', type: 'registry:ui', role: 'page: sidebar views, header stepper and view switch, event state, date math' },
    { path: 'registry/ui/calendar-template-views.tsx', type: 'registry:ui', role: 'month grid, week and day time grid with overlap layout, day rail' },
    { path: 'registry/ui/calendar-template-parts.tsx', type: 'registry:ui', role: 'sample data, labels, event details popover body, invitations inbox, New event dialog' },
  ],
  dependencies: ['@internationalized/date@^3.12.4', '@remixicon/react@^4.9.0'],

  summary:
    'The Calendar template as one working page. A Day / Week / Month switch and a stepper move through time; the month grid shows up to three chips a day with "+N more", the week and day views place timed events on a 24-hour grid with overlaps side by side and a now line, and pressing any event opens an anchored popover with guests, meeting code, RSVP, Join and Delete. Empty days and hours start a New event, and the inbox holds invitations to accept.',

  mechanism: [
    'All dates are `@internationalized/date` values. `monthWeeks(anchor)` starts at `startOfWeek(startOfMonth(anchor), "en-US")` and always returns six Sunday-first weeks so the grid keeps its height; `weekDays(anchor)` is the seven days from `startOfWeek(anchor)`. Today and the now line come from fixed constants, never the clock.',
    'One `anchor` date drives every view. The stepper calls `stepAnchor(view, anchor, ±1)`, adding a month, a week or a day (month steps clamp 31 Aug to 30 Sep), and `rangeLabel` prints "August 2026", "16 – 22 Aug 2026" or "Thursday, 20 Aug 2026". The header title is always the anchor month.',
    '`eventsOn(events, date)` keeps events whose start and end days bracket the date, all-day first and then by start time. A month cell shows them all when there are three or fewer, otherwise two plus a "+N more" button that opens that day.',
    '`layoutDay` walks a day\'s timed events in start order, grouping chains of overlaps into clusters. Each event takes the first column whose last block has ended, and every event in a cluster shares the cluster\'s column count, so the 10:00 Roadmap review and the 10:30 Vendor call sit side by side at half width.',
    'There is one standalone kit `Popover` for every event. Pressing a chip, block or agenda row stores that element in `anchorRef` and sets `openId`, and the popover anchors to it through `triggerRef`. Deleting closes the popover and toasts with Undo, which puts the event back.',
    'Each month cell and each hour slot has a full-size background button (`tabIndex=-1`, labelled "New event on …") under pointer-transparent content, so clicking empty space opens New event pre-filled with that day and hour. The dialog remounts with a fresh `key` each time so its fields start from that draft.',
    'Sidebar rows are `href="#"` links. One `onClickCapture` on the root maps the link\'s `aria-label` to a `DASHBOARD_NAV` key and switches the view in state, and any other key shows a placeholder with "Back to Calendar".',
  ],

  constants: [
    { name: 'TODAY', value: '2026-08-20 (Thursday)', why: 'Fixed day for the today ring, the Today button and the default anchor, so renders never read the clock.' },
    { name: 'NOW', value: '10:40', why: 'Where the red now line sits in today\'s column in the Week and Day views.' },
    { name: 'HOUR_PX', value: '48px', why: 'A 30-minute event is 24px tall, enough for its title; the full day is 1152px and scrolls inside the grid, opening at 07:00.' },
    { name: 'MIN_BLOCK_MIN', value: '28 minutes', why: 'Shortest drawn block, so a 15-minute stand-up still shows its title. Overlap detection uses the drawn length too.' },
    { name: 'month rows', value: '6', why: 'Always six weeks, so stepping between months never makes the grid jump in height.' },
  ],

  pitfalls: [
    'Formatting dates with `Intl` in the host time zone. The labels here are built from the `CalendarDate` fields directly, and the chip times format in UTC, so the server and the browser print the same text.',
    'Laying out overlaps per pair instead of per cluster. A chain A–B–C where A and C do not touch still needs one shared column count, or the blocks have different widths and cover each other.',
    'Anchoring a popover to state captured at render time. The anchor element is stored in a ref at press time, so the popover follows the chip that was actually pressed, even in a scrolled time grid.',
    'A row button that unmounts when pressed (Accept or Decline in the inbox) leaves focus on the body, so Escape no longer reaches the popover. Focus moves to the dialog first.',
    'Leaving the mini calendar in the Day view on its first month. It is keyed by year and month so it follows the stepper.',
  ],

  notes: [
    'Composed from kit items: `DashboardSidebar`, `DashboardPageHeader`, `NotificationBellBadge`, `SegmentedControl`, `CalendarEventChip`, `Popover`, `Modal`, `DatePicker`, `DateCalendar`, `Select`, `Input`, `Checkbox`, `Avatar` and `Toaster`. The grids, popover body, inbox and dialog are this item\'s own files.',
    'Week starts on Sunday (`en-US`) and times use a 24-hour clock, as in the preview.',
  ],

  apiSignature:
    'function CalendarTemplate(props: { events?: CalendarEvent[]; invites?: CalendarInvite[]; defaultNotifications?: BellNotification[]; defaultCalendarView?: "day" | "week" | "month"; today?: CalendarDate; defaultView?: string; className?: string }): JSX.Element',

  props: [
    { name: 'events', type: 'CalendarEvent[]', default: 'CALENDAR_EVENTS', description: 'Events on the calendar (28 samples, July to September 2026). Creating, accepting, RSVP and deleting change a local copy.' },
    { name: 'invites', type: 'CalendarInvite[]', default: 'CALENDAR_INVITES', description: 'Pending invitations in the inbox. Accepting one adds its event.' },
    { name: 'defaultNotifications', type: 'BellNotification[]', default: 'CALENDAR_NOTIFICATIONS', description: 'Initial bell contents; unread items drive the badge count.' },
    { name: 'defaultCalendarView', type: '"day" | "week" | "month"', default: '"month"', description: 'View shown first.' },
    { name: 'today', type: 'CalendarDate', default: 'TODAY (2026-08-20)', description: 'Day the calendar opens on and marks as today.' },
    { name: 'defaultView', type: 'string', default: '"calendar"', description: 'Sidebar key shown first. Any other key shows the placeholder view.' },
    { name: 'className', type: 'string', description: 'Merged onto the root.' },
  ],

  reducedMotion:
    'Hover tints on slots, stepper buttons and agenda rows carry `motion-reduce:transition-none`. The popover, modal and segmented control use the kit\'s own reduced-motion handling; nothing else animates.',

  cleanup:
    'No timers, observers or global listeners. The time grid sets its scroll position once in an effect, and the popover anchor is a ref. Overlays and the Toaster clean up their own listeners.',

  acceptance:
    'At 1280x800 the sidebar shows Calendar selected, the title reads "August 2026", the month grid starts on Sun 26 Jul and 20 Aug is ringed as today with Stand-up, Team lunch and "+2 more". Pressing Stand-up opens a popover with four guests, the meeting code and Join meeting. "+2 more" opens the Day view for Thursday, 20 Aug 2026 with a now line at 10:40. In Week view, Roadmap review and Vendor call on 18 Aug sit side by side. Next week reads "23 – 29 Aug 2026". New event with a title adds it and toasts. Accepting "Design system sync" in the inbox adds it on 21 Aug. Delete removes an event and Undo restores it. Clicking Finance in the sidebar shows the placeholder and "Back to Calendar" returns.',

  criticalRegion: 'critical',
};

export default meta;
