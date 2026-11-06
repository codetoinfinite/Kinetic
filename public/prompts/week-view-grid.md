# Build: Week View Grid

A week calendar in the template style: a grey frame holding seven white rounded day columns, a 52px hour gutter and a sticky header with the weekday and date, today in an accent pill. Timed events are absolutely positioned from their start and duration with the kit event chip; events that overlap share the column in equal slices. All-day events span their days in a row under the header. A red now-line and time pill mark the fixed `now` you pass in. The body scrolls inside its own box, opening at `scrollToHour`, and on narrow screens it scrolls sideways with the gutter pinned. `renderEvent` lets each chip be wrapped, for example in an EventDetailPopover.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Seven-day time grid: hour gutter, day columns, events placed by start and duration, overlaps side by side, a fixed now-line.

- Category: display
- Runtime cost: css
- Dependencies: @internationalized/date@^3.12.4

## How it works

1. The seven days come from `startOfWeek(week, locale, firstDayOfWeek)`, so en-US starts on Sunday unless you override it. One CSS grid template, `52px repeat(7, minmax(0, 1fr))`, is shared by the header, the all-day row and the body, so the columns line up.
2. `layoutDayEvents` clips each timed event to the day with a UTC day difference (minutes from midnight, negative before the day) and the visible hours, then sorts by start, longer first. It walks the list once: an event that starts after the cluster has ended closes it; inside a cluster the event takes the first column that is free, or opens a new one. Every member of a cluster then gets `columns` equal to the cluster width.
3. Each block is `top = (start − startHour·60) × hourHeight / 60`, height its duration in px (at least 22px; blocks under 40px switch to the one-line compact chip so a 15 minute stand-up still shows its title and time), left `col / cols` of the column plus 2px and width `1 / cols` minus 4px. Overlap is judged on the drawn height, so padded short events never cover the next one.
4. The header row is `position: sticky; top: 0` inside the scroll box and the gutter cells are `sticky; left: 0`, both on the frame colour, so the hours and day names stay put in either scroll direction. Hour lines are absolutely placed 1px borders behind the events.
5. When `now` falls in the week and inside the hour range, its column gets a 2px red line with a dot at the start edge and the gutter shows the time in a red pill at the same offset. A single effect sets `scrollTop` to `scrollToHour` on mount.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `hourHeight = 48px`
  Half an hour is 24px, enough for a one-line title; a full working day (8–18) fits a 480px box.
- `minimum block height = 22px`
  The compact chip height, so 15 minute events stay legible and clickable.
- `compact threshold = 40px`
  Under this the full chip cannot fit a title line and the time line, so short blocks render the one-line compact chip.
- `gutter = 52px`
  Holds "10:42" in the now pill and "11 PM" in 12-hour mode without wrapping.
- `min width = 640px`
  Below this the seven columns get too narrow for titles, so the body scrolls sideways instead.
- `scrollToHour = 8`
  Opens on the working day instead of midnight.

## API

```ts
function WeekViewGrid(props: { events: CalendarEvent[]; week: CalendarDate; firstDayOfWeek?: DayOfWeek; startHour?: number; endHour?: number; hourHeight?: number; scrollToHour?: number; now?: CalendarDateTime; height?: number; selectedEventId?: string | null; onEventClick?: (event: CalendarEvent) => void; renderEvent?: (event: CalendarEvent, chip: ReactElement) => ReactNode; locale?: string; hourCycle?: 12 | 24; "aria-label"?: string; className?: string }): JSX.Element
function layoutDayEvents(events: CalendarEvent[], day: CalendarDate, options: { startHour: number; endHour: number; hourHeight: number; minHeight: number }): WeekEventLayout[]
```

- `events: CalendarEvent[]`
  Timed and all-day events; any outside the week are ignored.
- `week: CalendarDate`
  Any day of the week to show.
- `firstDayOfWeek: 'sun' | 'mon' | … | 'sat'` — default `locale`
  First column.
- `startHour / endHour: number` — default `0 / 24`
  Visible hour range.
- `hourHeight: number` — default `48`
  Pixels per hour.
- `scrollToHour: number` — default `8`
  Hour scrolled to the top on mount.
- `now: CalendarDateTime`
  Draws the now-line and highlights today. Never read from the clock inside.
- `height: number` — default `520`
  Height of the scrolling box in px.
- `selectedEventId: string | null`
  Rings the matching chip.
- `onEventClick: (event) => void`
  Called when a chip is pressed.
