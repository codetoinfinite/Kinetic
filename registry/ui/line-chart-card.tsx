/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Line Chart Card" (boardui.com/components/line-chart-card).
 * No BoardUI source was used.
 */
"use client";

import { Fragment, useId, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";
import { cx } from "@/registry/lib/cx";
import {
  AXIS_TICK,
  CHART_CARD_FRAME,
  CHART_CURSOR,
  ChartHeadline,
  ChartLegend,
  ChartPeriodControl,
  ChartTooltipCard,
  GRID_STROKE,
  PulseDot,
  describeDelta,
  formatCompact,
  formatNumber,
  toneActiveColor,
  toneColor,
} from "@/registry/ui/line-chart-card-parts";
import type { ChartTone } from "@/registry/ui/line-chart-card-parts";

/**
 * Line Chart Card: one or more series drawn as smooth lines over a dashed
 * horizontal grid, in the kit's grey card shell. The headline is the latest
 * value of the first series with its change against the point before; the
 * period switch swaps the whole data set (week, month or year buckets).
 * Hovering draws a dashed cursor, a pinging dot on every line and a tooltip
 * card listing each series, and the headline counts to the hovered point.
 */

export type LineSeries = {
  /** Field on each point that holds this series' value. */
  key: string;
  label: string;
  /** Theme hue, `chart-1` … `chart-9`. */
  tone: ChartTone;
  /** Fill the area under the line with a fading gradient. */
  area?: boolean;
};

/** One x position: its axis label plus a number per series key. */
export type LinePoint = { label: string } & Record<string, string | number>;

export type LinePeriod = { id: string; label: string; data: LinePoint[] };

export const LINE_SERIES: LineSeries[] = [
  { key: "revenue", label: "Revenue", tone: 2, area: true },
  { key: "costs", label: "Costs", tone: 6 },
];

const WEEKS = ["Aug 4", "Aug 11", "Aug 18", "Aug 25", "Sep 1", "Sep 8", "Sep 15", "Sep 22", "Sep 29", "Oct 6", "Oct 13", "Oct 20"];
const MONTHS = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];
const YEARS = ["2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025"];

const zip = (labels: string[], revenue: number[], costs: number[]): LinePoint[] =>
  labels.map((label, i) => ({ label, revenue: revenue[i] ?? 0, costs: costs[i] ?? 0 }));

/** Week, month and year buckets of the same business; each ends on its latest bucket. */
export const LINE_PERIODS: LinePeriod[] = [
  {
    id: "weekly",
    label: "Weekly",
    data: zip(
      WEEKS,
      [12480, 13120, 12760, 14010, 14630, 13980, 15240, 15870, 15310, 16420, 16670, 18240],
      [8120, 8340, 8410, 8760, 9020, 8890, 9310, 9580, 9440, 9870, 10120, 10460],
    ),
  },
  {
    id: "monthly",
    label: "Monthly",
    data: zip(
      MONTHS,
      [48200, 52900, 46100, 49800, 55300, 54100, 58600, 61200, 59400, 63800, 66100, 71450],
      [33100, 35800, 32400, 33900, 36200, 35800, 37900, 39100, 38600, 40200, 41300, 43700],
    ),
  },
  {
    id: "yearly",
    label: "Yearly",
    data: zip(
      YEARS,
      [312000, 358000, 401000, 447000, 523000, 588000, 642000, 731000],
      [228000, 251000, 276000, 301000, 342000, 371000, 398000, 442000],
    ),
  },
];

const valueAt = (point: LinePoint | undefined, key: string) => {
  const raw = point?.[key];
  return typeof raw === "number" ? raw : Number(raw ?? 0);
};

export type LineChartCardProps = {
  title?: string;
  /** Series in legend order; the first one drives the headline and is drawn on top. */
  series?: LineSeries[];
  periods?: LinePeriod[];
  /** Controlled period id. */
  period?: string;
  /** Initial period when uncontrolled; defaults to the first period. */
  defaultPeriod?: string;
  onPeriodChange?: (id: string) => void;
  /** `curved` is a monotone spline; `sharp` joins the points with straight segments. */
  shape?: "curved" | "sharp";
  /** Header switch style. */
  periodControl?: "segmented" | "select";
  /** Prepended to every value ("$"). */
  valuePrefix?: string;
  className?: string;
};

