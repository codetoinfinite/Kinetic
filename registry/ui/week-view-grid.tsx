/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Week View Grid" (boardui.com/templates/calendar).
 * No BoardUI source was used.
 */
"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties, ReactElement, ReactNode, Ref } from "react";
import { DateFormatter, startOfWeek, toCalendarDate } from "@internationalized/date";
import type { CalendarDate, CalendarDateTime, DayOfWeek } from "@internationalized/date";
import { CalendarEventChip, formatEventTime } from "@/registry/ui/calendar-event-chip";
import type { CalendarEvent, HourCycle } from "@/registry/ui/calendar-event-chip";
import { cx } from "@/registry/lib/cx";

/**
 * A seven-day time grid in the calendar template's style: a grey frame,
 * one white rounded column per day, an hour gutter and a sticky header with
 * the day names and dates. Timed events are absolutely positioned by start
 * and duration; events that overlap split the column side by side. A fixed
 * now-line marks the `now` you pass in, and the grid scrolls internally
 * (vertically to the hours, horizontally on narrow screens with the gutter
 * pinned). All-day events span their days in a row under the header.
 */

const dayFormatters = new Map<string, DateFormatter>();

function formatDay(date: { year: number; month: number; day: number }, locale: string, options: Intl.DateTimeFormatOptions) {
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = dayFormatters.get(key);
  if (!formatter) {
    formatter = new DateFormatter(locale, { ...options, timeZone: "UTC" });
    dayFormatters.set(key, formatter);
  }
  return formatter.format(new Date(Date.UTC(date.year, date.month - 1, date.day, 12)));
}

type DayFields = { year: number; month: number; day: number };

/** Whole days from `b` to `a` (Gregorian fields; the package keeps its own helper private). */
function daysBetween(a: DayFields, b: DayFields) {
  return Math.round((Date.UTC(a.year, a.month - 1, a.day) - Date.UTC(b.year, b.month - 1, b.day)) / 86_400_000);
}

/** Minutes from the start of `day` to `at` (negative before, above 1440 after). */
function minutesInto(day: CalendarDate, at: CalendarDateTime) {
  return daysBetween(at, day) * 1440 + at.hour * 60 + at.minute;
}

/** The last calendar day an event touches; an end at exactly midnight belongs to the day before. */
function lastDayOf(event: CalendarEvent): CalendarDate {
  const end = toCalendarDate(event.end);
  const endsAtMidnight = event.end.hour === 0 && event.end.minute === 0 && daysBetween(event.end, event.start) > 0;
  return endsAtMidnight ? end.subtract({ days: 1 }) : end;
}

export interface WeekEventLayout {
  event: CalendarEvent;
  /** Pixels from the top of the day column. */
  top: number;
  height: number;
  /** Column inside its overlap cluster, and how many columns the cluster has. */
  column: number;
  columns: number;
}

export interface LayoutOptions {
  startHour: number;
  endHour: number;
  hourHeight: number;
  /** Shortest drawn block in px, so a 15 minute event still shows its title. */
  minHeight: number;
}

// #region critical
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
// #endregion