- `renderEvent: (event, chip) => ReactNode`
  Wrap each chip, for example in an EventDetailPopover.
- `hourCycle: 12 | 24` — default `24`
  Hour labels and chip times.
- `locale: string` — default `"en-US"`
  Weekday names, first day of week, times.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/**
 * Places one day's timed events. Events are clipped to the day and the hour
 * range, sorted by start (longer first), and walked once: an event that starts
 * after everything so far has ended opens a new cluster; inside a cluster each
 * event takes the first column whose last event has ended, or a new column.
 * Every event in a cluster then shares its width by the cluster's column count.
 */
export function layoutDayEvents(events: CalendarEvent[], day: CalendarDate, options: LayoutOptions): WeekEventLayout[] {
  const { startHour, endHour, hourHeight, minHeight } = options;
  const perMinute = hourHeight / 60;
  const from = startHour * 60;
  const to = endHour * 60;
  const total = (to - from) * perMinute;

  const items = events
    .filter((event) => !event.allDay)
    .map((event) => ({
      event,
      start: Math.max(minutesInto(day, event.start), from),
      end: Math.min(minutesInto(day, event.end), to),
    }))
    .filter((item) => item.end > item.start)
    .sort((a, b) => a.start - b.start || b.end - a.end);

  const placed: WeekEventLayout[] = [];
  let cluster: WeekEventLayout[] = [];
  let columnEnds: number[] = [];
  let clusterEnd = -Infinity;
  const closeCluster = () => {
    for (const item of cluster) item.columns = columnEnds.length;
    cluster = [];
    columnEnds = [];
  };

  for (const item of items) {
    const height = Math.max((item.end - item.start) * perMinute, minHeight);
    const top = Math.min((item.start - from) * perMinute, total - height);
    // Overlap is judged on the drawn block, so short events padded to
    // minHeight never cover the next one.
    const drawnEnd = item.start + height / perMinute;
    if (item.start >= clusterEnd) closeCluster();
    let column = columnEnds.findIndex((end) => end <= item.start);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(drawnEnd);
    } else {
      columnEnds[column] = drawnEnd;
    }
    const layout = { event: item.event, top, height, column, columns: 1 };
    cluster.push(layout);
    placed.push(layout);
    clusterEnd = Math.max(clusterEnd, drawnEnd);
  }
  closeCluster();
  return placed;
}

export interface WeekViewGridProps {
  events: CalendarEvent[];
  /** Any day in the week to show. */
  week: CalendarDate;
  /** First column; defaults to the locale's first day of the week (Sunday in en-US). */
  firstDayOfWeek?: DayOfWeek;
  /** First and last hour rows. Default 0 and 24. */
  startHour?: number;
  endHour?: number;
  /** Pixel height of one hour. Default 48. */
  hourHeight?: number;
  /** Hour scrolled to the top on mount. Default 8. */
  scrollToHour?: number;
  /** Draws the now-line and highlights today. Pass a fixed value; the grid never reads the clock. */
  now?: CalendarDateTime;
  /** Height of the scrolling area in px. Default 520. */
  height?: number;
  selectedEventId?: string | null;
  onEventClick?: (event: CalendarEvent) => void;
  /** Wrap each chip, for example in an EventDetailPopover. */
  renderEvent?: (event: CalendarEvent, chip: ReactElement) => ReactNode;
  locale?: string;
  hourCycle?: HourCycle;
  "aria-label"?: string;
  className?: string;
  ref?: Ref<HTMLElement>;
}

const GRID_COLUMNS = "grid grid-cols-[52px_repeat(7,minmax(0,1fr))] gap-x-1.5";
/** Below this height (px) a block has no room for the time line, so it uses the compact chip. */
const SHORT_BLOCK = 40;
/**
 * Slices of an overlap cluster are narrow: tighter padding and a one-line
 * caption-size title with an ellipsis, so "Planning" reads "Plann…" instead of
 * wrapping mid-word to "Plannin / g". The popover shows the full title.
 */
const NARROW_CHIP =
  "ps-1 pe-0.5 [&>span:first-child]:block [&>span:first-child]:truncate [&>span:first-child]:text-caption-1-medium";

