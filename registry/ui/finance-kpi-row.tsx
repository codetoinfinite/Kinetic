/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Finance KPI Row" (boardui.com/templates/finance).
 * No BoardUI source was used.
 */
"use client";

import { useId, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { Chip } from "@/registry/ui/chip";
import { cx } from "@/registry/lib/cx";

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

export type FinanceKpi = {
  id: string;
  label: string;
  value: number;
  /** Period-over-period change as a fraction: 0.032 is +3.2%. */
  change: number;
  /** Recent values, oldest first, drawn as the sparkline. Two or more points. */
  trend?: number[];
  icon?: IconComponent;
  /** Which direction is good news. Expenses use "down". Default "up". */
  goodDirection?: "up" | "down";
  /** Formats this value instead of the row's currency format. */
  format?: (value: number) => string;
};

export interface FinanceKpiRowProps {
  items: FinanceKpi[];
  /** Cards become toggle buttons that pick one metric. Default false. */
  selectable?: boolean;
  /** Selected card id. Controlled when defined. */
  selectedId?: string;
  defaultSelectedId?: string;
  onSelectionChange?: (id: string) => void;
  /** ISO 4217 code for the default value format. Default "USD". */
  currency?: string;
  /** Locale for values and percents. Default "en-US". */
  locale?: string;
  /** Read after each change by screen readers. Default "vs last month". */
  comparisonLabel?: string;
  "aria-label"?: string;
  className?: string;
}

/** Sparkline box in SVG units; the svg scales it to 96×36 CSS px. */
const SPARK_W = 96;
const SPARK_H = 36;
const SPARK_PAD = 3;

// #region critical
/** Map values onto the sparkline box: x spreads evenly, y is inverted so a
 *  larger value sits higher. A flat series draws along the middle. */
export function sparkPoints(values: number[], w = SPARK_W, h = SPARK_H, pad = SPARK_PAD): [number, number][] {
  if (values.length < 2) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const step = (w - pad * 2) / (values.length - 1);
  return values.map((v, i) => [
    pad + i * step,
    span === 0 ? h / 2 : pad + (h - pad * 2) * (1 - (v - min) / span),
  ]);
}

function Sparkline({
  values,
  tone,
  label,
  className,
}: {
  values: number[];
  tone: "good" | "bad" | "flat";
  label: string;
  className?: string;
}) {
  const gradientId = useId();
  const pts = sparkPoints(values);
  const last = pts[pts.length - 1];
  const first = pts[0];
  if (!last || !first) return null;
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
  const area = `${line} L${last[0].toFixed(2)} ${SPARK_H} L${first[0].toFixed(2)} ${SPARK_H} Z`;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      className={cx(
        "h-9 w-24 shrink-0 overflow-visible",
        className,
        tone === "good" ? "text-chart-7" : tone === "bad" ? "text-chart-3" : "text-chart-neutral",
      )}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={3} fill="currentColor" className="stroke-background-secondary-default" strokeWidth={1.5} />
    </svg>
  );
}

/** Good news is lime and bad news rose, whatever the sign: a rising expense
 *  line is bad, a falling one good. */
function toneOf(change: number, goodDirection: "up" | "down"): "good" | "bad" | "flat" {
  if (change === 0) return "flat";
  return (change > 0) === (goodDirection === "up") ? "good" : "bad";
}
// #endregion

export function FinanceKpiRow({
  items,
  selectable = false,
  selectedId,
  defaultSelectedId,
  onSelectionChange,
  currency = "USD",
  locale = "en-US",
  comparisonLabel = "vs last month",
  "aria-label": ariaLabel = "Key metrics",
  className,
}: FinanceKpiRowProps) {
  const [localId, setLocalId] = useState(defaultSelectedId ?? items[0]?.id);
  const active = selectable ? (selectedId ?? localId) : undefined;

  const money = useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }),
    [locale, currency],
  );
  const pct = useMemo(
    () => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" }),
    [locale],
  );

  const select = (id: string) => {
    if (selectedId === undefined) setLocalId(id);
    onSelectionChange?.(id);
  };

  return (
    <div className={cx("@container w-full min-w-0", className)}>
      <ul aria-label={ariaLabel} className="grid grid-cols-1 gap-3 @sm:grid-cols-2 @3xl:grid-cols-4">
        {items.map((k) => {
          const Icon = k.icon;
          const tone = toneOf(k.change, k.goodDirection ?? "up");
          const value = (k.format ?? money.format)(k.value);
          const isSelected = active === k.id;
          const body = (
            <>
              {/* Narrow: one compact row (icon, figures, sparkline). From @sm the
                  icon and sparkline share a top line above the figures. */}
              <span className="contents @sm:flex @sm:items-start @sm:justify-between @sm:gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background-primary-default text-foreground-icon-primary shadow-xs">
                  {Icon ? <Icon className="size-[18px]" aria-hidden /> : null}
                </span>
                {k.trend && k.trend.length > 1 ? (
                  <Sparkline
                    className="order-2 @sm:order-none"
                    values={k.trend}
                    tone={tone}
                    label={`${k.label} trend over ${k.trend.length} periods`}
                  />
                ) : null}
              </span>
              <span className="order-1 flex min-w-0 flex-1 flex-col gap-0.5 @sm:order-none @sm:flex-none">
                <span className="truncate text-body-regular text-text-secondary">{k.label}</span>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-title-3-medium text-text-primary tabular-nums @sm:text-title-1-medium">{value}</span>
                  <Chip variant="caption" color={tone === "good" ? "lime" : tone === "bad" ? "rose" : "neutral"} className="tabular-nums">
                    {pct.format(k.change)}
                    <span className="sr-only"> {comparisonLabel}</span>
                  </Chip>
                </span>
              </span>
            </>
          );
          const surface = cx(
            "flex h-full w-full items-center gap-3 rounded-2xl p-3 text-start @sm:flex-col @sm:items-stretch @sm:gap-4 @sm:p-4",
            "transition-[background-color,box-shadow] duration-200 ease-out motion-reduce:transition-none",
            isSelected
              ? "bg-background-primary-default shadow-xs ring-1 ring-border-button-default"
              : "bg-background-secondary-default",
          );
          return (
            <li key={k.id} className="min-w-0">
              {selectable ? (
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => select(k.id)}
                  className={cx(
                    surface,
                    "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                    !isSelected && "hover:bg-background-secondary-hover",
                  )}
                >
                  {body}
                </button>
              ) : (
                <div className={surface}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
