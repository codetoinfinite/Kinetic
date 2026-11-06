import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'week-view-grid',
  title: 'Week View Grid',
  category: 'display',
  kit: 'boardui',
  tags: ['calendar', 'week', 'schedule', 'time-grid', 'events', 'boardui'],
  blurb:
    'Seven-day time grid: hour gutter, day columns, events placed by start and duration, overlaps side by side, a fixed now-line.',
  cost: 'css',
  motif: 'grid',

  files: [{ path: 'registry/ui/week-view-grid.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: ['@internationalized/date@^3.12.4'],

  summary:
    'A week calendar in the template style: a grey frame holding seven white rounded day columns, a 52px hour gutter and a sticky header with the weekday and date, today in an accent pill. Timed events are absolutely positioned from their start and duration with the kit event chip; events that overlap share the column in equal slices. All-day events span their days in a row under the header. A red now-line and time pill mark the fixed `now` you pass in. The body scrolls inside its own box, opening at `scrollToHour`, and on narrow screens it scrolls sideways with the gutter pinned. `renderEvent` lets each chip be wrapped, for example in an EventDetailPopover.',

  mechanism: [
    'The seven days come from `startOfWeek(week, locale, firstDayOfWeek)`, so en-US starts on Sunday unless you override it. One CSS grid template, `52px repeat(7, minmax(0, 1fr))`, is shared by the header, the all-day row and the body, so the columns line up.',
    '`layoutDayEvents` clips each timed event to the day with a UTC day difference (minutes from midnight, negative before the day) and the visible hours, then sorts by start, longer first. It walks the list once: an event that starts after the cluster has ended closes it; inside a cluster the event takes the first column that is free, or opens a new one. Every member of a cluster then gets `columns` equal to the cluster width.',
    'Each block is `top = (start − startHour·60) × hourHeight / 60`, height its duration in px (at least 22px; blocks under 40px switch to the one-line compact chip so a 15 minute stand-up still shows its title and time), left `col / cols` of the column plus 2px and width `1 / cols` minus 4px. Overlap is judged on the drawn height, so padded short events never cover the next one.',
    'The header row is `position: sticky; top: 0` inside the scroll box and the gutter cells are `sticky; left: 0`, both on the frame colour, so the hours and day names stay put in either scroll direction. Hour lines are absolutely placed 1px borders behind the events.',
    'When `now` falls in the week and inside the hour range, its column gets a 2px red line with a dot at the start edge and the gutter shows the time in a red pill at the same offset. A single effect sets `scrollTop` to `scrollToHour` on mount.',
  ],

  constants: [
    { name: 'hourHeight', value: '48px', why: 'Half an hour is 24px, enough for a one-line title; a full working day (8–18) fits a 480px box.' },
    { name: 'minimum block height', value: '22px', why: 'The compact chip height, so 15 minute events stay legible and clickable.' },
    { name: 'compact threshold', value: '40px', why: 'Under this the full chip cannot fit a title line and the time line, so short blocks render the one-line compact chip.' },
    { name: 'gutter', value: '52px', why: 'Holds "10:42" in the now pill and "11 PM" in 12-hour mode without wrapping.' },
    { name: 'min width', value: '640px', why: 'Below this the seven columns get too narrow for titles, so the body scrolls sideways instead.' },
    { name: 'scrollToHour', value: '8', why: 'Opens on the working day instead of midnight.' },
  ],

  pitfalls: [
    'Reading the clock for the now-line during render. Server and client disagree by the time they hydrate; take `now` as a prop and update it from a timer in the caller if it should move.',
    'Measuring overlap on raw times when short events are padded to a minimum height. Two back-to-back 10 minute events would draw on top of each other; compare the drawn end instead.',
    'Wrapping chips in a popover inside the scroll box. React Aria closes an open popover when an ancestor of its trigger scrolls, which is the right behaviour but means scrolling the grid dismisses it.',
    'Giving each day its own grid. Columns drift as content changes; share one grid template for header, all-day row and body.',
  ],

  notes: [
    '`layoutDayEvents` is exported for custom day or resource views.',
    'An event that ends exactly at midnight belongs to the day it started for the all-day row, so a one-day all-day event can be stored as midnight to midnight.',
    'Pass `startHour` / `endHour` to show only working hours; events outside are clipped to the edges.',
  ],

  apiSignature:
    'function WeekViewGrid(props: { events: CalendarEvent[]; week: CalendarDate; firstDayOfWeek?: DayOfWeek; startHour?: number; endHour?: number; hourHeight?: number; scrollToHour?: number; now?: CalendarDateTime; height?: number; selectedEventId?: string | null; onEventClick?: (event: CalendarEvent) => void; renderEvent?: (event: CalendarEvent, chip: ReactElement) => ReactNode; locale?: string; hourCycle?: 12 | 24; "aria-label"?: string; className?: string }): JSX.Element\nfunction layoutDayEvents(events: CalendarEvent[], day: CalendarDate, options: { startHour: number; endHour: number; hourHeight: number; minHeight: number }): WeekEventLayout[]',

  props: [
    { name: 'events', type: 'CalendarEvent[]', description: 'Timed and all-day events; any outside the week are ignored.' },
    { name: 'week', type: 'CalendarDate', description: 'Any day of the week to show.' },
    { name: 'firstDayOfWeek', type: "'sun' | 'mon' | … | 'sat'", default: 'locale', description: 'First column.' },
    { name: 'startHour / endHour', type: 'number', default: '0 / 24', description: 'Visible hour range.' },
    { name: 'hourHeight', type: 'number', default: '48', description: 'Pixels per hour.' },
    { name: 'scrollToHour', type: 'number', default: '8', description: 'Hour scrolled to the top on mount.' },
    { name: 'now', type: 'CalendarDateTime', description: 'Draws the now-line and highlights today. Never read from the clock inside.' },
    { name: 'height', type: 'number', default: '520', description: 'Height of the scrolling box in px.' },
    { name: 'selectedEventId', type: 'string | null', description: 'Rings the matching chip.' },
    { name: 'onEventClick', type: '(event) => void', description: 'Called when a chip is pressed.' },
    { name: 'renderEvent', type: '(event, chip) => ReactNode', description: 'Wrap each chip, for example in an EventDetailPopover.' },
    { name: 'hourCycle', type: '12 | 24', default: '24', description: 'Hour labels and chip times.' },
    { name: 'locale', type: 'string', default: '"en-US"', description: 'Weekday names, first day of week, times.' },
  ],

  reducedMotion:
    'Nothing moves. The grid opens already scrolled to `scrollToHour` with an instant `scrollTop`, never a smooth scroll; the only transition is the kit chip\'s 150ms hover brightness and selection ring, which changes no position or size.',

  cleanup:
    'One mount effect assigns `scrollTop` and returns nothing; there are no listeners, timers or observers. Formatters are cached in a module-level map.',

  acceptance:
    'The week of August 16 2026 opens scrolled to 08:00 with Sun 16 to Sat 22 in the header and 20 in an accent pill. Planning and Design crit on Monday sit side by side at half width; Retro, Demo day and Wrap-up on Friday split three ways where they overlap. Payday spans Wednesday and Holidays spans Friday and Saturday in the all-day row. A red line and a "10:42" pill mark Thursday. Clicking Stand-up opens its details popover; Delete removes the block, lowers the count and offers Undo. At 360px the body scrolls sideways with the hour gutter pinned.',

  criticalRegion: 'critical',
};

export default meta;
