# Build: Calendar

The Calendar template as one working page. A Day / Week / Month switch and a stepper move through time; the month grid shows up to three chips a day with "+N more", the week and day views place timed events on a 24-hour grid with overlaps side by side and a now line, and pressing any event opens an anchored popover with guests, meeting code, RSVP, Join and Delete. Empty days and hours start a New event, and the inbox holds invitations to accept.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A full calendar page: Day, Week and Month views, anchored event popovers with guests and RSVP, new events, and an invitation inbox.

- Category: block
- Runtime cost: dom
- Dependencies: @internationalized/date@^3.12.4, @remixicon/react@^4.9.0

## How it works

1. All dates are `@internationalized/date` values. `monthWeeks(anchor)` starts at `startOfWeek(startOfMonth(anchor), "en-US")` and always returns six Sunday-first weeks so the grid keeps its height; `weekDays(anchor)` is the seven days from `startOfWeek(anchor)`. Today and the now line come from fixed constants, never the clock.
2. One `anchor` date drives every view. The stepper calls `stepAnchor(view, anchor, ±1)`, adding a month, a week or a day (month steps clamp 31 Aug to 30 Sep), and `rangeLabel` prints "August 2026", "16 – 22 Aug 2026" or "Thursday, 20 Aug 2026". The header title is always the anchor month.
3. `eventsOn(events, date)` keeps events whose start and end days bracket the date, all-day first and then by start time. A month cell shows them all when there are three or fewer, otherwise two plus a "+N more" button that opens that day.
4. `layoutDay` walks a day's timed events in start order, grouping chains of overlaps into clusters. Each event takes the first column whose last block has ended, and every event in a cluster shares the cluster's column count, so the 10:00 Roadmap review and the 10:30 Vendor call sit side by side at half width.
5. There is one standalone kit `Popover` for every event. Pressing a chip, block or agenda row stores that element in `anchorRef` and sets `openId`, and the popover anchors to it through `triggerRef`. Deleting closes the popover and toasts with Undo, which puts the event back.
6. Each month cell and each hour slot has a full-size background button (`tabIndex=-1`, labelled "New event on …") under pointer-transparent content, so clicking empty space opens New event pre-filled with that day and hour. The dialog remounts with a fresh `key` each time so its fields start from that draft.
7. Sidebar rows are `href="#"` links. One `onClickCapture` on the root maps the link's `aria-label` to a `DASHBOARD_NAV` key and switches the view in state, and any other key shows a placeholder with "Back to Calendar".

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `TODAY = 2026-08-20 (Thursday)`
  Fixed day for the today ring, the Today button and the default anchor, so renders never read the clock.
- `NOW = 10:40`
  Where the red now line sits in today's column in the Week and Day views.
- `HOUR_PX = 48px`
  A 30-minute event is 24px tall, enough for its title; the full day is 1152px and scrolls inside the grid, opening at 07:00.
- `MIN_BLOCK_MIN = 28 minutes`
  Shortest drawn block, so a 15-minute stand-up still shows its title. Overlap detection uses the drawn length too.
- `month rows = 6`
  Always six weeks, so stepping between months never makes the grid jump in height.

## API

```ts
function CalendarTemplate(props: { events?: CalendarEvent[]; invites?: CalendarInvite[]; defaultNotifications?: BellNotification[]; defaultCalendarView?: "day" | "week" | "month"; today?: CalendarDate; defaultView?: string; className?: string }): JSX.Element
```

- `events: CalendarEvent[]` — default `CALENDAR_EVENTS`
  Events on the calendar (28 samples, July to September 2026). Creating, accepting, RSVP and deleting change a local copy.
- `invites: CalendarInvite[]` — default `CALENDAR_INVITES`
  Pending invitations in the inbox. Accepting one adds its event.
- `defaultNotifications: BellNotification[]` — default `CALENDAR_NOTIFICATIONS`
  Initial bell contents; unread items drive the badge count.
- `defaultCalendarView: "day" | "week" | "month"` — default `"month"`
  View shown first.
- `today: CalendarDate` — default `TODAY (2026-08-20)`
  Day the calendar opens on and marks as today.
- `defaultView: string` — default `"calendar"`
  Sidebar key shown first. Any other key shows the placeholder view.
