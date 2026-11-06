/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Month Stepper" (boardui.com/templates/calendar).
 * No BoardUI source was used.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, Ref } from "react";
import { DateFormatter, getLocalTimeZone, startOfMonth, today } from "@internationalized/date";
import type { CalendarDate } from "@internationalized/date";
import { RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react";
import { cx } from "@/registry/lib/cx";
import { useDirection } from "@/registry/lib/direction";
import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";

/**
 * A bordered pill that reads "August 2026" between a previous and a next
 * chevron, as in the calendar template's header. The label is a spinbutton:
 * focus it and Arrow keys step a month, Page Up / Page Down step a year and
 * Home / End jump to the bounds. Values are always the first day of a month.
 */

export type MonthStepperSize = "medium" | "small";

export interface MonthStepperProps {
  /** Controlled month (any day in it; the stepper reads year + month). */
  value?: CalendarDate;
  /** Uncontrolled starting month. Falls back to the current month. */
  defaultValue?: CalendarDate;
  /** Called with the first day of the new month. */
  onChange?: (month: CalendarDate) => void;
  /** Earliest month that can be shown. */
  minValue?: CalendarDate;
  /** Latest month that can be shown. */
  maxValue?: CalendarDate;
  /** BCP 47 locale for the label. Default "en-US". */
  locale?: string;
  /** Intl options for the label. Default `{ month: "long", year: "numeric" }`. */
  formatOptions?: Intl.DateTimeFormatOptions;
  /** 36px (default) or 32px tall. */
  size?: MonthStepperSize;
  /** Accessible name of the spinbutton. Default "Month". */
  "aria-label"?: string;
  previousLabel?: string;
  nextLabel?: string;
  isDisabled?: boolean;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const sizes = {
  medium: { root: "h-9 rounded-2lg", button: "size-[34px] rounded-[9px]", icon: "size-5", label: "text-body-medium" },
  small: { root: "h-8 rounded-lg", button: "size-[30px] rounded-[7px]", icon: "size-[18px]", label: "text-body-2-medium" },
} as const;

/** Months since year 0: a monotonic number for aria-valuenow and comparisons. */
export function monthIndex(date: CalendarDate): number {
  return date.year * 12 + (date.month - 1);
}

// #region critical
export function MonthStepper({
  value,
  defaultValue,
  onChange,
  minValue,
  maxValue,
  locale = "en-US",
  formatOptions,
  size = "medium",
  "aria-label": ariaLabel = "Month",
  previousLabel = "Previous month",
  nextLabel = "Next month",
  isDisabled = false,
  className,
  ref,
}: MonthStepperProps) {
  const direction = useDirection();
  const reducedMotion = useReducedMotion();
  const [uncontrolled, setUncontrolled] = useState<CalendarDate>(() =>
    startOfMonth(defaultValue ?? today(getLocalTimeZone())),
  );
  const month = startOfMonth(value ?? uncontrolled);
  const current = monthIndex(month);
  const min = minValue ? monthIndex(minValue) : -Infinity;
  const max = maxValue ? monthIndex(maxValue) : Infinity;

  const formatter = useMemo(
    () => new DateFormatter(locale, { month: "long", year: "numeric", ...formatOptions, timeZone: "UTC" }),
    [locale, formatOptions],
  );
  const label = formatter.format(month.toDate("UTC"));

  const step = (months: number) => {
    const target = Math.min(max, Math.max(min, current + months));
    if (isDisabled || target === current) return;
    const next = month.add({ months: target - current });
    setUncontrolled(next);
    onChange?.(next);
  };

  // Slide the label in from the side the user stepped towards. The Web
  // Animations API needs no keyframes in the stylesheet and cancels cleanly.
  const labelRef = useRef<HTMLSpanElement>(null);
  const previous = useRef(current);
  useEffect(() => {
    const delta = current - previous.current;
    previous.current = current;
    const el = labelRef.current;
    if (!el || delta === 0 || reducedMotion || typeof el.animate !== "function") return;
    const from = (delta > 0 ? 8 : -8) * (direction === "rtl" ? -1 : 1);
    const animation = el.animate(
      [
        { opacity: 0, transform: `translateX(${from}px)` },
        { opacity: 1, transform: "translateX(0)" },
      ],
      { duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" },
    );
    return () => animation.cancel();
  }, [current, reducedMotion, direction]);

  const onKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    const forward = direction === "rtl" ? "ArrowLeft" : "ArrowRight";
    const back = direction === "rtl" ? "ArrowRight" : "ArrowLeft";
    let delta: number | null = null;
    if (event.key === "ArrowUp" || event.key === forward) delta = 1;
    else if (event.key === "ArrowDown" || event.key === back) delta = -1;
    else if (event.key === "PageUp") delta = 12;
    else if (event.key === "PageDown") delta = -12;
    else if (event.key === "Home" && Number.isFinite(min)) delta = min - current;
    else if (event.key === "End" && Number.isFinite(max)) delta = max - current;
    if (delta === null) return;
    event.preventDefault();
    step(delta);
  };

  const s = sizes[size];
  const buttonClass = cx(
    "inline-flex shrink-0 cursor-pointer items-center justify-center text-foreground-icon-primary",
    "transition-colors duration-150 ease-out hover:bg-background-primary-hover active:bg-background-primary-active",
    "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
    "disabled:cursor-not-allowed disabled:text-foreground-disabled disabled:hover:bg-transparent",
    s.button,
  );

  return (
    <div
      ref={ref}
      role="group"
      aria-label={ariaLabel}
      data-disabled={isDisabled || undefined}
      className={cx(
        "inline-flex w-80 max-w-full items-center justify-between gap-1 border border-border-button-default bg-background-primary-default shadow-xs",
        "data-[disabled]:opacity-60",
        s.root,
        className,
      )}
    >
      <button
        type="button"
        aria-label={previousLabel}
        disabled={isDisabled || current <= min}
        onClick={() => step(-1)}
        className={buttonClass}
      >
        <RiArrowLeftSLine aria-hidden className={cx(s.icon, "rtl:rotate-180")} />
      </button>
      <span
        role="spinbutton"
        tabIndex={isDisabled ? -1 : 0}
        aria-label={ariaLabel}
        aria-valuenow={current}
        aria-valuetext={label}
        aria-valuemin={Number.isFinite(min) ? min : undefined}
        aria-valuemax={Number.isFinite(max) ? max : undefined}
        aria-disabled={isDisabled || undefined}
        onKeyDown={onKeyDown}
        className={cx(
          "min-w-0 flex-1 cursor-default select-none overflow-hidden rounded-md text-center text-text-primary outline-none",
          "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
          s.label,
        )}
      >
        <span ref={labelRef} className="block truncate tabular-nums" aria-hidden>
          {label}
        </span>
      </span>
      <button
        type="button"
        aria-label={nextLabel}
        disabled={isDisabled || current >= max}
        onClick={() => step(1)}
        className={buttonClass}
      >
        <RiArrowRightSLine aria-hidden className={cx(s.icon, "rtl:rotate-180")} />
      </button>
    </div>
  );
}
// #endregion
