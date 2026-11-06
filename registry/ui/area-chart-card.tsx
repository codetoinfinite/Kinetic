/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Area Chart Card" (boardui.com/components/area-chart-card).
 * No BoardUI source was used.
 */
"use client";

import { useId, useState } from "react";
import { Area, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";
import { cx } from "@/registry/lib/cx";
import {
  AXIS_TICK,
  CHART_CARD_FRAME,
  CHART_CURSOR,
  ChartHeadline,
  ChartPeriodControl,
  ChartStatTiles,
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
 * Area Chart Card: categories drawn as gradient-filled areas, stacked by
 * default, with a total headline, a period switch that swaps the data set and
 * a row of tiles that doubles as the legend. Hovering a month draws a dashed
 * cursor, a dot on every area and a tooltip card; the headline counts to that
 * month's total and the tiles show the month's split.
 */

export type AreaSeries = {
  /** Field on each point that holds this category's value. */
  key: string;
  label: string;
  /** Theme hue, `chart-1` … `chart-9`. */
  tone: ChartTone;
};

/** One x position: its axis label plus a number per series key. */
export type AreaPoint = { label: string } & Record<string, string | number>;

export type AreaPeriod = {
  id: string;
  label: string;
  data: AreaPoint[];
  /** Total of the period before, for the headline chip. */
  previousTotal?: number;
};

export const AREA_SERIES: AreaSeries[] = [
  { key: "organic", label: "Organic", tone: 2 },
  { key: "referral", label: "Referral", tone: 6 },
  { key: "paid", label: "Paid", tone: 5 },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const months = (organic: number[], referral: number[], paid: number[]): AreaPoint[] =>
  MONTHS.map((label, i) => ({ label, organic: organic[i] ?? 0, referral: referral[i] ?? 0, paid: paid[i] ?? 0 }));

/** Two years of monthly visitors; this year totals 94,700 against 87,520. */
export const AREA_PERIODS: AreaPeriod[] = [
  {
    id: "this-year",
    label: "This year",
    previousTotal: 87520,
    data: months(
      [3200, 3450, 3600, 3900, 4100, 4050, 4300, 4450, 4500, 4700, 4950, 5300],
      [1700, 1800, 1950, 2000, 2100, 2050, 2200, 2250, 2300, 2400, 2500, 2650],
      [1300, 1250, 1400, 1450, 1500, 1600, 1550, 1500, 1550, 1650, 1700, 1850],
    ),
  },
  {
    id: "last-year",
    label: "Last year",
    previousTotal: 80940,
    data: months(
      [3000, 3150, 3300, 3550, 3750, 3700, 3950, 4100, 4150, 4400, 4600, 4950],
      [1600, 1650, 1800, 1850, 1950, 1900, 2050, 2100, 2150, 2250, 2300, 2500],
      [1200, 1150, 1300, 1350, 1380, 1450, 1420, 1400, 1430, 1520, 1560, 1660],
    ),
  },
];

const valueAt = (point: AreaPoint | undefined, key: string) => {
  const raw = point?.[key];
  return typeof raw === "number" ? raw : Number(raw ?? 0);
};

export type AreaChartView = "stacked" | "overlap" | "percent";

export type AreaChartCardProps = {
  title?: string;
  /** Categories bottom to top; tiles follow the same order. */
  series?: AreaSeries[];
  periods?: AreaPeriod[];
  /** Controlled period id. */
  period?: string;
  /** Initial period when uncontrolled; defaults to the first period. */
  defaultPeriod?: string;
  onPeriodChange?: (id: string) => void;
  /** Stack the areas, let them overlap from zero, or stretch each month to 100%. */
  view?: AreaChartView;
  /** `curved` is a monotone spline; `sharp` uses straight segments. */
  shape?: "curved" | "sharp";
  /** Header switch style. */
  periodControl?: "segmented" | "select";
  className?: string;
};

// #region critical
export function AreaChartCard({
  title = "Visitors",
  series = AREA_SERIES,
  periods = AREA_PERIODS,
  period,
  defaultPeriod,
  onPeriodChange,
  view = "stacked",
  shape = "curved",
  periodControl = "segmented",
  className,
}: AreaChartCardProps = {}) {
  const reduced = useReducedMotion();
  const gradientBase = useId();
  const [innerPeriod, setInnerPeriod] = useState(defaultPeriod ?? periods[0]?.id ?? "");
  const periodId = period ?? innerPeriod;
  const active = periods.find((p) => p.id === periodId) ?? periods[0];
  const data = active?.data ?? [];
  const [hovered, setHovered] = useState<number | null>(null);

  const point = hovered !== null ? data[hovered] : undefined;
  const sumOf = (p: AreaPoint | undefined) => series.reduce((sum, s) => sum + valueAt(p, s.key), 0);
  const totals = series.map((s) => data.reduce((sum, p) => sum + valueAt(p, s.key), 0));
  const grandTotal = totals.reduce((a, b) => a + b, 0);

  const headline = point ? sumOf(point) : grandTotal;
  const delta = point
    ? hovered !== null && hovered > 0
      ? describeDelta(headline, sumOf(data[hovered - 1]))
      : null
    : describeDelta(grandTotal, active?.previousTotal);
  const curve = shape === "sharp" ? "linear" : "monotone";
  const percent = view === "percent";

  const selectPeriod = (id: string) => {
    setHovered(null);
    if (period === undefined) setInnerPeriod(id);
    onPeriodChange?.(id);
  };

  return (
    <section aria-label={`${title} chart`} className={cx(CHART_CARD_FRAME, "gap-3", className)}>
      <div className="flex flex-col gap-3 px-2 pt-2 @md:flex-row @md:items-start @md:justify-between">
        <ChartHeadline
          label={point ? `${title} · ${point.label}` : title}
          value={headline}
          delta={delta}
          swapKey={`${periodId}-${hovered ?? "total"}`}
          reducedMotion={reduced}
        />
        {periods.length > 1 ? (
          <ChartPeriodControl
            options={periods}
            value={periodId}
            onChange={selectPeriod}
            variant={periodControl}
            label={`${title} period`}
            className="self-start"
          />
        ) : null}
      </div>

      <div className="h-[248px] w-full pe-2">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 520, height: 248 }}>
          <ComposedChart
            data={data}
            stackOffset={percent ? "expand" : "none"}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            onMouseMove={(state) => {
              const next = Number(state?.activeTooltipIndex);
              if (state?.isTooltipActive && Number.isFinite(next)) setHovered(next);
            }}
            onMouseLeave={() => setHovered(null)}
          >
            <defs>
              {series.map((s) => (
                <linearGradient key={s.key} id={`${gradientBase}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={toneColor(s.tone)} stopOpacity={0.55} />
                  <stop offset="100%" stopColor={toneColor(s.tone)} stopOpacity={0.05} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="4 4" />
            <YAxis
              width={44}
              domain={percent ? [0, 1] : [0, "auto"]}
              tickCount={percent ? 5 : 4}
              tickFormatter={(v: number) => (percent ? `${Math.round(v * 100)}%` : formatCompact(v))}
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
              minTickGap={8}
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
                const total = sumOf(at);
                return (
                  <ChartTooltipCard
                    title={`${at.label} · ${formatNumber(total)} total`}
                    rows={[...series].reverse().map((s) => {
                      const v = valueAt(at, s.key);
                      const share = total > 0 ? ` (${Math.round((v / total) * 100)}%)` : "";
                      return { key: s.key, label: s.label, tone: s.tone, value: `${formatNumber(v)}${percent ? share : ""}` };
                    })}
                  />
                );
              }}
            />
            {series.map((s) => (
              <Area
                key={s.key}
                type={curve}
                dataKey={s.key}
                name={s.label}
                stackId={view === "overlap" ? undefined : "total"}
                stroke={toneActiveColor(s.tone)}
                strokeWidth={2}
                fill={`url(#${gradientBase}-${s.key})`}
                activeDot={<PulseDot color={toneActiveColor(s.tone)} pulse={!reduced} />}
                isAnimationActive={!reduced}
                animationDuration={450}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <ChartStatTiles
        columns={series.length === 2 ? 2 : "3-wrap"}
        tiles={series.map((s, i) => ({
          key: s.key,
          label: s.label,
          tone: s.tone,
          value: formatNumber(point ? valueAt(point, s.key) : (totals[i] ?? 0)),
        }))}
      />
    </section>
  );
}
// #endregion
