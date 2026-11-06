import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'month-view-grid',
  title: 'Month View Grid',
  category: 'display',
  kit: 'boardui',
  tags: ['calendar', 'month', 'schedule', 'grid', 'events', 'keyboard', 'boardui'],
  blurb:
    'Six-week month calendar: muted outside days, event chips per day with "+N more", a selected-day pill and full arrow-key navigation.',
  cost: 'css',
  motif: 'grid',

  files: [{ path: 'registry/ui/month-view-grid.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: ['@internationalized/date@^3.12.4'],

  summary:
    'The month page of the calendar template: a grey frame, weekday headers and six rows of rounded day cells. Days before and after the month are muted but keep their events in full colour. Each day lists its events as compact kit chips at the bottom of the cell; past `maxVisible` the rest collapse into a "+N more" button on the date line, which selects the day and calls `onShowMore`. The selected day gets an accent pill and today an accent number. It is an ARIA grid with a single tab stop: arrows, Home / End and Page Up / Page Down move focus and turn the month when needed. Below 560px of its own width the cells swap chips for colour dots. `renderEvent` wraps chips, for example in an EventDetailPopover, and `eventsOnDay` feeds an agenda panel.',

  mechanism: [
    'The grid always shows 42 days starting at `startOfWeek(startOfMonth(month), locale, firstDayOfWeek)`, so every month has the same six rows and the layout never jumps. `month`, `selectedDate` and the focused day are each controlled or uncontrolled independently.',
    'One memoised pass sorts the events (all-day first, then start, longer first) and buckets them by every visible day they touch; an event ending exactly at midnight stops the day before, so all-day events stored midnight to midnight cover the right days. Each cell shows the first `maxVisible` and counts the rest for "+N more", which sits on the number line so it never costs a chip row.',
    'Roving focus: exactly one gridcell has `tabIndex=0`, the focused day if it is on screen, else the selected day, else today, else the 1st. The chips and "+N more" inside that cell are tabbable; all others are `-1`, so Tab enters the grid once and leaves after the active day.',
    'A single `onKeyDown` on the grid acts only when the target is a gridcell (keys on chips, buttons and portaled popovers are left alone). It reads the day from `data-date`, moves ±1 day (mirrored in RTL), ±7 days, to `startOfWeek` / `endOfWeek`, or ±1 month (Shift: ±1 year), calls `onMonthChange` when the target leaves the month, and sets a flag so an effect focuses `[data-date=…]` after the new month renders.',
    'Cells carry `--cell-min-h = 34 + 24 × maxVisible` px and use it only at container widths of 560px and up (`@min-[560px]:min-h-(--cell-min-h)`); narrower, they drop to 48px with up to three colour dots and the header shows narrow weekday letters.',
  ],

  constants: [
    { name: 'weeks', value: '6 (42 days)', why: 'Months span four to six weeks; always drawing six keeps the grid height fixed when paging.' },
    { name: 'maxVisible', value: '3 (demo 2)', why: 'Three 22px chips fill a ~110px cell; the demo uses two so six rows fit in 560px.' },
    { name: 'cell min height', value: '34 + 24 × maxVisible px', why: '12px padding, the 20px number line, a 4px gap and 22px chips with 2px gaps.' },
    { name: 'compact breakpoint', value: '560px container width', why: 'Below ~80px per column a chip cannot show a title, so cells switch to colour dots.' },
  ],

  pitfalls: [
    'Importing `compareDate` from @internationalized/date. It is not exported from the package entry; use `a.compare(b)` on the dates instead.',
    'Handling arrow keys for every keydown in the grid. React bubbles events from portaled popovers through their React parent, so a popover opened from a chip would move the grid focus; check that the target is a gridcell.',
    'Making every cell and chip tabbable. 42 cells and their chips turn Tab into a trap; keep one tab stop and move it with the arrows.',
    'Calling `.focus()` right after changing the month. The new cell is not in the DOM yet; set the focused day and focus it in an effect after the render.',
    'Formatting weekday names from a local `Date`. Server and browser zones can disagree about the day; the grid formats a fixed UTC noon built from the calendar fields.',
  ],

  notes: [
    'Clicking a muted outside day selects it without turning the month; arrowing onto it does turn the month, as a focused cell must stay in the visible month to keep the tab stop predictable.',
    '`eventsOnDay(events, day)` is exported and uses the same multi-day and midnight rules, for agenda or side panels.',
    'Pass `selectedEventId` to ring the chip whose popover is open.',
    'Multi-day events render a chip on every day they touch. When wrapping chips in popovers, key the open state on the event and the `day` argument, or one click opens a popover per day.',
  ],

  apiSignature:
    'function MonthViewGrid(props: { events: CalendarEvent[]; month?: CalendarDate; defaultMonth?: CalendarDate; onMonthChange?: (month: CalendarDate) => void; selectedDate?: CalendarDate | null; defaultSelectedDate?: CalendarDate | null; onSelectedDateChange?: (date: CalendarDate) => void; today?: CalendarDate; firstDayOfWeek?: DayOfWeek; selectedEventId?: string | null; maxVisible?: number; onShowMore?: (date: CalendarDate, events: CalendarEvent[]) => void; onEventClick?: (event: CalendarEvent) => void; renderEvent?: (event: CalendarEvent, chip: ReactElement, day: CalendarDate) => ReactNode; locale?: string; hourCycle?: 12 | 24; "aria-label"?: string; className?: string }): JSX.Element\nfunction eventsOnDay(events: CalendarEvent[], day: CalendarDate): CalendarEvent[]',

  props: [
    { name: 'events', type: 'CalendarEvent[]', description: 'Timed and all-day events; multi-day events appear on each day.' },
    { name: 'month / defaultMonth / onMonthChange', type: 'CalendarDate', description: 'Any day in the month to show; called with the 1st when keyboard navigation leaves the month.' },
    { name: 'selectedDate / defaultSelectedDate / onSelectedDateChange', type: 'CalendarDate | null', default: 'null', description: 'The day with the accent pill; set by click, Enter, Space or "+N more".' },
    { name: 'today', type: 'CalendarDate', description: 'Accent number and initial tab stop. Never read from the clock inside.' },
    { name: 'firstDayOfWeek', type: "'sun' | 'mon' | … | 'sat'", default: 'locale', description: 'First column.' },
    { name: 'maxVisible', type: 'number', default: '3', description: 'Chips per day before "+N more".' },
    { name: 'onShowMore', type: '(date, events) => void', description: '"+N more" was pressed; the day is selected too.' },
    { name: 'selectedEventId', type: 'string | null', description: 'Rings the matching chip.' },
    { name: 'onEventClick', type: '(event) => void', description: 'Called when a chip is pressed.' },
    { name: 'renderEvent', type: '(event, chip, day) => ReactNode', description: 'Wrap each chip, for example in an EventDetailPopover; key open state on the day too, since multi-day events render once per day.' },
    { name: 'hourCycle', type: '12 | 24', default: '24', description: 'Chip times.' },
    { name: 'locale', type: 'string', default: '"en-US"', description: 'Weekday names, first day of week, labels.' },
  ],

  reducedMotion:
    'Nothing moves: paging swaps the cells instantly and focus jumps without scrolling animation. The only transitions are 150ms colour changes on "+N more" (dropped under `motion-reduce`) and the kit chip hover brightness and selection ring, which change no position or size.',

  cleanup:
    'One effect focuses the new cell after a keyboard move and returns nothing; there are no listeners, timers or observers outside React handlers. Formatters are cached in a module-level map.',

  acceptance:
    'August 2026 opens with Jul 26 to Sep 5 in six rows, July and September days muted with their Coffee, Payday and Payday chips still coloured. Thursday the 20th shows a selected pill, two chips and "+4 more"; the side panel lists its six events. Clicking a cell moves the pill and the panel. With a cell focused, ArrowRight / ArrowDown move by a day and a week, Page Down turns to September and focuses the same date, and Page Up returns. Holidays repeats on the 11th to 13th. Clicking a chip opens its details popover; Delete removes it, updates "+N more" and offers Undo. At 360px the cells show colour dots.',

  criticalRegion: 'critical',
};

export default meta;
