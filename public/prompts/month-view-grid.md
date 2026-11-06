# Build: Month View Grid

The month page of the calendar template: a grey frame, weekday headers and six rows of rounded day cells. Days before and after the month are muted but keep their events in full colour. Each day lists its events as compact kit chips at the bottom of the cell; past `maxVisible` the rest collapse into a "+N more" button on the date line, which selects the day and calls `onShowMore`. The selected day gets an accent pill and today an accent number. It is an ARIA grid with a single tab stop: arrows, Home / End and Page Up / Page Down move focus and turn the month when needed. Below 560px of its own width the cells swap chips for colour dots. `renderEvent` wraps chips, for example in an EventDetailPopover, and `eventsOnDay` feeds an agenda panel.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Six-week month calendar: muted outside days, event chips per day with "+N more", a selected-day pill and full arrow-key navigation.

- Category: display
- Runtime cost: css
- Dependencies: @internationalized/date@^3.12.4

## How it works

1. The grid always shows 42 days starting at `startOfWeek(startOfMonth(month), locale, firstDayOfWeek)`, so every month has the same six rows and the layout never jumps. `month`, `selectedDate` and the focused day are each controlled or uncontrolled independently.
2. One memoised pass sorts the events (all-day first, then start, longer first) and buckets them by every visible day they touch; an event ending exactly at midnight stops the day before, so all-day events stored midnight to midnight cover the right days. Each cell shows the first `maxVisible` and counts the rest for "+N more", which sits on the number line so it never costs a chip row.
3. Roving focus: exactly one gridcell has `tabIndex=0`, the focused day if it is on screen, else the selected day, else today, else the 1st. The chips and "+N more" inside that cell are tabbable; all others are `-1`, so Tab enters the grid once and leaves after the active day.
4. A single `onKeyDown` on the grid acts only when the target is a gridcell (keys on chips, buttons and portaled popovers are left alone). It reads the day from `data-date`, moves ±1 day (mirrored in RTL), ±7 days, to `startOfWeek` / `endOfWeek`, or ±1 month (Shift: ±1 year), calls `onMonthChange` when the target leaves the month, and sets a flag so an effect focuses `[data-date=…]` after the new month renders.
5. Cells carry `--cell-min-h = 34 + 24 × maxVisible` px and use it only at container widths of 560px and up (`@min-[560px]:min-h-(--cell-min-h)`); narrower, they drop to 48px with up to three colour dots and the header shows narrow weekday letters.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `weeks = 6 (42 days)`
  Months span four to six weeks; always drawing six keeps the grid height fixed when paging.
- `maxVisible = 3 (demo 2)`
  Three 22px chips fill a ~110px cell; the demo uses two so six rows fit in 560px.
- `cell min height = 34 + 24 × maxVisible px`
  12px padding, the 20px number line, a 4px gap and 22px chips with 2px gaps.
- `compact breakpoint = 560px container width`
  Below ~80px per column a chip cannot show a title, so cells switch to colour dots.

## API

```ts
function MonthViewGrid(props: { events: CalendarEvent[]; month?: CalendarDate; defaultMonth?: CalendarDate; onMonthChange?: (month: CalendarDate) => void; selectedDate?: CalendarDate | null; defaultSelectedDate?: CalendarDate | null; onSelectedDateChange?: (date: CalendarDate) => void; today?: CalendarDate; firstDayOfWeek?: DayOfWeek; selectedEventId?: string | null; maxVisible?: number; onShowMore?: (date: CalendarDate, events: CalendarEvent[]) => void; onEventClick?: (event: CalendarEvent) => void; renderEvent?: (event: CalendarEvent, chip: ReactElement, day: CalendarDate) => ReactNode; locale?: string; hourCycle?: 12 | 24; "aria-label"?: string; className?: string }): JSX.Element
function eventsOnDay(events: CalendarEvent[], day: CalendarDate): CalendarEvent[]
```

- `events: CalendarEvent[]`
  Timed and all-day events; multi-day events appear on each day.
- `month / defaultMonth / onMonthChange: CalendarDate`
  Any day in the month to show; called with the 1st when keyboard navigation leaves the month.
- `selectedDate / defaultSelectedDate / onSelectedDateChange: CalendarDate | null` — default `null`
  The day with the accent pill; set by click, Enter, Space or "+N more".
