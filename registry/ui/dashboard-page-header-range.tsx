/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Dashboard Page Header" (boardui.com/templates/dashboard).
 * No BoardUI source was used.
 */
'use client';

import { useState } from 'react';
import { endOfMonth, type CalendarDate, type DateDuration } from '@internationalized/date';
import { useDateFormatter } from 'react-aria';
import { RiArrowLeftSLine, RiArrowRightSLine } from '@remixicon/react';
import { cx } from '@/registry/lib/cx';

/**
 * PeriodStepper: the dashboard's "< 29 Jun - 5 Jul >" control. A bordered
 * pill with a previous and next button around the formatted range. Each
 * press shifts the whole window by its own length, so a 7-day window walks
 * week by week and a calendar month walks month by month (end clamped to the
 * month's last day). The label is an <output>, so screen readers hear the
 * new range after each step.
 */

export interface PeriodRange {
  start: CalendarDate;
  end: CalendarDate;
}

export interface PeriodStepperProps {
  value?: PeriodRange;
  defaultValue?: PeriodRange;
  onChange?: (range: PeriodRange) => void;
  /** Fixed shift per press. Defaults to the range's own length (or its month count for whole months). */
  step?: DateDuration;
  /** Earliest allowed start; the previous button disables once a step would cross it. */
  minValue?: CalendarDate;
  /** Latest allowed end; the next button disables once a step would cross it. */
  maxValue?: CalendarDate;
  /** Intl options for the label. Default `{ day: 'numeric', month: 'short' }`. */
  formatOptions?: Intl.DateTimeFormatOptions;
  /** 36px (default, matches Button) or 32px (card headers). */
  size?: 'medium' | 'small';
  'aria-label'?: string;
  previousLabel?: string;
  nextLabel?: string;
  className?: string;
}

const MS_PER_DAY = 86_400_000;

function lengthInDays(range: PeriodRange) {
  return Math.round((range.end.toDate('UTC').getTime() - range.start.toDate('UTC').getTime()) / MS_PER_DAY) + 1;
}

/** Whole calendar months (1st of a month through the last day of a month): the month count, else 0. */
function wholeMonths(range: PeriodRange) {
  if (range.start.day !== 1 || range.end.compare(endOfMonth(range.end)) !== 0) return 0;
  return (range.end.year - range.start.year) * 12 + range.end.month - range.start.month + 1;
}

// #region critical
/** Moves a range one window back (-1) or forward (+1). */
export function shiftPeriod(range: PeriodRange, direction: 1 | -1, step?: DateDuration): PeriodRange {
  if (step) {
    const signed = Object.fromEntries(
      Object.entries(step).map(([unit, amount]) => [unit, (amount ?? 0) * direction]),
    ) as DateDuration;
    return { start: range.start.add(signed), end: range.end.add(signed) };
  }
  const months = wholeMonths(range);
  if (months > 0) {
    // Adding months to the 31st clamps (Jan 31 + 1 month = Feb 28) and the
    // clamp then sticks (Feb 28 + 1 month = Mar 28), so rebuild the end from
    // the new start instead of shifting it.
    const start = range.start.add({ months: months * direction });
    return { start, end: endOfMonth(start.add({ months: months - 1 })) };
  }
  const days = lengthInDays(range) * direction;
  return { start: range.start.add({ days }), end: range.end.add({ days }) };
}

/** The localized "Jun 29 – Jul 5" label for a range (UTC, so it never drifts a day). */
export function usePeriodLabel(range: PeriodRange, formatOptions?: Intl.DateTimeFormatOptions) {
  const formatter = useDateFormatter({ day: 'numeric', month: 'short', ...formatOptions, timeZone: 'UTC' });
  return formatter.formatRange(range.start.toDate('UTC'), range.end.toDate('UTC'));
}

export function PeriodStepper({
  value,
  defaultValue,
  onChange,
  step,
  minValue,
  maxValue,
  formatOptions,
  size = 'medium',
  'aria-label': ariaLabel = 'Date range',
  previousLabel = 'Previous period',
  nextLabel = 'Next period',
  className,
}: PeriodStepperProps) {
  const [uncontrolled, setUncontrolled] = useState<PeriodRange | undefined>(defaultValue);
  const range = value ?? uncontrolled;
  if (!range) throw new Error('PeriodStepper needs `value` or `defaultValue`.');

  const previous = shiftPeriod(range, -1, step);
  const next = shiftPeriod(range, 1, step);
  const canGoBack = !minValue || previous.start.compare(minValue) >= 0;
  const canGoForward = !maxValue || next.end.compare(maxValue) <= 0;
  const label = usePeriodLabel(range, formatOptions);

  const commit = (nextRange: PeriodRange) => {
    setUncontrolled(nextRange);
    onChange?.(nextRange);
  };

  const buttonClass = cx(
    'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg text-foreground-icon-primary outline-none',
    'transition-colors duration-150 ease-out motion-reduce:transition-none',
    'hover:bg-background-primary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring',
    'disabled:cursor-not-allowed disabled:text-foreground-icon-disabled disabled:hover:bg-transparent',
    size === 'small' ? 'size-6' : 'size-7',
  );

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cx(
        'inline-flex items-center gap-0.5 rounded-2lg border border-border-button-default bg-background-primary-default shadow-xs',
        size === 'small' ? 'h-8 px-[3px]' : 'h-9 px-[3px]',
        className,
      )}
    >
      <button type="button" aria-label={previousLabel} disabled={!canGoBack} onClick={() => commit(previous)} className={buttonClass}>
        <RiArrowLeftSLine aria-hidden className="size-4 rtl:rotate-180" />
      </button>
      <output
        aria-live="polite"
        className={cx(
          'min-w-0 px-1.5 text-center whitespace-nowrap tabular-nums text-text-primary',
          size === 'small' ? 'text-body-2-medium' : 'text-body-medium',
        )}
      >
        {label}
      </output>
      <button type="button" aria-label={nextLabel} disabled={!canGoForward} onClick={() => commit(next)} className={buttonClass}>
        <RiArrowRightSLine aria-hidden className="size-4 rtl:rotate-180" />
      </button>
    </div>
  );
}
// #endregion
