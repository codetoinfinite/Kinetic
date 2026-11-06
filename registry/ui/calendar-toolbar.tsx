/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Calendar Toolbar" (boardui.com/templates/calendar).
 * No BoardUI source was used.
 */
"use client";

import { useMemo, useState } from "react";
import type { ReactNode, Ref } from "react";
import { DateFormatter, getLocalTimeZone, startOfMonth, today as todayIn } from "@internationalized/date";
import type { CalendarDate } from "@internationalized/date";
import { RiAddLine } from "@remixicon/react";
import { Button } from "@/registry/ui/button";
import { MonthStepper } from "@/registry/ui/month-stepper";
import { SearchField } from "@/registry/ui/search-field";
import { SegmentedControl, SegmentedControlItem } from "@/registry/ui/segmented-control";
import { cx } from "@/registry/lib/cx";

/**
 * The calendar page header: the month as a title with a Today button, then
 * the month stepper, a Day / Week / Month segmented control, a search field
 * and the primary "New event" button. Every piece of state (month, view,
 * search) is controlled or uncontrolled on its own, and the row wraps into
 * two (then more) lines as the container narrows.
 */

export type CalendarView = "day" | "week" | "month";

const VIEW_LABELS: Record<CalendarView, string> = { day: "Day", week: "Week", month: "Month" };

export interface CalendarToolbarProps {
  /** Controlled month (any day in it). */
  month?: CalendarDate;
  defaultMonth?: CalendarDate;
  onMonthChange?: (month: CalendarDate) => void;
  /** The date the Today button jumps to. Defaults to today in the local zone. */
  today?: CalendarDate;
  /** Called after the Today button moved the month. */
  onToday?: (today: CalendarDate) => void;
  view?: CalendarView;
  defaultView?: CalendarView;
  onViewChange?: (view: CalendarView) => void;
  /** Which segments to show, in order. */
  views?: CalendarView[];
  searchValue?: string;
  defaultSearchValue?: string;
  onSearchChange?: (value: string) => void;
  /** Hide the search field. */
  showSearch?: boolean;
  searchPlaceholder?: string;
  onNewEvent?: () => void;
  newEventLabel?: string;
  /** Heading on the left. Defaults to the formatted month; `null` hides it. */
  title?: ReactNode;
  /** Extra controls placed before the New event button (icon buttons…). */
  actions?: ReactNode;
  locale?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

// #region critical
export function CalendarToolbar({
  month: controlledMonth,
  defaultMonth,
  onMonthChange,
  today,
  onToday,
  view: controlledView,
  defaultView = "month",
  onViewChange,
  views = ["day", "week", "month"],
  searchValue,
  defaultSearchValue = "",
  onSearchChange,
  showSearch = true,
  searchPlaceholder = "Search events",
  onNewEvent,
  newEventLabel = "New event",
  title,
  actions,
  locale = "en-US",
  className,
  ref,
}: CalendarToolbarProps) {
  const [uncontrolledMonth, setUncontrolledMonth] = useState<CalendarDate>(() =>
    startOfMonth(defaultMonth ?? today ?? todayIn(getLocalTimeZone())),
  );
  const month = startOfMonth(controlledMonth ?? uncontrolledMonth);
  const setMonth = (next: CalendarDate) => {
    setUncontrolledMonth(next);
    onMonthChange?.(next);
  };

  const [uncontrolledView, setUncontrolledView] = useState<CalendarView>(defaultView);
  const view = controlledView ?? uncontrolledView;

  const titleFormatter = useMemo(
    () => new DateFormatter(locale, { month: "long", year: "numeric", timeZone: "UTC" }),
    [locale],
  );
  const heading = title === undefined ? titleFormatter.format(month.toDate("UTC")) : title;

  const goToday = () => {
    const target = today ?? todayIn(getLocalTimeZone());
    setMonth(startOfMonth(target));
    onToday?.(target);
  };

  return (
    <div ref={ref} className={cx("flex w-full flex-wrap items-center gap-x-3 gap-y-3", className)}>
      <div className="flex w-full min-w-0 items-center justify-between gap-3 sm:w-auto sm:justify-start">
        {heading !== null ? (
          <h2 aria-live="polite" className="truncate text-title-3-medium text-text-primary">
            {heading}
          </h2>
        ) : null}
        <Button variant="secondary" onClick={goToday}>
          Today
        </Button>
      </div>

      <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:flex-1 sm:justify-end">
        <MonthStepper value={month} onChange={setMonth} locale={locale} className="w-full sm:w-60" />
        <SegmentedControl
          aria-label="Calendar view"
          selectedKeys={[view]}
          onSelectionChange={(keys) => {
            const [next] = [...keys];
            if (typeof next !== "string" || !(next in VIEW_LABELS)) return;
            setUncontrolledView(next as CalendarView);
            onViewChange?.(next as CalendarView);
          }}
        >
          {views.map((v) => (
            <SegmentedControlItem key={v} id={v}>
              {VIEW_LABELS[v]}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
        {showSearch ? (
          <SearchField
            aria-label={searchPlaceholder}
            placeholder={searchPlaceholder}
            value={searchValue}
            defaultValue={defaultSearchValue}
            onChange={onSearchChange}
            className="w-full min-w-0 sm:w-52"
          />
        ) : null}
        {actions}
        <Button leadingIcon={RiAddLine} onClick={onNewEvent}>
          {newEventLabel}
        </Button>
      </div>
    </div>
  );
}
// #endregion