- `today: CalendarDate`
  Accent number and initial tab stop. Never read from the clock inside.
- `firstDayOfWeek: 'sun' | 'mon' | … | 'sat'` — default `locale`
  First column.
- `maxVisible: number` — default `3`
  Chips per day before "+N more".
- `onShowMore: (date, events) => void`
  "+N more" was pressed; the day is selected too.
- `selectedEventId: string | null`
  Rings the matching chip.
- `onEventClick: (event) => void`
  Called when a chip is pressed.
- `renderEvent: (event, chip, day) => ReactNode`
  Wrap each chip, for example in an EventDetailPopover; key open state on the day too, since multi-day events render once per day.
- `hourCycle: 12 | 24` — default `24`
  Chip times.
- `locale: string` — default `"en-US"`
  Weekday names, first day of week, labels.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function MonthViewGrid({
  events,
  month: controlledMonth,
  defaultMonth,
  onMonthChange,
  selectedDate: controlledSelected,
  defaultSelectedDate = null,
  onSelectedDateChange,
  today,
  firstDayOfWeek,
  selectedEventId,
  maxVisible = 3,
  onShowMore,
  onEventClick,
  renderEvent,
  locale = "en-US",
  hourCycle = 24,
  "aria-label": ariaLabel,
  className,
  ref,
}: MonthViewGridProps) {
  const [ownMonth, setOwnMonth] = useState<CalendarDate | undefined>(defaultMonth);
  const [ownSelected, setOwnSelected] = useState<CalendarDate | null>(defaultSelectedDate);
  const [focused, setFocused] = useState<CalendarDate | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(false);

  const selected = controlledSelected !== undefined ? controlledSelected : ownSelected;
  const first = events[0];
  const month = startOfMonth(
    controlledMonth ?? ownMonth ?? selected ?? today ?? (first ? toCalendarDate(first.start) : parseDate("2026-01-01")),
  );
  const gridStart = startOfWeek(month, locale, firstDayOfWeek);
  // Always six weeks, so the grid keeps its height from month to month.
  const days = useMemo(() => Array.from({ length: 42 }, (_, i) => gridStart.add({ days: i })), [gridStart.toString()]); // eslint-disable-line react-hooks/exhaustive-deps
  const gridEnd = days[41] ?? gridStart;

  // Bucket events by the visible days they touch (multi-day events repeat on each day).
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of [...events].sort(byStart)) {
      let day = toCalendarDate(event.start);
      if (day.compare(gridStart) < 0) day = gridStart;
      const last = lastDayOf(event);
      for (; day.compare(last) <= 0 && day.compare(gridEnd) <= 0; day = day.add({ days: 1 })) {
        const key = day.toString();
        const list = map.get(key);
        if (list) list.push(event);
        else map.set(key, [event]);
      }
    }
    return map;
  }, [events, gridStart.toString()]); // eslint-disable-line react-hooks/exhaustive-deps

  // One tab stop: the focused day if it is on screen, else the selected day
  // in this month, else today in this month, else the 1st.
  const inGrid = (d: CalendarDate | null | undefined): d is CalendarDate =>
    !!d && d.compare(gridStart) >= 0 && d.compare(gridEnd) <= 0;
  const tabStop = inGrid(focused)
    ? focused
    : selected && isSameMonth(selected, month)
      ? selected
      : today && isSameMonth(today, month)
        ? today
        : month;

  // After a keyboard move (possibly to another month) focus the new cell
  // once it has rendered.
  useEffect(() => {
    if (!moveFocus.current || !focused) return;
    moveFocus.current = false;
    gridRef.current?.querySelector<HTMLElement>(`[data-date="${focused.toString()}"]`)?.focus();
  }, [focused, month]);

  const changeMonth = (next: CalendarDate) => {
    const start = startOfMonth(next);
    if (start.compare(month) === 0) return;
    setOwnMonth(start);
    onMonthChange?.(start);
  };
  const select = (date: CalendarDate) => {
    setOwnSelected(date);
    onSelectedDateChange?.(date);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const cell = e.target as HTMLElement;
    const iso = cell.dataset.date;
    // Keys pressed on a chip or "+N more" belong to that button.
    if (!iso || cell.getAttribute("role") !== "gridcell") return;
    const from = parseDate(iso);
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      select(from);
      return;
    }
    if (!NAV_KEYS.has(e.key)) return;
    e.preventDefault();
    const rtl = getComputedStyle(cell).direction === "rtl";
    const step = { ArrowLeft: rtl ? 1 : -1, ArrowRight: rtl ? -1 : 1, ArrowUp: -7, ArrowDown: 7 } as Record<string, number>;
    let to: CalendarDate;
    if (e.key in step) to = from.add({ days: step[e.key] ?? 0 });
    else if (e.key === "Home") to = startOfWeek(from, locale, firstDayOfWeek);
    else if (e.key === "End") to = endOfWeek(from, locale, firstDayOfWeek);
    else to = from.add(e.shiftKey ? { years: e.key === "PageUp" ? -1 : 1 } : { months: e.key === "PageUp" ? -1 : 1 });
    moveFocus.current = true;
    setFocused(to);
    if (!isSameMonth(to, month)) changeMonth(to);
  };

  const weekdays = days.slice(0, 7);
  const rows = Array.from({ length: 6 }, (_, r) => days.slice(r * 7, r * 7 + 7));
  // 12px padding + 20px number line + 4px gap + 22px chips with 2px gaps.
  const cellStyle = { "--cell-min-h": `${34 + maxVisible * 24}px` } as CSSProperties;

  return (
    <div
      ref={ref}
      className={cx("@container w-full rounded-[20px] bg-background-secondary-default p-1.5", className)}
    >
      <div
        ref={gridRef}
        role="grid"
        aria-label={ariaLabel ?? formatDay(month, locale, { month: "long", year: "numeric" })}
        onKeyDown={onKeyDown}
        className="flex flex-col gap-1"
      >
        <div role="row" className="grid grid-cols-7 gap-1 @min-[560px]:gap-x-1.5">
          {weekdays.map((day) => (
            <div
              key={day.toString()}
              role="columnheader"
              aria-label={formatDay(day, locale, { weekday: "long" })}
              className="py-1 text-center text-caption-1-medium text-text-secondary"
            >
              <span className="@min-[560px]:hidden">{formatDay(day, locale, { weekday: "narrow" })}</span>
              <span className="hidden @min-[560px]:inline">{formatDay(day, locale, { weekday: "short" })}</span>
            </div>
          ))}
        </div>

        {rows.map((week) => (
          <div key={week[0]?.toString()} role="row" className="grid grid-cols-7 gap-1 @min-[560px]:gap-x-1.5">
            {week.map((day) => {
              const key = day.toString();
              const list = byDay.get(key) ?? [];
              const outside = !isSameMonth(day, month);
              const isSelected = !!selected && isSameDay(day, selected);
              const isToday = !!today && isSameDay(day, today);
              const isStop = isSameDay(day, tabStop);
              // "+N more" shares the number's line, so it never costs a chip row.
              const shown = list.slice(0, maxVisible);
              const hidden = list.length - shown.length;
              const name = `${formatDay(day, locale, { weekday: "long", month: "long", day: "numeric" })}${
                isToday ? ", today" : ""
              }${list.length ? `, ${list.length} ${list.length === 1 ? "event" : "events"}` : ""}`;

              return (
                <div
                  key={key}
                  role="gridcell"
                  data-date={key}
                  data-outside-month={outside || undefined}
                  data-today={isToday || undefined}
                  aria-selected={isSelected}
                  aria-label={name}
                  tabIndex={isStop ? 0 : -1}
                  style={cellStyle}
                  onClick={() => {
                    setFocused(day);
                    select(day);
                  }}
                  onFocus={(e) => {
                    if (e.target === e.currentTarget) setFocused(day);
                  }}
                  className={cx(
                    "flex min-h-10 min-w-0 cursor-default flex-col gap-1 rounded-lg p-1 outline-none @min-[560px]:min-h-(--cell-min-h) @min-[560px]:rounded-xl @min-[560px]:p-1.5",
                    "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                    outside
                      ? "bg-background-tertiary-default dark:bg-background-inner-default"
                      : "bg-background-primary-default",
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      aria-hidden
                      className={cx(
                        "flex h-5 min-w-6 items-center justify-center rounded-full px-1.5 tabular-nums",
                        isToday ? "text-body-2-semibold" : "text-body-2-medium",
                        isSelected
                          ? "bg-accent-500 text-text-white"
                          : isToday
                            ? "text-accent-500"
                            : outside
                              ? "text-text-secondary"
                              : "text-text-primary",
                      )}
                    >
                      {day.day}
                    </span>
                    {hidden > 0 ? (
                      <button
                        type="button"
                        tabIndex={isStop ? 0 : -1}
                        aria-label={`${hidden} more on ${formatDay(day, locale, { month: "long", day: "numeric" })}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFocused(day);
                          select(day);
                          onShowMore?.(day, list);
                        }}
                        className="hidden h-5 truncate rounded-md px-1 text-caption-2-semibold text-text-secondary outline-none transition-colors duration-150 ease-out hover:bg-background-secondary-default hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring motion-reduce:transition-none @min-[560px]:block"
                      >
                        +{hidden} more
                      </button>
                    ) : null}
                  </div>

                  {list.length > 0 ? (
                    <>
                      <ul className="mt-auto hidden min-w-0 flex-col gap-0.5 @min-[560px]:flex">
                        {shown.map((event) => {
                          const chip = (
                            <CalendarEventChip
                              title={event.title}
                              color={event.color}
                              start={event.start}
                              end={event.end}
                              allDay={event.allDay}
                              locale={locale}
                              hourCycle={hourCycle}
                              selected={selectedEventId === event.id}
                              tabIndex={isStop ? 0 : -1}
                              onClick={onEventClick ? () => onEventClick(event) : undefined}
                            />
                          );
                          return (
                            <li key={event.id} className="flex min-w-0">
                              {renderEvent ? renderEvent(event, chip, day) : chip}
                            </li>
                          );
                        })}
                      </ul>
                      <div aria-hidden className="mt-auto flex justify-center gap-0.5 pb-0.5 @min-[560px]:hidden">
                        {list.slice(0, 3).map((event) => (
                          <span key={event.id} className={cx("size-1.5 rounded-full", calendarEventColorStyles[event.color].dot)} />
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** One effect focuses the new cell after a keyboard move and returns nothing; there are no listeners, timers or observers outside React handlers. Formatters are cached in a module-level map.

**Reduced motion.** Nothing moves: paging swaps the cells instantly and focus jumps without scrolling animation. The only transitions are 150ms colour changes on "+N more" (dropped under `motion-reduce`) and the kit chip hover brightness and selection ring, which change no position or size.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Importing `compareDate` from @internationalized/date. It is not exported from the package entry; use `a.compare(b)` on the dates instead.
- Handling arrow keys for every keydown in the grid. React bubbles events from portaled popovers through their React parent, so a popover opened from a chip would move the grid focus; check that the target is a gridcell.
- Making every cell and chip tabbable. 42 cells and their chips turn Tab into a trap; keep one tab stop and move it with the arrows.
- Calling `.focus()` right after changing the month. The new cell is not in the DOM yet; set the focused day and focus it in an effect after the render.
- Formatting weekday names from a local `Date`. Server and browser zones can disagree about the day; the grid formats a fixed UTC noon built from the calendar fields.

## Notes

- Clicking a muted outside day selects it without turning the month; arrowing onto it does turn the month, as a focused cell must stay in the visible month to keep the tab stop predictable.
- `eventsOnDay(events, day)` is exported and uses the same multi-day and midnight rules, for agenda or side panels.
- Pass `selectedEventId` to ring the chip whose popover is open.
- Multi-day events render a chip on every day they touch. When wrapping chips in popovers, key the open state on the event and the `day` argument, or one click opens a popover per day.

## Definition of done

August 2026 opens with Jul 26 to Sep 5 in six rows, July and September days muted with their Coffee, Payday and Payday chips still coloured. Thursday the 20th shows a selected pill, two chips and "+4 more"; the side panel lists its six events. Clicking a cell moves the pill and the panel. With a cell focused, ArrowRight / ArrowDown move by a day and a week, Page Down turns to September and focuses the same date, and Page Up returns. Holidays repeats on the 11th to 13th. Clicking a chip opens its details popover; Delete removes it, updates "+N more" and offers Undo. At 360px the cells show colour dots.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