export function WeekViewGrid({
  events,
  week,
  firstDayOfWeek,
  startHour = 0,
  endHour = 24,
  hourHeight = 48,
  scrollToHour = 8,
  now,
  height = 520,
  selectedEventId = null,
  onEventClick,
  renderEvent,
  locale = "en-US",
  hourCycle = 24,
  "aria-label": ariaLabel,
  className,
  ref,
}: WeekViewGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const first = startOfWeek(week, locale, firstDayOfWeek);
  const days = Array.from({ length: 7 }, (_, i) => first.add({ days: i }));
  const last = days[6] ?? first;
  const hours = Array.from({ length: Math.max(endHour - startHour, 1) }, (_, i) => startHour + i);
  const bodyHeight = hours.length * hourHeight;
  const todayIndex = now ? daysBetween(now, first) : -1;
  const nowMinutes = now ? now.hour * 60 + now.minute : 0;
  const showNow = todayIndex >= 0 && todayIndex < 7 && nowMinutes >= startHour * 60 && nowMinutes <= endHour * 60;
  const nowTop = ((nowMinutes - startHour * 60) * hourHeight) / 60;

  // Scroll the working hours into view once the grid mounts (and when the
  // target hour changes). Plain scrollTop: no listener, nothing to clean up.
  useEffect(() => {
    const el = scrollRef.current;
    // 12px of slack keeps the target hour's label clear of the sticky header.
    if (el) el.scrollTop = Math.max(0, (scrollToHour - startHour) * hourHeight - 12);
  }, [scrollToHour, startHour, hourHeight]);

  const allDay = events
    .filter((event) => event.allDay)
    .map((event) => ({
      event,
      from: Math.max(daysBetween(event.start, first), 0),
      to: Math.min(daysBetween(lastDayOf(event), first), 6),
    }))
    .filter((span) => span.to >= span.from && span.from <= 6 && span.to >= 0)
    .sort((a, b) => a.from - b.from || b.to - a.to);

  const chipFor = (event: CalendarEvent, variant: "compact" | "full", chipClassName?: string) => {
    const chip = (
      <CalendarEventChip
        variant={variant}
        className={chipClassName}
        title={event.title}
        color={event.color}
        start={event.start}
        end={event.end}
        allDay={event.allDay}
        selected={selectedEventId === event.id}
        locale={locale}
        hourCycle={hourCycle}
        onClick={onEventClick ? () => onEventClick(event) : undefined}
      />
    );
    return renderEvent ? renderEvent(event, chip) : chip;
  };

  const label =
    ariaLabel ??
    `Week of ${formatDay(first, locale, { month: "long", day: "numeric" })} – ${formatDay(last, locale, {
      month: "long",
      day: "numeric",
      year: "numeric",
    })}`;

  return (
    <section
      ref={ref}
      aria-label={label}
      className={cx("flex w-full flex-col overflow-hidden rounded-[20px] bg-background-secondary-default", className)}
    >
      <div ref={scrollRef} className="relative overflow-auto overscroll-contain" style={{ height }}>
        <div className="min-w-[640px] px-2 pb-2">
          <div className="sticky top-0 z-20 bg-background-secondary-default pt-2 pb-1.5">
            <div className={GRID_COLUMNS}>
              <div aria-hidden className="sticky left-0 z-10 bg-background-secondary-default" />
              {days.map((day, i) => {
                const isToday = i === todayIndex;
                return (
                  <div key={day.toString()} aria-hidden className="flex flex-col items-center gap-0.5 py-0.5">
                    <span className="text-caption-1-medium text-text-secondary">
                      {formatDay(day, locale, { weekday: "short" })}
                    </span>
                    <span
                      className={cx(
                        "flex size-7 items-center justify-center rounded-full text-body-2-medium tabular-nums",
                        isToday ? "bg-accent-500 text-text-white" : "text-text-primary",
                      )}
                    >
                      {day.day}
                    </span>
                  </div>
                );
              })}
            </div>
            {allDay.length > 0 ? (
              <div className={cx(GRID_COLUMNS, "mt-1.5")}>
                <div className="sticky left-0 z-10 flex items-start justify-end bg-background-secondary-default pe-2 pt-1 text-caption-2-medium text-text-tertiary">
                  All day
                </div>
                <ul className="col-span-7 grid grid-flow-row-dense grid-cols-7 gap-x-1.5 gap-y-1">
                  {allDay.map(({ event, from, to }) => (
                    <li key={event.id} className="min-w-0" style={{ gridColumn: `${from + 1} / ${to + 2}` }}>
                      {chipFor(event, "compact")}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className={GRID_COLUMNS} style={{ height: bodyHeight }}>
            <div aria-hidden className="sticky left-0 z-10 bg-background-secondary-default">
              {hours.slice(1).map((hour, i) => (
                <span
                  key={hour}
                  className="absolute end-2 -translate-y-1/2 text-caption-2-regular tabular-nums text-text-tertiary"
                  style={{ top: (i + 1) * hourHeight }}
                >
                  {formatEventTime({ hour, minute: 0 }, { locale, hourCycle })}
                </span>
              ))}
              {showNow && now ? (
                <span
                  className="absolute end-1 z-[1] -translate-y-1/2 rounded-[5px] bg-text-error-primary px-1 text-caption-2-semibold tabular-nums text-text-white"
                  style={{ top: nowTop }}
                >
                  {formatEventTime(now, { locale, hourCycle })}
                </span>
              ) : null}
            </div>

            {days.map((day, i) => (
              <div
                key={day.toString()}
                role="group"
                aria-label={`${formatDay(day, locale, { weekday: "long", month: "long", day: "numeric" })}${i === todayIndex ? ", today" : ""}`}
                className="relative rounded-xl bg-background-primary-default"
              >
                <div aria-hidden className="pointer-events-none absolute inset-0">
                  {hours.slice(1).map((hour, h) => (
                    <div
                      key={hour}
                      className="absolute inset-x-0 border-t border-border-table dark:border-border-button-group"
                      style={{ top: (h + 1) * hourHeight }}
                    />
                  ))}
                </div>
                {layoutDayEvents(events, day, { startHour, endHour, hourHeight, minHeight: 22 }).map((item) => {
                  const style: CSSProperties = {
                    top: item.top,
                    height: item.height,
                    insetInlineStart: `calc(${(item.column / item.columns) * 100}% + 2px)`,
                    width: `calc(${100 / item.columns}% - 4px)`,
                  };
                  return (
                    // Blocks too short for title and time fall back to the one-line chip;
                    // in a narrow slice it drops the time so the title keeps the room.
                    <div key={item.event.id} className="absolute z-[1] flex" style={style}>
                      {item.height < SHORT_BLOCK
                        ? chipFor(item.event, "compact", cx("h-full", item.columns > 1 && "px-1 [&>span+span]:hidden"))
                        : chipFor(item.event, "full", item.columns > 1 ? NARROW_CHIP : undefined)}
                    </div>
                  );
                })}
                {showNow && i === todayIndex ? (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 z-[2] h-0.5 -translate-y-1/2 bg-text-error-primary"
                    style={{ top: nowTop }}
                  >
                    <span className="absolute -start-1 top-1/2 size-2 -translate-y-1/2 rounded-full bg-text-error-primary" />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** One mount effect assigns `scrollTop` and returns nothing; there are no listeners, timers or observers. Formatters are cached in a module-level map.

**Reduced motion.** Nothing moves. The grid opens already scrolled to `scrollToHour` with an instant `scrollTop`, never a smooth scroll; the only transition is the kit chip's 150ms hover brightness and selection ring, which changes no position or size.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Reading the clock for the now-line during render. Server and client disagree by the time they hydrate; take `now` as a prop and update it from a timer in the caller if it should move.
- Measuring overlap on raw times when short events are padded to a minimum height. Two back-to-back 10 minute events would draw on top of each other; compare the drawn end instead.
- Wrapping chips in a popover inside the scroll box. React Aria closes an open popover when an ancestor of its trigger scrolls, which is the right behaviour but means scrolling the grid dismisses it.
- Giving each day its own grid. Columns drift as content changes; share one grid template for header, all-day row and body.

## Notes

- `layoutDayEvents` is exported for custom day or resource views.
- An event that ends exactly at midnight belongs to the day it started for the all-day row, so a one-day all-day event can be stored as midnight to midnight.
- Pass `startHour` / `endHour` to show only working hours; events outside are clipped to the edges.

## Definition of done

The week of August 16 2026 opens scrolled to 08:00 with Sun 16 to Sat 22 in the header and 20 in an accent pill. Planning and Design crit on Monday sit side by side at half width; Retro, Demo day and Wrap-up on Friday split three ways where they overlap. Payday spans Wednesday and Holidays spans Friday and Saturday in the all-day row. A red line and a "10:42" pill mark Thursday. Clicking Stand-up opens its details popover; Delete removes the block, lowers the count and offers Undo. At 360px the body scrolls sideways with the hour gutter pinned.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
