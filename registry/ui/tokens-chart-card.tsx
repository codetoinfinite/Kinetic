/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Tokens Chart Card" (boardui.com/templates/ai-profile).
 * No BoardUI source was used.
 */
"use client";

import { useId, useMemo, useState } from "react";
import type { HTMLAttributes, KeyboardEvent, Ref } from "react";
import {
  Area,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useCountUp } from "@/registry/hooks/use-count-up";
import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";
import { cx } from "@/registry/lib/cx";
import { Chip } from "@/registry/ui/chip";
import { SegmentedControl, SegmentedControlItem } from "@/registry/ui/segmented-control";

/**
 * Tokens Chart Card: daily token usage as a sharp purple line over a soft
 * area, with the period total as the headline and a period switch.
 *
 * Idle days (zero tokens) drop out of the solid line and run along the
 * baseline as a dashed grey segment, so a quiet week reads as "nothing ran"
 * rather than as a dip. Hovering, or arrowing through the focused chart,
 * swaps the headline for that day's figure.
 */

export interface TokenPoint {
  /** Day label, e.g. "Jun 14". */
  label: string;
  /** Tokens used that day; 0 marks an idle day. */
  value: number;
}

export interface TokenPeriod {
  id: string;
  /** Switch label, e.g. "30D". */
  label: string;
  points: TokenPoint[];
  /** Percent change against the previous period. */
  trend?: number;
}

export interface TokensChartCardProps
  extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** Caption above the headline. */
  title?: string;
  periods: TokenPeriod[];
  period?: string;
  defaultPeriod?: string;
  onPeriodChange?: (id: string) => void;
  /** Word after the figure, e.g. "tokens". */
  unit?: string;
  /** Caption under the last point. */
  endLabel?: string;
  formatValue?: (value: number) => string;
  ref?: Ref<HTMLElement>;
}

const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatTrend(trend: number) {
  const abs = Math.abs(trend);
  const text = `${Number.isInteger(abs) ? abs : abs.toFixed(1)}%`;
  return trend > 0 ? `+${text}` : trend < 0 ? `−${text}` : text;
}

type ChartRow = { key: number; value: number; line: number | null; idle: number | null };

