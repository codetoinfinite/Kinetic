/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Month View Grid" (boardui.com/templates/calendar).
 * No BoardUI source was used.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, ReactElement, ReactNode, Ref } from "react";
import {
  DateFormatter,
  endOfWeek,
  isSameDay,
  isSameMonth,
  parseDate,
  startOfMonth,
  startOfWeek,
  toCalendarDate,
} from "@internationalized/date";
import type { CalendarDate, DayOfWeek } from "@internationalized/date";
import { CalendarEventChip, calendarEventColorStyles } from "@/registry/ui/calendar-event-chip";
import type { CalendarEvent, HourCycle } from "@/registry/ui/calendar-event-chip";
import { cx } from "@/registry/lib/cx";

/**
 * The calendar template's month page: a grey frame, weekday headers and six
 * rows of rounded day cells. Days outside the month are muted; each day lists
 * its events as compact chips at the bottom of the cell with "+N more" when
 * they do not fit; the selected day gets an accent pill. It is an ARIA grid
 * with one tab stop: arrows move by day and week, Home / End to the week's
 * edges, Page Up / Page Down by month (with Shift, by year), Enter or Space
 * selects. Moving past the month turns the page. Below 560px of width the
 * cells show colour dots instead of chips.
 */

const formatters = new Map<string, DateFormatter>();

function formatDay(date: { year: number; month: number; day: number }, locale: string, options: Intl.DateTimeFormatOptions) {
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new DateFormatter(locale, { ...options, timeZone: "UTC" });
    formatters.set(key, formatter);
  }
  return formatter.format(new Date(Date.UTC(date.year, date.month - 1, date.day, 12)));
}

/** All-day first, then by start time, then longer first. */
function byStart(a: CalendarEvent, b: CalendarEvent) {
  if (!!a.allDay !== !!b.allDay) return a.allDay ? -1 : 1;
  return a.start.compare(b.start) || b.end.compare(a.end);
}

/** The last day an event touches; an end at exactly midnight belongs to the day before. */
function lastDayOf(event: CalendarEvent): CalendarDate {
  const first = toCalendarDate(event.start);
  const end = toCalendarDate(event.end);
  const midnight = event.end.hour === 0 && event.end.minute === 0 && end.compare(first) > 0;
  return midnight ? end.subtract({ days: 1 }) : end;
}

/** The events that touch `day`, all-day first then by start; for agenda panels next to the grid. */
export function eventsOnDay(events: CalendarEvent[], day: CalendarDate): CalendarEvent[] {
  return events
    .filter((event) => toCalendarDate(event.start).compare(day) <= 0 && lastDayOf(event).compare(day) >= 0)
    .sort(byStart);
}

const NAV_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"]);

export interface MonthViewGridProps {
  events: CalendarEvent[];
  /** Any day in the month to show (controlled). */
  month?: CalendarDate;
  defaultMonth?: CalendarDate;
  onMonthChange?: (month: CalendarDate) => void;
  selectedDate?: CalendarDate | null;
  defaultSelectedDate?: CalendarDate | null;
  onSelectedDateChange?: (date: CalendarDate) => void;
  /** Marks today's number. Pass a fixed value; the grid never reads the clock. */
  today?: CalendarDate;
  /** First column; defaults to the locale's (Sunday in en-US). */
  firstDayOfWeek?: DayOfWeek;
  /** Rings the matching chip, for example while its popover is open. */
  selectedEventId?: string | null;
  /** Chips per day before "+N more". Default 3. */
  maxVisible?: number;
  /** "+N more" was pressed; the day is selected as well. */
  onShowMore?: (date: CalendarDate, events: CalendarEvent[]) => void;
  onEventClick?: (event: CalendarEvent) => void;
  /**
   * Wrap each chip, for example in an EventDetailPopover. A multi-day event
   * renders once per day, so key open state on `day` as well as the event.
   */
  renderEvent?: (event: CalendarEvent, chip: ReactElement, day: CalendarDate) => ReactNode;
  locale?: string;
  hourCycle?: HourCycle;
  "aria-label"?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

// #region critical
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
// #endregion
