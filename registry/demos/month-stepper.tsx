'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Month Stepper" (boardui.com/templates/calendar).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import { DateFormatter, endOfMonth, parseDate } from '@internationalized/date';
import type { CalendarDate } from '@internationalized/date';

import { MonthStepper } from '@/registry/ui/month-stepper';

/* The calendar header's month switcher, plus a bounded small stepper.
   Click the chevrons, or focus the month and use the Arrow keys
   (Page Up / Page Down jump a year, Home / End jump to the bounds). */

const title = new DateFormatter('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const range = new DateFormatter('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export default function Demo() {
  const [month, setMonth] = useState<CalendarDate>(() => parseDate('2026-08-01'));
  const [quarter, setQuarter] = useState<CalendarDate>(() => parseDate('2026-11-01'));

  return (
    <div className="flex w-full max-w-[720px] flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 data-demo="title" className="text-title-3-medium text-text-primary">
            {title.format(month.toDate('UTC'))}
          </h2>
          <p data-demo="range" className="text-body-2-regular text-text-secondary">
            {range.format(month.toDate('UTC'))} – {range.format(endOfMonth(month).toDate('UTC'))}
          </p>
        </div>
        <MonthStepper value={month} onChange={setMonth} className="sm:w-80" />
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs">
        <span className="text-body-medium text-text-primary">Reporting period</span>
        <span className="text-body-2-regular text-text-secondary">Limited to fiscal 2026 (January to December).</span>
        <MonthStepper
          size="small"
          aria-label="Reporting month"
          value={quarter}
          onChange={setQuarter}
          minValue={parseDate('2026-01-01')}
          maxValue={parseDate('2026-12-01')}
          formatOptions={{ month: 'short', year: 'numeric' }}
          className="mt-1 w-56"
        />
      </div>
    </div>
  );
}
