/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Calendar" (boardui.com/templates/calendar).
 * No BoardUI source was used.
 */
"use client";

import { useEffect, useRef } from "react";
import { isSameDay, toCalendarDate, type CalendarDate } from "@internationalized/date";

import { CalendarEventChip, calendarEventColorStyles, type CalendarEvent } from "@/registry/ui/calendar-event-chip";
import { DateCalendar } from "@/registry/ui/date-calendar";
import { cx } from "@/registry/lib/cx";
import { WEEKDAYS, eventsOn, longDay, monthName, pad2, shortMonth, timeRange, weekdayName } from "@/registry/ui/calendar-template-parts";

export type EventPress = (event: CalendarEvent, target: HTMLElement) => void;

const DAY_NUMBER =
  "pointer-events-auto flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-caption-1-medium tabular-nums outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-border-focus-ring motion-reduce:transition-none";

/* ------------------------------------------------------------------ month */

export interface MonthGridProps {
  /** Six rows of seven days, Sunday first. */
  weeks: readonly (readonly CalendarDate[])[];
  /** The month being shown; other days are dimmed. */
  month: CalendarDate;
  events: readonly CalendarEvent[];
  today: CalendarDate;
  selectedId: string | null;
  onEventPress: EventPress;
  onDayOpen: (date: CalendarDate) => void;
  onCreate: (date: CalendarDate, hour: number) => void;
}

