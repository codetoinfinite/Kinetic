'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Date Range Stepper" (boardui.com/templates/dashboard).
 * No BoardUI source was used.
 */

import { useState } from "react";
import { getDayOfWeek, parseDate } from "@internationalized/date";
import type { CalendarDate } from "@internationalized/date";

import { cx } from "@/registry/lib/cx";
import { DateRangeStepper, getStepperRange } from "@/registry/ui/date-range-stepper";

const WEEK_START = parseDate("2026-06-29");
const MONTH_START = parseDate("2026-07-01");
const DATA_FROM = parseDate("2026-06-01");
const DATA_TO = parseDate("2026-07-12");
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const BAR_MAX = 7000;

/** Seeded daily step count: the same date always gives the same number. */
function stepsOn(date: CalendarDate) {
  const n = date.year * 372 + date.month * 31 + date.day;
  let h = Math.imul(n ^ 0x5bd1e995, 0x27d4eb2d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x165667b1);
  h ^= h >>> 13;
  const r = (h >>> 0) / 4294967296;
  return Math.round((1800 + r * 4900) / 50) * 50;
}

function daysOf(start: CalendarDate, end: CalendarDate) {
  const days: CalendarDate[] = [];
  for (let d = start; d.compare(end) <= 0; d = d.add({ days: 1 })) days.push(d);
  return days;
}

const fmtSteps = (n: number) => n.toLocaleString("en-US");

function Total({ value, caption }: { value: number; caption: string }) {
  return (
    <p className="flex items-baseline gap-1.5">
      <span key={value} className="animate-number-fade text-title-1-medium text-text-primary tabular-nums motion-reduce:animate-none">
        {fmtSteps(value)}
      </span>
      <span className="text-caption-1-regular text-text-secondary">{caption}</span>
    </p>
  );
}

function StepsCard() {
  const [week, setWeek] = useState<CalendarDate>(WEEK_START);
  const range = getStepperRange(week, "week");
  const days = daysOf(range.start, range.end);
  const total = days.reduce((sum, d) => sum + stepsOn(d), 0);

  return (
    <section
      aria-labelledby="drs-steps"
      data-demo="steps"
      className="flex h-full min-w-0 flex-col gap-4 rounded-[20px] bg-background-secondary-default p-4"
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 id="drs-steps" className="text-body-regular text-text-secondary">
            Steps
          </h3>
          <Total value={total} caption="total steps" />
        </div>
        <DateRangeStepper
          label="Steps week"
          value={week}
          onChange={(start) => setWeek(start)}
          minValue={DATA_FROM}
          maxValue={DATA_TO}
        />
      </header>
      <ul aria-label="Daily steps" className="grid h-[150px] grid-cols-7 gap-1.5 sm:h-[196px]">
        {days.map((d, i) => {
          const steps = stepsOn(d);
          return (
            <li key={WEEKDAYS[i]} className="flex min-w-0 flex-col items-center gap-2">
              <div className="relative w-full flex-1 overflow-hidden rounded-lg bg-chart-track">
                <div
                  className="absolute inset-x-0 bottom-0 rounded-lg bg-chart-1 transition-[height] duration-300 ease-out motion-reduce:transition-none"
                  style={{ height: `${Math.min(100, (steps / BAR_MAX) * 100)}%` }}
                />
              </div>
              <span className="text-caption-1-regular text-text-secondary" aria-hidden>
                {WEEKDAYS[i]}
              </span>
              <span className="sr-only">{`${WEEKDAYS[i]}: ${fmtSteps(steps)} steps`}</span>
            </li>
          );
        })}
      </ul>
      <p className="text-caption-1-regular text-text-tertiary">Synced data from Jun 1 to Jul 12, 2026</p>
    </section>
  );
}

const LEVELS = ["bg-chart-track", "bg-chart-2/40", "bg-chart-2/70", "bg-chart-2"];

function ActiveDaysCard() {
  const [month, setMonth] = useState<CalendarDate>(MONTH_START);
  const range = getStepperRange(month, "month");
  const days = daysOf(range.start, range.end);
  const total = days.reduce((sum, d) => sum + stepsOn(d), 0);
  const lead = getDayOfWeek(range.start, "en-US", "mon");
  const best = days.reduce((a, b) => (stepsOn(b) > stepsOn(a) ? b : a));
  const monthName = MONTHS[range.start.month - 1] ?? "";

  return (
    <section
      aria-labelledby="drs-active"
      data-demo="active"
      className="flex h-full min-w-0 flex-col gap-3 rounded-[20px] bg-background-secondary-default p-4"
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 id="drs-active" className="text-body-regular text-text-secondary">
            Most active days
          </h3>
          <Total value={total} caption="total steps" />
        </div>
        <DateRangeStepper label="Activity month" unit="month" value={month} onChange={(start) => setMonth(start)} />
      </header>
      <div className="rounded-2lg bg-background-inner-default p-3">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-body-medium text-text-primary" data-month-heading="">
            {monthName}
          </p>
          <p className="text-caption-1-regular text-text-secondary">
            Best day:{" "}
            <span className="text-text-primary tabular-nums" data-best-day="">
              {`${monthName} ${best.day}`}
            </span>
          </p>
        </div>
        <ol aria-label={`Activity in ${monthName} ${range.start.year}`} className="grid grid-cols-7 gap-x-1 gap-y-1.5">
          {Array.from({ length: lead }, (_, i) => (
            <li key={`blank-${i}`} aria-hidden />
          ))}
          {days.map((d) => {
            const steps = stepsOn(d);
            const level = steps >= 5600 ? 3 : steps >= 4200 ? 2 : steps >= 2800 ? 1 : 0;
            return (
              <li key={d.day} className="flex flex-col items-center gap-0.5">
                <span className="text-caption-1-regular text-text-primary tabular-nums" aria-hidden>
                  {d.day}
                </span>
                <span
                  aria-hidden
                  className={cx(
                    "size-3.5 rounded-full transition-colors duration-200 ease-out motion-reduce:transition-none",
                    LEVELS[level],
                    d.compare(best) === 0 && "ring-2 ring-chart-2 ring-offset-1 ring-offset-background-inner-default",
                  )}
                />
                <span className="sr-only">{`${monthName} ${d.day}: ${fmtSteps(steps)} steps`}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export default function Demo() {
  return (
    <div className="flex w-full max-w-[820px] min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:pb-0">
      <div className="w-[300px] shrink-0 snap-start sm:w-auto sm:min-w-0">
        <StepsCard />
      </div>
      <div className="w-[300px] shrink-0 snap-start sm:w-auto sm:min-w-0">
        <ActiveDaysCard />
      </div>
    </div>
  );
}