- `className: string`
  Merged onto the root.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/** Sunday-first weeks, as the month grid and week view draw them. */
const LOCALE = "en-US";

/** Six full weeks starting on the Sunday on or before the 1st, so the grid never changes height. */
export function monthWeeks(anchor: CalendarDate): CalendarDate[][] {
  const first = startOfWeek(startOfMonth(anchor), LOCALE);
  return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => first.add({ days: w * 7 + d })));
}

export function weekDays(anchor: CalendarDate): CalendarDate[] {
  const first = startOfWeek(anchor, LOCALE);
  return Array.from({ length: 7 }, (_, d) => first.add({ days: d }));
}

/** One step of the stepper. Month steps clamp the day (31 Aug -> 30 Sep). */
export function stepAnchor(view: CalendarView, anchor: CalendarDate, dir: 1 | -1): CalendarDate {
  if (view === "month") return anchor.add({ months: dir });
  if (view === "week") return anchor.add({ weeks: dir });
  return anchor.add({ days: dir });
}

/** "August 2026" · "16 – 22 Aug 2026" · "30 Aug – 5 Sep 2026" · "Thursday, 20 Aug 2026" */
export function rangeLabel(view: CalendarView, anchor: CalendarDate): string {
  if (view === "month") return `${monthName(anchor)} ${anchor.year}`;
  if (view === "day") return `${weekdayName(anchor)}, ${anchor.day} ${shortMonth(anchor)} ${anchor.year}`;
  const days = weekDays(anchor);
  const a = days[0] ?? anchor;
  const b = days[6] ?? anchor;
  if (a.year !== b.year) return `${a.day} ${shortMonth(a)} ${a.year} – ${b.day} ${shortMonth(b)} ${b.year}`;
  if (a.month !== b.month) return `${a.day} ${shortMonth(a)} – ${b.day} ${shortMonth(b)} ${b.year}`;
  return `${a.day} – ${b.day} ${shortMonth(b)} ${b.year}`;
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** No timers, observers or global listeners. The time grid sets its scroll position once in an effect, and the popover anchor is a ref. Overlays and the Toaster clean up their own listeners.

**Reduced motion.** Hover tints on slots, stepper buttons and agenda rows carry `motion-reduce:transition-none`. The popover, modal and segmented control use the kit's own reduced-motion handling; nothing else animates.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Formatting dates with `Intl` in the host time zone. The labels here are built from the `CalendarDate` fields directly, and the chip times format in UTC, so the server and the browser print the same text.
- Laying out overlaps per pair instead of per cluster. A chain A–B–C where A and C do not touch still needs one shared column count, or the blocks have different widths and cover each other.
- Anchoring a popover to state captured at render time. The anchor element is stored in a ref at press time, so the popover follows the chip that was actually pressed, even in a scrolled time grid.
- A row button that unmounts when pressed (Accept or Decline in the inbox) leaves focus on the body, so Escape no longer reaches the popover. Focus moves to the dialog first.
- Leaving the mini calendar in the Day view on its first month. It is keyed by year and month so it follows the stepper.

## Notes

- Composed from kit items: `DashboardSidebar`, `DashboardPageHeader`, `NotificationBellBadge`, `SegmentedControl`, `CalendarEventChip`, `Popover`, `Modal`, `DatePicker`, `DateCalendar`, `Select`, `Input`, `Checkbox`, `Avatar` and `Toaster`. The grids, popover body, inbox and dialog are this item's own files.
- Week starts on Sunday (`en-US`) and times use a 24-hour clock, as in the preview.

## Definition of done

At 1280x800 the sidebar shows Calendar selected, the title reads "August 2026", the month grid starts on Sun 26 Jul and 20 Aug is ringed as today with Stand-up, Team lunch and "+2 more". Pressing Stand-up opens a popover with four guests, the meeting code and Join meeting. "+2 more" opens the Day view for Thursday, 20 Aug 2026 with a now line at 10:40. In Week view, Roadmap review and Vendor call on 18 Aug sit side by side. Next week reads "23 – 29 Aug 2026". New event with a title adds it and toasts. Accepting "Design system sync" in the inbox adds it on 21 Aug. Delete removes an event and Undo restores it. Clicking Finance in the sidebar shows the placeholder and "Back to Calendar" returns.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
