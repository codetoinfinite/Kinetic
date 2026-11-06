/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Date Range Stepper" (boardui.com/templates/dashboard).
 * No BoardUI source was used.
 */
"use client";

import { useState } from "react";
import type { KeyboardEvent } from "react";
import { DateFormatter, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "@internationalized/date";
import type { CalendarDate, DayOfWeek } from "@internationalized/date";
import { RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react";

import { cx } from "@/registry/lib/cx";

export type DateRangeStepperUnit = "week" | "month";
export type DateRangeStepperYearDisplay = "auto" | "always" | "never";

export interface DateRangeStepperRange {
  /** First day of the period. */
  start: CalendarDate;
  /** Last day of the period (inclusive). */
  end: CalendarDate;
}

type ValueProps =
  | {
      /** Controlled: any day inside the shown period. */
      value: CalendarDate;
      defaultValue?: never;
    }
  | {
      value?: undefined;
      /** Uncontrolled: any day inside the first period shown. */
      defaultValue: CalendarDate;
    };

export type DateRangeStepperProps = ValueProps & {
  /** Length of one step. */
  unit?: DateRangeStepperUnit;
  /** Called with the first day of the new period and the whole period. */
  onChange?: (start: CalendarDate, range: DateRangeStepperRange) => void;
  /** Earliest day a period may reach; Previous is disabled once the next step would end before it. */
  minValue?: CalendarDate;
  /** Latest day a period may reach; Next is disabled once the next step would start after it. */
  maxValue?: CalendarDate;
  /** First day of a week period. */
  weekStartsOn?: DayOfWeek;
  /** Locale of the label and the announcement. */
  locale?: string;
  /** "auto" adds the year only when the period leaves the year it started in. */
  yearDisplay?: DateRangeStepperYearDisplay;
  /** Replaces the visible label. */
  formatLabel?: (range: DateRangeStepperRange, unit: DateRangeStepperUnit) => string;
  /** Accessible name of the group. */
  label?: string;
  isDisabled?: boolean;
  className?: string;
};

/** The week or month that contains `date`. */
export function getStepperRange(
  date: CalendarDate,
  unit: DateRangeStepperUnit,
  locale = "en-US",
  weekStartsOn: DayOfWeek = "mon",
): DateRangeStepperRange {
  if (unit === "month") return { start: startOfMonth(date), end: endOfMonth(date) };
  return { start: startOfWeek(date, locale, weekStartsOn), end: endOfWeek(date, locale, weekStartsOn) };
}

/** The period `offset` steps away from the one that contains `date`. */
export function shiftStepperRange(
  date: CalendarDate,
  unit: DateRangeStepperUnit,
  offset: number,
  locale = "en-US",
  weekStartsOn: DayOfWeek = "mon",
): DateRangeStepperRange {
  const { start } = getStepperRange(date, unit, locale, weekStartsOn);
  const moved = unit === "month" ? start.add({ months: offset }) : start.add({ weeks: offset });
  return getStepperRange(moved, unit, locale, weekStartsOn);
}

// CalendarDate has no zone: format its UTC midnight in UTC so the day never
// shifts with the viewer's timezone. Start and end are formatted one by one
// and joined with a plain " – ", because Intl's formatRange spacing differs
// between ICU builds (server vs browser) and would break hydration.
const formatters = new Map<string, DateFormatter>();
function fmt(locale: string, options: Intl.DateTimeFormatOptions, date: CalendarDate) {
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new DateFormatter(locale, { ...options, timeZone: "UTC" });
    formatters.set(key, formatter);
  }
  return formatter.format(date.toDate("UTC"));
}

/** Visible label: "Jun 29 – Jul 5" for a week, "July" for a month (en-US). */
export function formatStepperRange(
  range: DateRangeStepperRange,
  unit: DateRangeStepperUnit,
  locale = "en-US",
  showYear = false,
): string {
  if (unit === "month") {
    return fmt(locale, showYear ? { month: "long", year: "numeric" } : { month: "long" }, range.start);
  }
  const options: Intl.DateTimeFormatOptions = showYear
    ? { month: "short", day: "numeric", year: "numeric" }
    : { month: "short", day: "numeric" };
  return `${fmt(locale, options, range.start)} – ${fmt(locale, options, range.end)}`;
}

/** Spoken label, always with the year: "June 29, 2026 – July 5, 2026" / "July 2026". */
function announceRange(range: DateRangeStepperRange, unit: DateRangeStepperUnit, locale: string) {
  if (unit === "month") return fmt(locale, { month: "long", year: "numeric" }, range.start);
  const options: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };
  return `${fmt(locale, options, range.start)} – ${fmt(locale, options, range.end)}`;
}

