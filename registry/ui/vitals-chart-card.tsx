/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Vitals Chart Card" (boardui.com/templates/medical-profile).
 * No BoardUI source was used.
 */
"use client";

import { useRef, useState } from "react";
import type { ComponentType, KeyboardEvent } from "react";
import { RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react";

import { Chip } from "@/registry/ui/chip";
import type { ChipColor } from "@/registry/ui/chip";
import { cx } from "@/registry/lib/cx";

/**
 * Vitals Chart Card: one vital sign over a short period, drawn the way the
 * medical profile's steps card draws its week: a column per reading, each a
 * full-height grey track with the reading filled from the bottom. A dashed
 * band marks the normal range, readings outside it turn pink, and an inner
 * tile under the chart spells the range out with an in-range count.
 *
 * Two variants: "bars" fills from the floor of the domain to the value
 * (heart rate, SpO2); "range" floats a bar from `low` to `value` (blood
 * pressure diastolic to systolic) and can draw a second band for `low`.
 */

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

export type VitalReading = {
  /** Short axis label, e.g. "Mon". */
  label: string;
  /** Longer label for the caption and screen readers, e.g. "Mon, 29 Jun". Defaults to `label`. */
  detail?: string;
  /** Main value: heart rate, systolic pressure, SpO2 ... */
  value: number;
  /** Lower end for the "range" variant, e.g. diastolic pressure. */
  low?: number;
};

export type VitalStatus = "low" | "normal" | "high";
export type VitalsChartVariant = "bars" | "range";
export type VitalsChartColor = "teal" | "lime" | "sky" | "purple" | "blue" | "emerald" | "indigo";
export type VitalsSummary = "average" | "latest" | "max" | "min";

export interface VitalsPeriod {
  /** Range label in the stepper, e.g. "29 Jun - 5 Jul". */
  label: string;
  onPrevious?: () => void;
  onNext?: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
}

export interface VitalsChartCardProps {
  /** Card label, e.g. "Heart rate". */
  title: string;
  /** Unit after the headline figure, e.g. "bpm". */
  unit: string;
  /** Optional icon before the title. */
  icon?: IconComponent;
  /** One reading per column, oldest first. */
  readings: VitalReading[];
  /** Normal range for `value`, inclusive. */
  normalRange: readonly [number, number];
  /** Normal range for `low` (range variant only), inclusive. */
  lowNormalRange?: readonly [number, number];
  /** Value axis [floor, ceiling]; derived from the data and ranges when omitted. */
  domain?: readonly [number, number];
  variant?: VitalsChartVariant;
  /** Fill for in-range readings. Out-of-range readings always use pink. */
  color?: VitalsChartColor;
  /** What the headline shows when no column is hovered or selected. */
  summary?: VitalsSummary;
  /** Fraction digits for every printed value. */
  decimals?: number;
  /** Renders the period stepper in the header when given. */
  period?: VitalsPeriod;
  /** Controlled selected column (null for none). */
  selectedIndex?: number | null;
  /** Initial selected column when uncontrolled. */
  defaultSelectedIndex?: number | null;
  onSelectedIndexChange?: (index: number | null) => void;
  className?: string;
}

const FILL: Record<VitalsChartColor, string> = {
  teal: "bg-chart-1",
  lime: "bg-chart-2",
  sky: "bg-chart-4",
  purple: "bg-chart-5",
  blue: "bg-chart-6",
  emerald: "bg-chart-7",
  indigo: "bg-chart-9",
};
const OUT_OF_RANGE_FILL = "bg-chart-3";

const SUMMARY_LABEL: Record<VitalsSummary, string> = {
  average: "Average",
  latest: "Latest",
  max: "Highest",
  min: "Lowest",
};

const STATUS_CHIP: Record<VitalStatus, { label: string; color: ChipColor }> = {
  low: { label: "Low", color: "blue" },
  normal: { label: "Normal", color: "lime" },
  high: { label: "High", color: "rose" },
};

function rangeStatus(v: number, [min, max]: readonly [number, number]): VitalStatus {
  if (v < min) return "low";
  if (v > max) return "high";
  return "normal";
}

/** Classifies a reading against its normal range(s); `value` wins over `low`. */
export function vitalStatus(
  reading: Pick<VitalReading, "value" | "low">,
  normalRange: readonly [number, number],
  lowNormalRange?: readonly [number, number],
): VitalStatus {
  const main = rangeStatus(reading.value, normalRange);
  if (main !== "normal" || reading.low === undefined || !lowNormalRange) return main;
  return rangeStatus(reading.low, lowNormalRange);
}

function autoDomain(
  readings: VitalReading[],
  normalRange: readonly [number, number],
  lowNormalRange?: readonly [number, number],
): [number, number] {
  const values = readings.flatMap((r) => (r.low === undefined ? [r.value] : [r.value, r.low]));
  const lo = Math.min(...values, normalRange[0], lowNormalRange?.[0] ?? normalRange[0]);
  const hi = Math.max(...values, normalRange[1], lowNormalRange?.[1] ?? normalRange[1]);
  const pad = (hi - lo) * 0.25 || 1;
  return [Math.max(0, Math.floor(lo - pad)), Math.ceil(hi + pad)];
}

const clampPct = (n: number) => Math.min(100, Math.max(0, n));

function PeriodStepper({ period, title }: { period: VitalsPeriod; title: string }) {
  const arrow =
    "inline-flex size-7 items-center justify-center rounded-md text-text-secondary outline-none transition-colors duration-150 ease-out motion-reduce:transition-none hover:bg-background-secondary-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring disabled:cursor-not-allowed disabled:text-text-disabled disabled:hover:bg-transparent";
  return (
    <div
      role="group"
      aria-label={`${title} period`}
      className="inline-flex h-8 shrink-0 items-center rounded-lg border border-border-button-default bg-background-primary-default px-0.5 shadow-xs"
    >
      <button
        type="button"
        className={arrow}
        aria-label="Previous period"
        disabled={period.previousDisabled || !period.onPrevious}
        onClick={period.onPrevious}
      >
        <RiArrowLeftSLine className="size-4" aria-hidden />
      </button>
      <span
        className="px-1 text-body-medium whitespace-nowrap text-text-primary tabular-nums"
        aria-live="polite"
        data-period-label=""
      >
        {period.label}
      </span>
      <button
        type="button"
        className={arrow}
        aria-label="Next period"
        disabled={period.nextDisabled || !period.onNext}
        onClick={period.onNext}
      >
        <RiArrowRightSLine className="size-4" aria-hidden />
      </button>
    </div>
  );
}

// #region critical
export function VitalsChartCard({
  title,
  unit,
  icon: Icon,
  readings,
  normalRange,
  lowNormalRange,
  domain,
  variant = "bars",
  color = "teal",
  summary = "average",
  decimals = 0,
  period,
  selectedIndex,
  defaultSelectedIndex = null,
  onSelectedIndexChange,
  className,
}: VitalsChartCardProps) {
  const [innerSelected, setInnerSelected] = useState<number | null>(defaultSelectedIndex);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [focusIndex, setFocusIndex] = useState(Math.max(0, readings.length - 1));
  const barRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const isRange = variant === "range";
  const selectedRaw = selectedIndex !== undefined ? selectedIndex : innerSelected;
  const selected = selectedRaw !== null && selectedRaw < readings.length ? selectedRaw : null;
  const hovered = hoverIndex !== null && hoverIndex < readings.length ? hoverIndex : null;
  const activeIndex = hovered ?? selected;
  const active = activeIndex !== null ? readings[activeIndex] : undefined;
  const rovingIndex = Math.min(focusIndex, Math.max(0, readings.length - 1));

  const select = (index: number | null) => {
    if (selectedIndex === undefined) setInnerSelected(index);
    onSelectedIndexChange?.(index);
  };

  const [d0, d1] = domain ?? autoDomain(readings, normalRange, lowNormalRange);
  const span = d1 - d0 || 1;
  const pct = (v: number) => clampPct(((v - d0) / span) * 100);

  const fmt = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const print = (r: Pick<VitalReading, "value" | "low">) =>
    isRange && r.low !== undefined ? `${fmt.format(r.value)}/${fmt.format(r.low)}` : fmt.format(r.value);

  // Headline when nothing is active: the summary of the whole period.
  let summaryReading: Pick<VitalReading, "value" | "low"> | undefined;
  if (readings.length > 0) {
    if (summary === "latest") summaryReading = readings[readings.length - 1];
    else if (summary === "max") summaryReading = readings.reduce((a, b) => (b.value > a.value ? b : a));
    else if (summary === "min") summaryReading = readings.reduce((a, b) => (b.value < a.value ? b : a));
    else {
      const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
      const lows = readings.flatMap((r) => (r.low === undefined ? [] : [r.low]));
      summaryReading = {
        value: mean(readings.map((r) => r.value)),
        low: lows.length > 0 ? mean(lows) : undefined,
      };
    }
  }

  const statuses = readings.map((r) => vitalStatus(r, normalRange, lowNormalRange));
  const inRange = statuses.filter((s) => s === "normal").length;
  const activeStatus = activeIndex !== null ? statuses[activeIndex] : undefined;
  const chip = activeStatus
    ? STATUS_CHIP[activeStatus]
    : {
        label: `${inRange}/${readings.length} in range`,
        color: inRange === readings.length ? ("lime" as const) : ("orange" as const),
      };

  const headline = active ?? summaryReading;
  const caption = active
    ? (active.detail ?? active.label)
    : `${SUMMARY_LABEL[summary]}${period ? ` · ${period.label}` : ""}`;

  const rangeText = (r: readonly [number, number]) => `${fmt.format(r[0])}–${fmt.format(r[1])}`;
  const normalText =
    isRange && lowNormalRange
      ? `${rangeText(normalRange)}/${rangeText(lowNormalRange)}`
      : `${rangeText(normalRange)} ${unit}`;

  const bands = [normalRange, ...(isRange && lowNormalRange ? [lowNormalRange] : [])];

  const moveFocus = (index: number) => {
    const next = (index + readings.length) % readings.length;
    setFocusIndex(next);
    setHoverIndex(next);
    barRefs.current[next]?.focus();
  };

  const onBarKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowRight" || event.key === "ArrowUp") moveFocus(index + 1);
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") moveFocus(index - 1);
    else if (event.key === "Home") moveFocus(0);
    else if (event.key === "End") moveFocus(readings.length - 1);
    else if (event.key === "Escape" && selected !== null) select(null);
    else return;
    event.preventDefault();
  };

  return (
    <section
      aria-label={title}
      className={cx(
        "flex min-h-[330px] w-full min-w-0 flex-col gap-4 rounded-[20px] bg-background-secondary-default px-4 pt-4 pb-3",
        className,
      )}
    >
      {/* Header: label, headline figure + unit, caption; period stepper on the right */}
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-[1_1_9rem] flex-col gap-0.5">
          <p className="flex items-center gap-1.5 text-body-medium text-text-secondary">
            {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
            <span className="truncate">{title}</span>
          </p>
          <p className="flex items-baseline gap-1.5">
            <span
              key={activeIndex ?? "summary"}
              className="animate-number-fade text-title-1-medium whitespace-nowrap text-text-primary tabular-nums motion-reduce:animate-none"
              data-vital-value=""
            >
              {headline ? print(headline) : "–"}
            </span>
            <span className="text-body-2-medium text-text-secondary">{unit}</span>
          </p>
          <p className="truncate text-caption-1-medium text-text-tertiary" data-vital-caption="">
            {caption}
          </p>
        </div>
        {period ? <PeriodStepper period={period} title={title} /> : null}
      </div>

      {/* Plot: one track per reading, fills from the floor (bars) or floats low → value (range) */}
      <div className="flex min-h-[140px] flex-1 flex-col gap-2">
        <div className="relative min-h-0 flex-1">
          <div
            role="group"
            aria-label={`${title} readings`}
            className="absolute inset-0 grid gap-2"
            style={{ gridTemplateColumns: `repeat(${Math.max(1, readings.length)}, minmax(0, 1fr))` }}
            onPointerLeave={() => setHoverIndex(null)}
          >
            {readings.map((reading, index) => {
              const status = statuses[index] ?? "normal";
              const bottom = isRange && reading.low !== undefined ? pct(reading.low) : 0;
              const height = Math.max(pct(reading.value) - bottom, 0);
              const isSelected = selected === index;
              const dimmed = activeIndex !== null && activeIndex !== index;
              return (
                <button
                  key={`${reading.label}-${index}`}
                  ref={(node) => {
                    barRefs.current[index] = node;
                  }}
                  type="button"
                  tabIndex={index === rovingIndex ? 0 : -1}
                  aria-pressed={isSelected}
                  aria-label={`${reading.detail ?? reading.label}: ${print(reading)} ${unit}, ${STATUS_CHIP[status].label.toLowerCase()}`}
                  className={cx(
                    "relative h-full min-w-0 cursor-pointer overflow-hidden rounded-[10px] bg-chart-track outline-none",
                    "focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background-secondary-default",
                    isSelected && "ring-2 ring-text-primary ring-offset-2 ring-offset-background-secondary-default",
                  )}
                  onPointerEnter={() => setHoverIndex(index)}
                  onFocus={(event) => {
                    setFocusIndex(index);
                    if (event.currentTarget.matches(":focus-visible")) setHoverIndex(index);
                  }}
                  onBlur={() => setHoverIndex((current) => (current === index ? null : current))}
                  onKeyDown={(event) => onBarKeyDown(event, index)}
                  onClick={() => select(isSelected ? null : index)}
                >
                  <span
                    aria-hidden
                    data-status={status}
                    className={cx(
                      "absolute inset-x-0 min-h-1.5 rounded-[10px] transition-[height,bottom,opacity] duration-500 ease-out motion-reduce:transition-none",
                      status === "normal" ? FILL[color] : OUT_OF_RANGE_FILL,
                      dimmed && "opacity-40",
                    )}
                    style={{ bottom: `${bottom}%`, height: `${height}%` }}
                  />
                </button>
              );
            })}
          </div>
          {bands.map((band, i) => (
            <div
              key={i}
              aria-hidden
              className="pointer-events-none absolute inset-x-0 border-y border-dashed border-chart-7-active bg-chart-7/10"
              style={{ bottom: `${pct(band[0])}%`, height: `${Math.max(pct(band[1]) - pct(band[0]), 0)}%` }}
            />
          ))}
        </div>
        <div
          aria-hidden
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${Math.max(1, readings.length)}, minmax(0, 1fr))` }}
        >
          {readings.map((reading, index) => (
            <span
              key={`${reading.label}-${index}`}
              className={cx(
                "truncate text-center text-caption-1-medium transition-colors duration-150 ease-out motion-reduce:transition-none",
                activeIndex === index ? "text-text-primary" : "text-text-tertiary",
              )}
            >
              {reading.label}
            </span>
          ))}
        </div>
      </div>

      {/* Normal-range hint */}
      <div className="flex items-center justify-between gap-2 rounded-2lg bg-background-inner-default px-2.5 py-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            aria-hidden
            className="h-2.5 w-3.5 shrink-0 rounded-[3px] border border-dashed border-chart-7-active bg-chart-7/15"
          />
          <span className="text-body-regular whitespace-nowrap text-text-secondary">Normal</span>
          <span className="truncate text-body-medium text-text-primary tabular-nums">{normalText}</span>
        </div>
        <Chip variant="caption" color={chip.color} className="shrink-0" data-vital-status="">
          {chip.label}
        </Chip>
      </div>
    </section>
  );
}
// #endregion