export function MonthGrid({ weeks, month, events, today, selectedId, onEventPress, onDayOpen, onCreate }: MonthGridProps) {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-[auto_repeat(6,minmax(0,1fr))] gap-px overflow-hidden rounded-2xl border border-separator-border bg-separator-border">
      {WEEKDAYS.map((name) => (
        <div
          key={name}
          className="bg-background-primary-default px-2.5 py-2 text-caption-1-medium text-text-tertiary dark:bg-background-secondary-default"
        >
          <abbr title={name} className="no-underline">
            {name.slice(0, 3)}
          </abbr>
        </div>
      ))}
      {weeks.flat().map((date) => {
        const inMonth = date.month === month.month;
        const isToday = isSameDay(date, today);
        const list = eventsOn(events, date);
        // Three fit a cell; a fourth turns the third slot into "+N more".
        const shown = list.length <= 3 ? list : list.slice(0, 2);
        const hidden = list.length - shown.length;
        return (
          <div
            key={date.toString()}
            data-date={date.toString()}
            className={cx(
              "relative flex min-h-0 flex-col gap-1 overflow-hidden p-1.5",
              inMonth ? "bg-background-primary-default dark:bg-background-secondary-default" : "bg-background-tertiary-default dark:bg-background-full",
            )}
          >
            {/* The cell itself: a click on empty space starts an event on that day. */}
            <button
              type="button"
              tabIndex={-1}
              aria-label={`New event on ${longDay(date)}`}
              onClick={() => onCreate(date, 9)}
              className="absolute inset-0 cursor-default outline-none"
            />
            <div className="pointer-events-none relative flex">
              <button
                type="button"
                aria-label={`${longDay(date)}, ${list.length} events. Open day`}
                aria-current={isToday ? "date" : undefined}
                onClick={() => onDayOpen(date)}
                className={cx(
                  DAY_NUMBER,
                  isToday
                    ? "bg-blue-500 text-text-white"
                    : inMonth
                      ? "text-text-primary hover:bg-background-secondary-hover"
                      : "text-text-tertiary hover:bg-background-quaternary-default",
                )}
              >
                {date.day === 1 ? `${shortMonth(date)} 1` : date.day}
              </button>
            </div>
            <div className="pointer-events-none relative mt-auto flex min-w-0 flex-col gap-0.5">
              {shown.map((event) => (
                <CalendarEventChip
                  key={event.id}
                  title={event.title}
                  color={event.color}
                  start={event.start}
                  allDay={event.allDay}
                  selected={event.id === selectedId}
                  aria-haspopup="dialog"
                  className="pointer-events-auto"
                  onClick={(e) => onEventPress(event, e.currentTarget)}
                />
              ))}
              {hidden > 0 ? (
                <button
                  type="button"
                  onClick={() => onDayOpen(date)}
                  className="pointer-events-auto self-start rounded-md px-1.5 text-caption-1-medium text-text-secondary outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                >
                  +{hidden} more
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------- time grid */

export const HOUR_PX = 48;
const HOURS = Array.from({ length: 24 }, (_, h) => h);
/** Shortest drawn block, so a 15-minute event still has a readable title. */
const MIN_BLOCK_MIN = 28;

interface Placed {
  event: CalendarEvent;
  col: number;
  cols: number;
}

const minutesOf = (t: { hour: number; minute: number }) => t.hour * 60 + t.minute;

/**
 * Side-by-side columns for overlapping events. Events are walked in start
 * order; a run of mutually reachable overlaps forms a cluster, each event
 * takes the first column whose last block has ended, and every event in the
 * cluster shares the cluster's column count.
 */
export function layoutDay(timed: readonly CalendarEvent[]): Placed[] {
  const sorted = [...timed].sort((a, b) => a.start.compare(b.start) || b.end.compare(a.end));
  const placed: Placed[] = [];
  let cluster: Placed[] = [];
  let columnEnds: number[] = [];
  let clusterEnd = -1;
  const flush = () => {
    for (const p of cluster) p.cols = columnEnds.length;
    cluster = [];
    columnEnds = [];
  };
  for (const event of sorted) {
    const start = minutesOf(event.start);
    const end = Math.max(minutesOf(event.end), start + MIN_BLOCK_MIN);
    if (start >= clusterEnd) flush();
    let col = columnEnds.findIndex((e) => e <= start);
    if (col === -1) {
      col = columnEnds.length;
      columnEnds.push(end);
    } else columnEnds[col] = end;
    const p = { event, col, cols: 1 };
    cluster.push(p);
    placed.push(p);
    clusterEnd = Math.max(clusterEnd, end);
  }
  flush();
  return placed;
}

export interface TimeGridProps {
  days: readonly CalendarDate[];
  events: readonly CalendarEvent[];
  today: CalendarDate;
  now: { hour: number; minute: number };
  selectedId: string | null;
  onEventPress: EventPress;
  onDayOpen: (date: CalendarDate) => void;
  onCreate: (date: CalendarDate, hour: number) => void;
  /** Hour scrolled to the top on mount. */
  startHour?: number;
}

export function TimeGrid({ days, events, today, now, selectedId, onEventPress, onDayOpen, onCreate, startHour = 7 }: TimeGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = startHour * HOUR_PX - 10;
  }, [startHour]);

  const single = days.length === 1;
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-separator-border bg-background-primary-default dark:bg-background-secondary-default">
      <div className="flex border-b border-separator-border">
        <div className="w-14 shrink-0" />
        {days.map((date) => {
          const isToday = isSameDay(date, today);
          return (
            <div
              key={date.toString()}
              className={cx(
                "flex min-w-0 flex-1 items-center gap-1.5 border-s border-separator-border px-2 py-2",
                single ? "justify-start" : "justify-center",
              )}
            >
              <span className="text-caption-1-medium text-text-tertiary">{weekdayName(date).slice(0, 3)}</span>
              <button
                type="button"
                aria-label={`${longDay(date)}. Open day`}
                aria-current={isToday ? "date" : undefined}
                onClick={() => onDayOpen(date)}
                disabled={single}
                className={cx(
                  DAY_NUMBER,
                  "h-7 min-w-7 text-body-2-medium disabled:cursor-default",
                  isToday ? "bg-blue-500 text-text-white" : "text-text-primary enabled:hover:bg-background-secondary-hover",
                )}
              >
                {date.day}
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex border-b border-separator-border">
        <div className="flex w-14 shrink-0 items-center justify-end pe-2 text-caption-2-medium text-text-tertiary">All day</div>
        {days.map((date) => (
          <div key={date.toString()} className="flex min-h-8 min-w-0 flex-1 flex-col gap-0.5 border-s border-separator-border p-1">
            {eventsOn(events, date)
              .filter((e) => e.allDay)
              .map((event) => (
                <CalendarEventChip
                  key={event.id}
                  title={event.title}
                  color={event.color}
                  allDay
                  selected={event.id === selectedId}
                  aria-haspopup="dialog"
                  onClick={(e) => onEventPress(event, e.currentTarget)}
                />
              ))}
          </div>
        ))}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain" data-testid="time-grid-scroll">
        <div className="relative flex" style={{ height: 24 * HOUR_PX }}>
          <div className="relative w-14 shrink-0" aria-hidden>
            {HOURS.slice(1).map((h) => (
              <span
                key={h}
                className="absolute end-2 -translate-y-1/2 text-caption-2-regular text-text-tertiary tabular-nums"
                style={{ top: h * HOUR_PX }}
              >
                {pad2(h)}:00
              </span>
            ))}
          </div>
          {days.map((date) => {
            const timed = eventsOn(events, date).filter((e) => !e.allDay && isSameDay(toCalendarDate(e.start), date));
            const isToday = isSameDay(date, today);
            return (
              <div key={date.toString()} className="relative min-w-0 flex-1 border-s border-separator-border" data-day={date.toString()}>
                {HOURS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    tabIndex={-1}
                    aria-label={`New event, ${longDay(date)} at ${pad2(h)}:00`}
                    onClick={() => onCreate(date, h)}
                    className={cx(
                      "absolute inset-x-0 cursor-default outline-none transition-colors duration-100 ease-out hover:bg-background-secondary-default motion-reduce:transition-none dark:hover:bg-background-primary-default",
                      h > 0 && "border-t border-separator-border",
                    )}
                    style={{ top: h * HOUR_PX, height: HOUR_PX }}
                  />
                ))}
                {layoutDay(timed).map(({ event, col, cols }) => {
                  const start = minutesOf(event.start);
                  const length = Math.max(minutesOf(event.end) - start, MIN_BLOCK_MIN);
                  return (
                    <div
                      key={event.id}
                      className="absolute px-0.5 pb-px"
                      style={{
                        top: (start / 60) * HOUR_PX,
                        height: (length / 60) * HOUR_PX,
                        insetInlineStart: `${(col / cols) * 100}%`,
                        width: `${100 / cols}%`,
                      }}
                    >
                      {/* Under 55 minutes there is no room for two lines: one-line chip stretched to the block. */}
                      <CalendarEventChip
                        variant={length < 55 ? "compact" : "full"}
                        style={length < 55 ? { height: "100%" } : undefined}
                        title={event.title}
                        color={event.color}
                        start={event.start}
                        end={event.end}
                        selected={event.id === selectedId}
                        aria-haspopup="dialog"
                        onClick={(e) => onEventPress(event, e.currentTarget)}
                      />
                    </div>
                  );
                })}
                {isToday ? (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                    style={{ top: (minutesOf(now) / 60) * HOUR_PX }}
                  >
                    <span className="-ms-1 size-2 -translate-y-px rounded-full bg-red-500" />
                    <span className="h-0.5 flex-1 -translate-y-px bg-red-500" />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- day rail */

export interface DayRailProps {
  date: CalendarDate;
  events: readonly CalendarEvent[];
  selectedId: string | null;
  onDateChange: (date: CalendarDate) => void;
  onEventPress: EventPress;
}

/** Mini month plus the agenda for the open day. */
export function DayRail({ date, events, selectedId, onDateChange, onEventPress }: DayRailProps) {
  const list = eventsOn(events, date);
  return (
    <aside aria-label="Day overview" className="flex w-[326px] shrink-0 flex-col gap-3 overflow-y-auto overscroll-contain">
      {/* Remount per month so the mini calendar follows the stepper. The panel brings its own card. */}
      <DateCalendar
        key={`${date.year}-${date.month}`}
        aria-label="Pick a day"
        value={date}
        onChange={onDateChange}
      />
      <section aria-label="Agenda" className="flex flex-col gap-2 rounded-2xl border border-separator-border bg-background-primary-default p-3 dark:bg-background-secondary-default">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-body-medium text-text-primary">Agenda</h2>
          <span className="text-caption-1-regular text-text-tertiary">
            {date.day} {monthName(date)}
          </span>
        </div>
        {list.length === 0 ? (
          <p className="py-4 text-center text-body-2-regular text-text-secondary">Nothing planned. Click an hour to add one.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {list.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  aria-haspopup="dialog"
                  onClick={(e) => onEventPress(event, e.currentTarget)}
                  className={cx(
                    "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-start outline-none transition-colors duration-150 ease-out hover:bg-background-secondary-default focus-visible:ring-2 focus-visible:ring-border-focus-ring motion-reduce:transition-none dark:hover:bg-background-primary-default",
                    event.id === selectedId && "bg-background-secondary-default dark:bg-background-primary-default",
                  )}
                >
                  <span aria-hidden className={cx("size-2 shrink-0 rounded-full", calendarEventColorStyles[event.color].dot)} />
                  <span className="min-w-0 flex-1 truncate text-body-2-medium text-text-primary">{event.title}</span>
                  <span className="shrink-0 text-caption-1-regular text-text-tertiary tabular-nums">{timeRange(event)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