// #region critical
export function LineChartCard({
  title = "Revenue",
  series = LINE_SERIES,
  periods = LINE_PERIODS,
  period,
  defaultPeriod,
  onPeriodChange,
  shape = "curved",
  periodControl = "segmented",
  valuePrefix = "$",
  className,
}: LineChartCardProps = {}) {
  const reduced = useReducedMotion();
  const gradientBase = useId();
  const [innerPeriod, setInnerPeriod] = useState(defaultPeriod ?? periods[0]?.id ?? "");
  const periodId = period ?? innerPeriod;
  const active = periods.find((p) => p.id === periodId) ?? periods[0];
  const data = active?.data ?? [];
  const [hovered, setHovered] = useState<number | null>(null);

  const primary = series[0];
  const index = hovered !== null && hovered < data.length ? hovered : data.length - 1;
  const point = data[index];
  const headline = primary ? valueAt(point, primary.key) : 0;
  const before = index > 0 && primary ? valueAt(data[index - 1], primary.key) : undefined;
  const money = (n: number) => `${valuePrefix}${formatNumber(n)}`;
  const curve = shape === "sharp" ? "linear" : "monotone";

  const selectPeriod = (id: string) => {
    setHovered(null);
    if (period === undefined) setInnerPeriod(id);
    onPeriodChange?.(id);
  };

  return (
    <section aria-label={`${title} chart`} className={cx(CHART_CARD_FRAME, "h-[376px]", className)}>
      <div className="flex flex-col gap-3 px-2 pt-2 @md:flex-row @md:items-start @md:justify-between">
        <ChartHeadline
          label={hovered !== null && point ? `${title} · ${point.label}` : title}
          value={headline}
          format={money}
          delta={describeDelta(headline, before)}
          swapKey={`${periodId}-${hovered ?? "latest"}`}
          reducedMotion={reduced}
        />
        <div className="flex flex-col gap-2 @md:items-end">
          {periods.length > 1 ? (
            <ChartPeriodControl
              options={periods}
              value={periodId}
              onChange={selectPeriod}
              variant={periodControl}
              label={`${title} period`}
              className="self-start @md:self-end"
            />
          ) : null}
          {series.length > 1 ? <ChartLegend items={series} className="@md:pe-1" /> : null}
        </div>
      </div>

      <div className="min-h-0 w-full flex-1 pt-3 pe-2">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 520, height: 240 }}>
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            onMouseMove={(state) => {
              const next = Number(state?.activeTooltipIndex);
              if (state?.isTooltipActive && Number.isFinite(next)) setHovered(next);
            }}
            onMouseLeave={() => setHovered(null)}
          >
            <defs>
              {series.map((s) =>
                s.area ? (
                  <linearGradient key={s.key} id={`${gradientBase}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={toneColor(s.tone)} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={toneColor(s.tone)} stopOpacity={0} />
                  </linearGradient>
                ) : null,
              )}
            </defs>
            <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="4 4" />
            <YAxis
              width={48}
              domain={[0, "auto"]}
              tickCount={4}
              tickFormatter={(v: number) => formatCompact(v, valuePrefix)}
              tickLine={false}
              axisLine={false}
              tick={AXIS_TICK}
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              interval="preserveStartEnd"
              minTickGap={12}
              tick={AXIS_TICK}
            />
            <Tooltip
              cursor={CHART_CURSOR}
              offset={16}
              isAnimationActive={!reduced}
              animationDuration={160}
              wrapperStyle={{ outline: "none", zIndex: 10 }}
              content={({ active: isActive, activeIndex }) => {
                const at = data[activeIndex == null ? -1 : Number(activeIndex)];
                if (!isActive || !at) return null;
                return (
                  <ChartTooltipCard
                    title={at.label}
                    rows={series.map((s) => ({ key: s.key, label: s.label, tone: s.tone, value: money(valueAt(at, s.key)) }))}
                  />
                );
              }}
            />
            {/* Paint in reverse so the first (headline) series sits on top. */}
            {[...series].reverse().map((s) => (
              <Fragment key={s.key}>
                {s.area ? (
                  <Area
                    type={curve}
                    dataKey={s.key}
                    name={s.label}
                    stroke="none"
                    fill={`url(#${gradientBase}-${s.key})`}
                    activeDot={false}
                    isAnimationActive={!reduced}
                    animationDuration={450}
                  />
                ) : null}
                <Line
                  type={curve}
                  dataKey={s.key}
                  name={s.label}
                  stroke={toneActiveColor(s.tone)}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={<PulseDot color={toneActiveColor(s.tone)} pulse={!reduced} />}
                  isAnimationActive={!reduced}
                  animationDuration={450}
                />
              </Fragment>
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
// #endregion