export function TokensChartCard({
  title = "Tokens",
  periods,
  period,
  defaultPeriod,
  onPeriodChange,
  unit = "tokens",
  endLabel = "Today",
  formatValue = (n) => compact.format(n),
  className,
  ref,
  ...props
}: TokensChartCardProps) {
  const reduced = useReducedMotion();
  const gradientId = useId();
  const [innerPeriod, setInnerPeriod] = useState(defaultPeriod ?? periods[0]?.id ?? "");
  const currentId = period ?? innerPeriod;
  const current = periods.find((p) => p.id === currentId) ?? periods[0];
  const points = current?.points ?? [];
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const active = activeIndex !== null ? points[activeIndex] : undefined;

  const total = points.reduce((sum, p) => sum + p.value, 0);
  const rolled = useCountUp(total, 480);
  const shownTotal = reduced ? total : rolled;

  // #region critical
  // Split each day into the solid series and the dashed idle series. A zero day
  // stays on the solid line only where it meets a busy day, so the line drops
  // to the baseline and the dashed run takes over between idle days.
  const rows = useMemo<ChartRow[]>(
    () =>
      points.map((p, i) => {
        const prev = points[i - 1]?.value ?? 0;
        const next = points[i + 1]?.value ?? 0;
        const idle = p.value === 0;
        return {
          key: i,
          value: p.value,
          line: !idle || prev > 0 || next > 0 ? p.value : null,
          idle: idle ? 0 : null,
        };
      }),
    [points],
  );

  const selectPeriod = (id: string) => {
    setActiveIndex(null);
    if (period === undefined) setInnerPeriod(id);
    onPeriodChange?.(id);
  };

  // The chart is a slider over days: arrows step, Home/End jump, Escape resets.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = points.length - 1;
    if (last < 0) return;
    let next: number | null | undefined;
    if (e.key === "ArrowLeft") next = activeIndex === null ? last : Math.max(0, activeIndex - 1);
    else if (e.key === "ArrowRight") next = activeIndex === null ? 0 : Math.min(last, activeIndex + 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    else if (e.key === "Escape") next = null;
    if (next === undefined) return;
    e.preventDefault();
    setActiveIndex(next);
  };
  // #endregion

  const totalText = `${formatValue(total)} ${unit}`;
  const valueText = active ? `${active.label}: ${formatValue(active.value)} ${unit}` : `${current?.label ?? ""} total: ${totalText}`;

  return (
    <section
      ref={ref}
      className={cx(
        "flex w-full min-w-0 flex-col overflow-hidden rounded-2xl bg-background-secondary-default",
        className,
      )}
      {...props}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-body-regular text-text-secondary">{active ? active.label : title}</p>
          <div className="flex items-center gap-2">
            <p className="text-title-2-regular whitespace-nowrap text-text-primary tabular-nums">
              {active ? (
                `${formatValue(active.value)} ${unit}`
              ) : (
                <>
                  <span aria-hidden>{`${formatValue(shownTotal)} ${unit}`}</span>
                  <span className="sr-only">{totalText}</span>
                </>
              )}
            </p>
            {!active && current?.trend !== undefined && (
              <Chip
                variant="caption"
                color={current.trend > 0 ? "purple" : current.trend < 0 ? "rose" : "neutral"}
                className="tabular-nums"
              >
                {formatTrend(current.trend)}
              </Chip>
            )}
          </div>
        </div>
        {periods.length > 1 && (
          <SegmentedControl
            aria-label="Period"
            selectedKeys={new Set([currentId])}
            onSelectionChange={(keys) => {
              const next = [...keys][0];
              if (next !== undefined) selectPeriod(String(next));
            }}
          >
            {periods.map((p) => (
              <SegmentedControlItem key={p.id} id={p.id}>
                {p.label}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        )}
      </div>

      <div
        role="slider"
        tabIndex={0}
        aria-label={`Daily ${unit}`}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, points.length - 1)}
        aria-valuenow={activeIndex ?? points.length - 1}
        aria-valuetext={valueText}
        onKeyDown={onKeyDown}
        onBlur={() => setActiveIndex(null)}
        className="mt-4 h-44 w-full cursor-crosshair outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-inset"
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={rows}
            margin={{ top: 8, right: 4, bottom: 4, left: 4 }}
            accessibilityLayer={false}
            onMouseMove={(state) => {
              const index = Number(state?.activeTooltipIndex);
              if (state?.isTooltipActive && Number.isFinite(index)) setActiveIndex(index);
            }}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-chart-5)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--color-chart-5)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="key" hide />
            <YAxis hide domain={[0, (dataMax: number) => Math.max(1, dataMax * 1.12)]} />
            <Tooltip content={() => null} cursor={false} />
            <Area
              type="linear"
              dataKey="line"
              stroke="var(--color-chart-5)"
              strokeWidth={1.75}
              strokeLinejoin="miter"
              fill={`url(#${gradientId})`}
              activeDot={false}
              isAnimationActive={!reduced}
              animationDuration={450}
            />
            <Line
              type="linear"
              dataKey="idle"
              stroke="var(--color-text-tertiary)"
              strokeWidth={1.25}
              strokeDasharray="4 4"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
            {active && (
              <ReferenceLine
                x={activeIndex ?? 0}
                stroke="var(--color-chart-cursor)"
                strokeDasharray="4 4"
              />
            )}
            {active && (
              <ReferenceDot
                x={activeIndex ?? 0}
                y={active.value}
                r={4}
                fill="var(--color-chart-5-active)"
                stroke="var(--color-background-secondary-default)"
                strokeWidth={2}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between px-4 pt-1 pb-3 text-caption-2-medium text-text-tertiary" aria-hidden>
        <span>{points[0]?.label}</span>
        <span>{endLabel}</span>
      </div>
    </section>
  );
}
