/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Steps Card" (boardui.com/components/steps-card).
 * No BoardUI source was used.
 */
"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react";

import { useCountUp } from "@/registry/hooks/use-count-up";
import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";
import { cx } from "@/registry/lib/cx";

export type StepsWeek = {
  id: string;
  /** Range shown in the pill, e.g. "29 Jun - 5 Jul". */
  label: string;
  /** Seven daily step counts, Monday first. */
  days: number[];
};

/** Six weeks of sample steps, oldest first; the last one is on show by default (31,600 steps). */
export const STEPS_WEEKS: StepsWeek[] = [
  { id: "2026-05-25", label: "25 May - 31 May", days: [4810, 6120, 3940, 5280, 2650, 7040, 4300] },
  { id: "2026-06-01", label: "1 Jun - 7 Jun", days: [3120, 4480, 5960, 2870, 4100, 6650, 5230] },
  { id: "2026-06-08", label: "8 Jun - 14 Jun", days: [6430, 5170, 2290, 4760, 3580, 2940, 6810] },
  { id: "2026-06-15", label: "15 Jun - 21 Jun", days: [2580, 3360, 4920, 6240, 5510, 7380, 3010] },
  { id: "2026-06-22", label: "22 Jun - 28 Jun", days: [5040, 3790, 6580, 2460, 4870, 3150, 6120] },
  { id: "2026-06-29", label: "29 Jun - 5 Jul", days: [5620, 2180, 1860, 6340, 7120, 5280, 3200] },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const formatSteps = new Intl.NumberFormat("en-US").format;

/** Bars grow over this long, each starting STAGGER ms after the one to its left. */
const GROW_MS = 600;
const STAGGER = 40;

export interface StepsCardProps {
  title?: string;
  /** Unit after the week total. */
  totalLabel?: string;
  /** Weeks the arrows step through, oldest first. */
  weeks?: StepsWeek[];
  /** Controlled index into `weeks`. */
  weekIndex?: number;
  /** Uncontrolled starting week; defaults to the last (most recent). */
  defaultWeekIndex?: number;
  onWeekIndexChange?: (index: number) => void;
  /** Top of the scale; defaults to the busiest day across all weeks rounded up to 1,000. */
  max?: number;
  /** Height of the bar tracks in px. */
  chartHeight?: number;
  className?: string;
}

export function StepsCard({
  title = "Steps",
  totalLabel = "total steps",
  weeks = STEPS_WEEKS,
  weekIndex: weekIndexProp,
  defaultWeekIndex,
  onWeekIndexChange,
  max: maxProp,
  chartHeight = 200,
  className,
}: StepsCardProps) {
  const labelId = useId();
  const reduced = useReducedMotion();
  const [ownIndex, setOwnIndex] = useState(defaultWeekIndex ?? weeks.length - 1);
  const index = Math.min(Math.max(weekIndexProp ?? ownIndex, 0), Math.max(weeks.length - 1, 0));
  const current = weeks[index];
  const days = current?.days ?? [];
  const [drawn, setDrawn] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [tabStop, setTabStop] = useState(0);
  const barRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Two frames after mount the bars and the total start from zero, so the transitions play once.
  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setDrawn(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);

  const go = (next: number) => {
    if (next < 0 || next >= weeks.length) return;
    setOwnIndex(next);
    onWeekIndexChange?.(next);
  };

  // #region critical
  // One fixed scale for every week, so switching weeks compares like with like.
  const scale = useMemo(() => {
    if (maxProp && maxProp > 0) return maxProp;
    const peak = Math.max(0, ...weeks.flatMap((w) => w.days));
    return Math.max(1000, Math.ceil(peak / 1000) * 1000);
  }, [weeks, maxProp]);
  const live = drawn || reduced;
  const total = days.reduce((sum, n) => sum + n, 0);
  const activeSteps = active !== null ? days[active] : undefined;
  // The headline rolls to the hovered day's steps, back to the week total, or up from 0 on mount.
  const target = live ? (activeSteps ?? total) : 0;
  const counted = useCountUp(target, 600);
  const shown = reduced ? target : counted;
  const pct = (n: number) => (live ? Math.min(100, Math.max(0, (n / scale) * 100)) : 0);
  // #endregion

  const moveFocus = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const last = days.length - 1;
    const next =
      e.key === "ArrowRight" ? Math.min(i + 1, last)
      : e.key === "ArrowLeft" ? Math.max(i - 1, 0)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    setTabStop(next);
    barRefs.current[next]?.focus();
  };

  const pillButton =
    "flex size-8 cursor-pointer items-center justify-center rounded-xl text-foreground-icon-secondary outline-none transition-colors duration-150 ease-out hover:text-foreground-icon-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring disabled:cursor-not-allowed disabled:text-foreground-icon-disabled motion-reduce:transition-none";

  return (
    <section
      aria-labelledby={labelId}
      className={cx("@container flex w-full min-w-0 flex-col rounded-2xl bg-background-secondary-default p-2", className)}
    >
      <div className="flex items-start justify-between gap-3 px-2 pt-2">
        <div className="min-w-0">
          <p id={labelId} className="text-body-medium text-text-secondary">
            {title}
          </p>
          <p className="mt-0.5 flex flex-col @min-[420px]:flex-row @min-[420px]:items-baseline @min-[420px]:gap-1">
            <span data-steps-total className="text-title-1-medium text-text-primary tabular-nums">
              {formatSteps(shown)}
            </span>
            <span
              key={active === null ? "total" : `day-${active}`}
              data-steps-unit
              className="animate-number-fade whitespace-nowrap text-caption-1-regular text-text-secondary motion-reduce:animate-none"
            >
              {active === null ? totalLabel : `steps on ${DAYS[active] ?? ""}`}
            </span>
          </p>
        </div>
        <div className="flex h-8 shrink-0 items-center rounded-xl border border-border-button-default bg-background-primary-default shadow-xs">
          <button
            type="button"
            aria-label="Previous week"
            disabled={index <= 0}
            onClick={() => go(index - 1)}
            className={pillButton}
          >
            <RiArrowLeftSLine aria-hidden className="size-4" />
          </button>
          <span aria-live="polite" data-week-label className="min-w-[96px] text-center text-body-medium text-text-primary tabular-nums">
            {current?.label}
          </span>
          <button
            type="button"
            aria-label="Next week"
            disabled={index >= weeks.length - 1}
            onClick={() => go(index + 1)}
            className={pillButton}
          >
            <RiArrowRightSLine aria-hidden className="size-4" />
          </button>
        </div>
      </div>

      <div
        role="group"
        aria-label={`Daily steps, ${current?.label ?? ""}`}
        className="mt-5 grid grid-cols-7 gap-2 px-3 pb-2 @min-[480px]:gap-[30px]"
        onMouseLeave={() => setActive(null)}
      >
        {DAYS.map((day, i) => {
          const steps = days[i] ?? 0;
          const on = active === i;
          return (
            <button
              key={day}
              ref={(el) => {
                barRefs.current[i] = el;
              }}
              type="button"
              data-bar={day}
              tabIndex={tabStop === i ? 0 : -1}
              aria-label={`${DAY_NAMES[i]}: ${formatSteps(steps)} steps`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => {
                setTabStop(i);
                setActive(i);
              }}
              onBlur={() => setActive(null)}
              onKeyDown={(e) => moveFocus(e, i)}
              className="group flex cursor-pointer flex-col items-center gap-2 outline-none"
            >
              <span
                className={cx(
                  "relative w-full overflow-hidden rounded-[10px] bg-chart-track outline-2 outline-offset-2 transition-[outline-color] duration-150 ease-out motion-reduce:transition-none",
                  on ? "outline-chart-1" : "outline-transparent",
                  "group-focus-visible:outline-border-focus-ring",
                )}
                style={{ height: chartHeight }}
              >
                <span
                  aria-hidden
                  className={cx(
                    "absolute inset-x-0 bottom-0 rounded-[10px] transition-[height,background-color] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                    on ? "bg-chart-1-active" : "bg-chart-1",
                  )}
                  style={{
                    height: `${pct(steps)}%`,
                    transitionDuration: `${GROW_MS}ms, 150ms`,
                    transitionDelay: `${i * STAGGER}ms, 0ms`,
                  }}
                />
              </span>
              <span className={cx("text-caption-1-regular", on ? "text-text-primary" : "text-text-secondary")}>{day}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