const arrowClass = cx(
  "inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-text-secondary outline-none",
  "transition-colors duration-150 ease-out motion-reduce:transition-none",
  "hover:bg-background-secondary-hover hover:text-text-primary",
  "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
  "aria-disabled:cursor-not-allowed aria-disabled:text-text-disabled aria-disabled:hover:bg-transparent",
);

// #region critical
export function DateRangeStepper(props: DateRangeStepperProps) {
  const {
    value,
    defaultValue,
    onChange,
    unit = "week",
    minValue,
    maxValue,
    weekStartsOn = "mon",
    locale = "en-US",
    yearDisplay = "auto",
    formatLabel,
    label = "Date range",
    isDisabled = false,
    className,
  } = props;

  // The union type guarantees one of the two is set.
  const seed = (value ?? defaultValue) as CalendarDate;
  const [internal, setInternal] = useState<CalendarDate>(seed);
  // The first period shown: Home returns to it and "auto" years compare to it.
  const [home] = useState<CalendarDate>(seed);

  const anchor = value ?? internal;
  const range = getStepperRange(anchor, unit, locale, weekStartsOn);
  const prev = shiftStepperRange(anchor, unit, -1, locale, weekStartsOn);
  const next = shiftStepperRange(anchor, unit, 1, locale, weekStartsOn);
  const canPrev = !isDisabled && (!minValue || prev.end.compare(minValue) >= 0);
  const canNext = !isDisabled && (!maxValue || next.start.compare(maxValue) <= 0);

  // Slide direction is derived from the change of period start, so it also
  // follows a controlled value set from outside. ISO date strings sort in
  // date order, so a string compare is enough.
  const startKey = range.start.toString();
  const [shownKey, setShownKey] = useState(startKey);
  const [direction, setDirection] = useState<-1 | 0 | 1>(0);
  if (shownKey !== startKey) {
    setShownKey(startKey);
    setDirection(startKey > shownKey ? 1 : -1);
  }

  const go = (target: DateRangeStepperRange) => {
    if (!isControlled(value)) setInternal(target.start);
    onChange?.(target.start, target);
  };
  const step = (offset: -1 | 1) => {
    if (offset < 0 ? !canPrev : !canNext) return;
    go(offset < 0 ? prev : next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft" || event.key === "PageUp") step(-1);
    else if (event.key === "ArrowRight" || event.key === "PageDown") step(1);
    else if (event.key === "Home" && !isDisabled) {
      const target = getStepperRange(home, unit, locale, weekStartsOn);
      if (target.start.compare(range.start) !== 0) go(target);
    } else return;
    event.preventDefault();
  };

  const showYear =
    yearDisplay === "always" ||
    (yearDisplay === "auto" && (range.start.year !== home.year || range.end.year !== home.year));
  const text = formatLabel ? formatLabel(range, unit) : formatStepperRange(range, unit, locale, showYear);
  const noun = unit === "month" ? "month" : "week";

  return (
    <div
      role="group"
      aria-label={label}
      aria-disabled={isDisabled || undefined}
      onKeyDown={onKeyDown}
      data-unit={unit}
      className={cx(
        "inline-flex h-8 shrink-0 items-center rounded-lg border border-border-button-default bg-background-primary-default px-0.5 shadow-2xs",
        isDisabled && "opacity-60",
        className,
      )}
    >
      <button
        type="button"
        className={arrowClass}
        aria-label={`Previous ${noun}`}
        aria-disabled={!canPrev || undefined}
        onClick={() => step(-1)}
      >
        <RiArrowLeftSLine className="size-4" aria-hidden />
      </button>
      <span
        aria-hidden
        className={cx(
          "flex justify-center overflow-hidden px-1",
          unit === "month" ? "min-w-[5.5rem]" : "min-w-[6.75rem]",
        )}
      >
        <span
          key={`${unit}:${startKey}`}
          data-stepper-label=""
          className={cx(
            "inline-block text-body-medium whitespace-nowrap text-text-primary tabular-nums",
            "transition-[opacity,translate] duration-200 ease-out motion-reduce:transition-none",
            direction === 1 && "starting:translate-x-2 starting:opacity-0",
            direction === -1 && "starting:-translate-x-2 starting:opacity-0",
          )}
        >
          {text}
        </span>
      </span>
      <span className="sr-only" aria-live="polite">
        {announceRange(range, unit, locale)}
      </span>
      <button
        type="button"
        className={arrowClass}
        aria-label={`Next ${noun}`}
        aria-disabled={!canNext || undefined}
        onClick={() => step(1)}
      >
        <RiArrowRightSLine className="size-4" aria-hidden />
      </button>
    </div>
  );
}
// #endregion

function isControlled(value: CalendarDate | undefined): value is CalendarDate {
  return value !== undefined;
}
