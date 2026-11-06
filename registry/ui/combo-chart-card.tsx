/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Combo Chart Card" (boardui.com/components/combo-chart-card).
 * No BoardUI source was used.
 */
"use client";

import { useState } from "react";
import { Bar, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";
import { cx } from "@/registry/lib/cx";
import {
  AXIS_TICK,
  CHART_CARD_FRAME,
  ChartHeadline,
  ChartLegend,
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
 * Combo Chart Card: a volume measured in bars on the left axis with a rate
 * drawn as a line on the right axis, so two different units share one plot.
 * Hovering a month darkens its bar and dims the rest, pops a pulsing dot on
 * the line, opens a tooltip with both values and swaps the headline and tiles
 * to that month.
 */

/** One month: its axis label, the bar value and the line value (a percentage). */
export type ComboPoint = { label: string; bar: number; line: number };

export type ComboPeriod = {
  id: string;
  label: string;
  data: ComboPoint[];
  /** Bar total of the period before, for the headline chip. */
  previousTotal?: number;
};

export type ComboMeasure = { label: string; tone: ChartTone };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const months = (bar: number[], line: number[]): ComboPoint[] =>
  MONTHS.map((label, i) => ({ label, bar: bar[i] ?? 0, line: line[i] ?? 0 }));

/** Sessions and conversion rate; this year totals 83,200 sessions at 3.7%. */
export const COMBO_PERIODS: ComboPeriod[] = [
  {
    id: "this-year",
    label: "This year",
    previousTotal: 76050,
    data: months(
      [5200, 5600, 6100, 6400, 6900, 6700, 7300, 7600, 7400, 7800, 8000, 8200],
      [3.1, 3.3, 3.4, 3.6, 3.5, 3.7, 3.8, 3.6, 3.9, 4.0, 3.8, 4.1],
    ),
  },
  {
    id: "last-year",
    label: "Last year",
    previousTotal: 70300,
    data: months(
      [4800, 5100, 5500, 5900, 6300, 6200, 6700, 7000, 6800, 7100, 7250, 7400],
      [2.8, 2.9, 3.1, 3.2, 3.3, 3.2, 3.4, 3.5, 3.3, 3.6, 3.5, 3.7],
    ),
  },
];

const pct = (value: number) => `${value.toFixed(1)}%`;

export type ComboChartCardProps = {
  /** Name and colour of the bar measure (left axis). */
  bars?: ComboMeasure;
  /** Name and colour of the line measure (right axis, in percent). */
  line?: ComboMeasure;
  periods?: ComboPeriod[];
  /** Controlled period id. */
  period?: string;
  /** Initial period when uncontrolled; defaults to the first period. */
  defaultPeriod?: string;
  onPeriodChange?: (id: string) => void;
  /** Header switch style. */
  periodControl?: "segmented" | "select";
  className?: string;
};

// #region critical
export function ComboChartCard({
  bars = { label: "Sessions", tone: 2 },
  line = { label: "Conversion", tone: 6 },
  periods = COMBO_PERIODS,
  period,
  defaultPeriod,
  onPeriodChange,
  periodControl = "select",
  className,
}: ComboChartCardProps = {}) {
  const reduced = useReducedMotion();
  const [innerPeriod, setInnerPeriod] = useState(defaultPeriod ?? periods[0]?.id ?? "");
  const periodId = period ?? innerPeriod;
  const active = periods.find((p) => p.id === periodId) ?? periods[0];
  const data = active?.data ?? [];
  const [hovered, setHovered] = useState<number | null>(null);

  const point = hovered !== null ? data[hovered] : undefined;
  const total = data.reduce((sum, p) => sum + p.bar, 0);
  // Session-weighted, so a quiet month does not move the yearly rate as much as a busy one.
  const average = total > 0 ? data.reduce((sum, p) => sum + p.bar * p.line, 0) / total : 0;
  const rate = point ? point.line : average;
  const headline = point ? point.bar : total;
  const delta = point
    ? hovered !== null && hovered > 0
      ? describeDelta(point.bar, data[hovered - 1]?.bar)
      : null
    : describeDelta(total, active?.previousTotal);

  const selectPeriod = (id: string) => {
    setHovered(null);
    if (period === undefined) setInnerPeriod(id);
    onPeriodChange?.(id);
  };

  const barFill = (i: number) => (i === hovered ? toneActiveColor(bars.tone) : toneColor(bars.tone));

  return (
    <section aria-label={`${bars.label} and ${line.label} chart`} className={cx(CHART_CARD_FRAME, "gap-3", className)}>
      <div className="flex flex-col gap-3 px-2 pt-2 @md:flex-row @md:items-start @md:justify-between">
        <ChartHeadline
          label={`${bars.label}${point ? ` · ${point.label}` : ""} · ${line.label} ${pct(rate)}`}
          value={headline}
          delta={delta}
          swapKey={`${periodId}-${hovered ?? "total"}`}
          reducedMotion={reduced}
        />
        <div className="flex flex-col gap-2 @md:items-end">
          {periods.length > 1 ? (
            <ChartPeriodControl
              options={periods}
              value={periodId}
              onChange={selectPeriod}
              variant={periodControl}
              label={`${bars.label} period`}
              className="self-start @md:self-end"
            />
          ) : null}
          <ChartLegend
            items={[
              { key: "bar", label: bars.label, tone: bars.tone },
              { key: "line", label: line.label, tone: line.tone },
            ]}
            className="@md:pe-1"
          />
        </div>
      </div>

      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 520, height: 240 }}>
          <ComposedChart
            data={data}
            barCategoryGap="22%"
            margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
            onMouseMove={(state) => {
              const next = Number(state?.activeTooltipIndex);
              if (state?.isTooltipActive && Number.isFinite(next)) setHovered(next);
            }}
            onMouseLeave={() => setHovered(null)}
          >
            <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="4 4" />
            <YAxis
              yAxisId="bars"
              width={44}
              domain={[0, "auto"]}
              tickCount={4}
              tickFormatter={(v: number) => formatCompact(v)}
              tickLine={false}
              axisLine={false}
              tick={AXIS_TICK}
            />
            <YAxis
              yAxisId="line"
              orientation="right"
              width={40}
              domain={[0, (max: number) => Math.max(3, Math.ceil((max * 1.2) / 3) * 3)]}
              tickCount={4}
              tickFormatter={(v: number) => `${Math.round(v)}%`}
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
              cursor={false}
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
                    rows={[
                      { key: "bar", label: bars.label, tone: bars.tone, value: formatNumber(at.bar) },
                      { key: "line", label: line.label, tone: line.tone, value: pct(at.line) },
                    ]}
                  />
                );
              }}
            />
            <Bar
              yAxisId="bars"
              dataKey="bar"
              name={bars.label}
              radius={[6, 6, 6, 6]}
              maxBarSize={28}
              isAnimationActive={!reduced}
              animationDuration={450}
            >
              {data.map((p, i) => (
                <Cell
                  key={p.label}
                  fill={barFill(i)}
                  fillOpacity={hovered !== null && i !== hovered ? 0.45 : 1}
                  className="transition-[fill-opacity] duration-200 ease-out motion-reduce:transition-none"
                />
              ))}
            </Bar>
            <Line
              yAxisId="line"
              type="monotone"
              dataKey="line"
              name={line.label}
              stroke={toneActiveColor(line.tone)}
              strokeWidth={2.5}
              dot={{ r: 3, fill: toneActiveColor(line.tone), stroke: "var(--color-background-secondary-default)", strokeWidth: 1.5 }}
              activeDot={<PulseDot color={toneActiveColor(line.tone)} pulse={!reduced} />}
              isAnimationActive={!reduced}
              animationDuration={450}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <ChartStatTiles
        columns={2}
        tiles={[
          {
            key: "bar",
            tone: bars.tone,
            label: point ? `${bars.label} · ${point.label}` : `${bars.label} · total`,
            value: formatNumber(headline),
          },
          {
            key: "line",
            tone: line.tone,
            label: point ? `${line.label} · ${point.label}` : `${line.label} · average`,
            value: pct(rate),
          },
        ]}
      />
    </section>
  );
}
// #endregion
