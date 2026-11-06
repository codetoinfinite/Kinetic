/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Sleep Score Card" (boardui.com/components/sleep-score-card).
 * No BoardUI source was used.
 */
"use client";

import { useEffect, useId, useState, type CSSProperties } from "react";
import { RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react";

import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";
import { cx } from "@/registry/lib/cx";

export type SleepMetric = {
  id: string;
  label: string;
  /** Text after the label, e.g. "7h 50m". */
  detail: string;
  score: number;
  /** Points available; also sets the share of the ring this metric owns. */
  max: number;
  /** Any CSS colour. */
  color: string;
};

export type SleepWeek = {
  id: string;
  /** Range shown in the pill, e.g. "29 Jun - 5 Jul". */
  label: string;
  metrics: SleepMetric[];
};

const DURATION = { id: "duration", label: "Duration", max: 50, color: "var(--color-chart-5)" };
const BEDTIME = { id: "bedtime", label: "Bedtime", max: 30, color: "var(--color-chart-3)" };
const INTERRUPTIONS = { id: "interruptions", label: "Interruptions", max: 20, color: "var(--color-chart-6)" };

function week(id: string, label: string, scores: [number, string][]): SleepWeek {
  return {
    id,
    label,
    metrics: [DURATION, BEDTIME, INTERRUPTIONS].map((m, i) => ({
      ...m,
      score: scores[i]?.[0] ?? 0,
      detail: scores[i]?.[1] ?? "",
    })),
  };
}

/** Six weeks of sample scores, oldest first; the last one is the week on show by default. */
export const SLEEP_WEEKS: SleepWeek[] = [
  week("2026-05-25", "25 May - 31 May", [[41, "6h 55m"], [18, "35m later"], [12, "22m awake"]]),
  week("2026-06-01", "1 Jun - 7 Jun", [[44, "7h 10m"], [24, "10m later"], [15, "15m awake"]]),
  week("2026-06-08", "8 Jun - 14 Jun", [[36, "6h 30m"], [14, "50m later"], [10, "30m awake"]]),
  week("2026-06-15", "15 Jun - 21 Jun", [[47, "7h 35m"], [27, "5m earlier"], [17, "10m awake"]]),
  week("2026-06-22", "22 Jun - 28 Jun", [[45, "7h 20m"], [22, "15m later"], [16, "12m awake"]]),
  week("2026-06-29", "29 Jun - 5 Jul", [[49, "7h 50m"], [29, "20m earlier"], [20, "5m wake up"]]),
];

export function sleepRating(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Fair";
  return "Poor";
}

const SIZE = 108;
const STROKE = 12;
/** Visible gap between neighbouring segments, in ring percent. */
const GAP = 4;

export interface SleepScoreCardProps {
  title?: string;
  /** Weeks the arrows step through, oldest first. */
  weeks?: SleepWeek[];
  /** Controlled index into `weeks`. */
  weekIndex?: number;
  /** Uncontrolled starting week; defaults to the last (most recent). */
  defaultWeekIndex?: number;
  onWeekIndexChange?: (index: number) => void;
  /** Maps the total to the headline word. */
  rate?: (score: number) => string;
  /** Ring diameter in px. */
  size?: number;
  className?: string;
}

export function SleepScoreCard({
  title = "Sleep score",
  weeks = SLEEP_WEEKS,
  weekIndex: weekIndexProp,
  defaultWeekIndex,
  onWeekIndexChange,
  rate = sleepRating,
  size = SIZE,
  className,
}: SleepScoreCardProps) {
  const labelId = useId();
  const reduced = useReducedMotion();
  const [ownIndex, setOwnIndex] = useState(defaultWeekIndex ?? weeks.length - 1);
  const index = Math.min(Math.max(weekIndexProp ?? ownIndex, 0), Math.max(weeks.length - 1, 0));
  const current = weeks[index];
  const metrics = current?.metrics ?? [];
  const [drawn, setDrawn] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const active = preview ?? pinned;

  // Two frames after mount the segments grow from nothing, so the CSS transition draws them in.
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

  const total = metrics.reduce((sum, m) => sum + m.score, 0);
  const totalMax = metrics.reduce((sum, m) => sum + m.max, 0);
  const center = size / 2;
  const stroke = (STROKE * size) / SIZE;
  const r = center - stroke / 2;

  // #region critical
  // Every metric owns a slot of the lap sized by its `max`; its arc fills score/max of that slot.
  // Round caps poke out half a stroke past each dash end, so the dash is trimmed by a cap on both
  // sides plus the visible GAP. With pathLength 100 the cap length in ring percent is
  // (stroke / 2) / circumference * 100.
  const cap = ((stroke / 2) / (2 * Math.PI * r)) * 100;
  let cursor = 0;
  const segments = metrics.map((m) => {
    const slot = totalMax > 0 ? (m.max / totalMax) * 100 : 0;
    const fill = m.max > 0 ? Math.min(1, Math.max(0, m.score / m.max)) : 0;
    const start = cursor + GAP / 2 + cap;
    const length = Math.max(0, slot * fill - GAP - 2 * cap);
    cursor += slot;
    const shown = drawn || reduced;
    return { m, start, length: shown ? length : 0, visible: shown && length > 0 };
  });
  // #endregion

  const focused = metrics.find((m) => m.id === active);
  const pillButton =
    "flex size-8 cursor-pointer items-center justify-center rounded-xl text-foreground-icon-secondary outline-none transition-colors duration-150 ease-out hover:text-foreground-icon-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring disabled:cursor-not-allowed disabled:text-foreground-icon-disabled motion-reduce:transition-none";

  return (
    <section
      aria-labelledby={labelId}
      className={cx("flex w-full min-w-0 flex-col rounded-2xl bg-background-secondary-default p-2", className)}
    >
      <div className="flex items-start justify-between gap-3 px-2 pt-2">
        <div className="min-w-0">
          <p id={labelId} className="text-body-medium text-text-secondary">
            {title}
          </p>
          <p
            key={current?.id}
            data-sleep-rating
            className="mt-0.5 animate-number-fade text-title-1-medium text-text-primary motion-reduce:animate-none"
          >
            {rate(total)}
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

      <div className="relative mx-auto my-3" style={{ width: size, height: size }}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          role="img"
          aria-label={`${title} ${total} of ${totalMax}: ${metrics.map((m) => `${m.label} ${m.score} of ${m.max}`).join(", ")}`}
          onMouseLeave={() => setPreview(null)}
          className="block overflow-visible"
        >
          <circle cx={center} cy={center} r={r} fill="none" strokeWidth={stroke} className="stroke-chart-track" />
          <g transform={`rotate(-90 ${center} ${center})`}>
            {segments.map(({ m, start, length, visible }) => {
              const style: CSSProperties = {
                stroke: m.color,
                strokeDasharray: `${length} 100`,
                strokeDashoffset: -start,
              };
              return (
                <circle
                  key={m.id}
                  data-segment={m.id}
                  cx={center}
                  cy={center}
                  r={r}
                  fill="none"
                  pathLength={100}
                  strokeLinecap="round"
                  strokeWidth={stroke}
                  pointerEvents="stroke"
                  onMouseEnter={() => setPreview(m.id)}
                  style={style}
                  className={cx(
                    "transition-[stroke-dasharray,stroke-dashoffset,opacity] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                    !visible ? "opacity-0" : active && active !== m.id ? "opacity-25" : "opacity-100",
                  )}
                />
              );
            })}
          </g>
        </svg>
        <div aria-live="polite" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span
            key={focused ? focused.id : `total-${current?.id}`}
            data-sleep-center
            className="flex animate-number-fade flex-col items-center motion-reduce:animate-none"
          >
            <span className="text-display-4-medium text-text-primary tabular-nums">{focused ? focused.score : total}</span>
            {focused && (
              <span className="-mt-1 text-caption-1-regular text-text-secondary tabular-nums">of {focused.max}</span>
            )}
          </span>
        </div>
      </div>

      <ul className="rounded-xl bg-background-primary-default px-2.5">
        {metrics.map((m, i) => {
          const on = active === m.id;
          return (
            <li key={m.id} className={cx(i > 0 && "border-t border-border-table")}>
              <button
                type="button"
                data-metric={m.id}
                aria-pressed={pinned === m.id}
                onClick={() => setPinned((p) => (p === m.id ? null : m.id))}
                onMouseEnter={() => setPreview(m.id)}
                onMouseLeave={() => setPreview(null)}
                onFocus={() => setPreview(m.id)}
                onBlur={() => setPreview(null)}
                className={cx(
                  "flex h-10 w-full cursor-pointer items-center gap-2 rounded-md text-left outline-none transition-opacity duration-200 ease-out focus-visible:ring-2 focus-visible:ring-border-focus-ring motion-reduce:transition-none",
                  active && !on && "opacity-50",
                )}
              >
                <span aria-hidden className="size-3 shrink-0 rounded-[3px]" style={{ background: m.color }} />
                <span className="min-w-0 flex-1 truncate text-body-regular text-text-secondary">
                  {m.label}: {m.detail}
                </span>
                <span className="shrink-0 text-body-medium text-text-primary tabular-nums">
                  {m.score}/{m.max}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
