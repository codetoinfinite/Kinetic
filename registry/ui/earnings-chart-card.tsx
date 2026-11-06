/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Earnings Chart Card" (boardui.com/components/earnings-chart-card).
 * No BoardUI source was used.
 */
"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";
import { cx } from "@/registry/lib/cx";
import {
  AXIS_TICK,
  CHART_CARD_FRAME,
  ChartHeadline,
  ChartPeriodControl,
  ChartTooltipCard,
  GRID_STROKE,
  describeDelta,
  formatCompact,
  formatNumber,
  toneActiveColor,
  toneColor,
} from "@/registry/ui/line-chart-card-parts";
import type { ChartTone } from "@/registry/ui/line-chart-card-parts";

/**
 * Earnings Chart Card: rounded bars standing in full-height grey tracks, with
 * the newest bar (the period still running) drawn in the darker active tone.
 * The headline counts to that bar's value and compares it with the bar before.
 * Hovering a bar moves the highlight there, rings its track with an outline,
 * and switches the headline and its chip to that bar.
 */

export type EarningsPoint = { label: string; value: number };

export type EarningsPeriod = {
  id: string;
  label: string;
  /** Oldest first; the last point is the current, still-running bucket. */
  data: EarningsPoint[];
  /** Fixed Y-axis ticks. Omit for four automatic ticks. */
  ticks?: number[];
};

/** Weekly ends on $7,462 (+14.8%), monthly on $32,450 (+11.5%), yearly on $362,400 (+13.6%). */
export const EARNINGS_PERIODS: EarningsPeriod[] = [
  {
    id: "weekly",
    label: "Weekly",
    ticks: [0, 3000, 5000, 10000],
    data: [2700, 7400, 11200, 7100, 3600, 2200, 3800, 5000, 9600, 4400, 6500, 7462].map((value, i) => ({
      label: `W${i + 1}`,
      value,
    })),
  },
  {
    id: "monthly",
    label: "Monthly",
    data: [21400, 24800, 23100, 26900, 28300, 25600, 29900, 31200, 27800, 30400, 29100, 32450].map((value, i) => ({
      label: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i] ?? "",
      value,
    })),
  },
  {
    id: "yearly",
    label: "Yearly",
    data: [182000, 214500, 251300, 288700, 318900, 362400].map((value, i) => ({ label: String(2019 + i), value })),
  },
];

/** Corner radius of the bars and their tracks; the hover ring adds its 3px offset to it. */
const BAR_RADIUS = 8;
const RING_OFFSET = 3;

type TrackShape = { x?: number; y?: number; width?: number; height?: number; index?: number };

export type EarningsChartCardProps = {
  /** Header label while no bar is hovered. */
  title?: string;
  periods?: EarningsPeriod[];
  /** Controlled period id. */
  period?: string;
  /** Initial period when uncontrolled; defaults to the first period. */
  defaultPeriod?: string;
  onPeriodChange?: (id: string) => void;
  /** Bar hue; the current or hovered bar uses its `-active` step. */
  tone?: ChartTone;
  /** Prefix for the headline, ticks and tooltip ("$"). */
  valuePrefix?: string;
  /** Header switch style. */
  periodControl?: "segmented" | "select";
  className?: string;
};

// #region critical
export function EarningsChartCard({
  title = "Earned so far",
  periods = EARNINGS_PERIODS,
  period,
  defaultPeriod,
  onPeriodChange,
  tone = 2,
  valuePrefix = "$",
  periodControl = "segmented",
  className,
}: EarningsChartCardProps = {}) {
  const reduced = useReducedMotion();
  const [innerPeriod, setInnerPeriod] = useState(defaultPeriod ?? periods[0]?.id ?? "");
  const periodId = period ?? innerPeriod;
  const active = periods.find((p) => p.id === periodId) ?? periods[0];
  const data = active?.data ?? [];
  const [hovered, setHovered] = useState<number | null>(null);

  // The highlighted bar is the hovered one, else the newest (the bucket still running).
  const focus = hovered ?? data.length - 1;
  const point = data[focus];
  const before = focus > 0 ? data[focus - 1] : undefined;
  const delta = point && before ? describeDelta(point.value, before.value) : null;
  const money = (value: number) => `${valuePrefix}${formatNumber(value)}`;

  const selectPeriod = (id: string) => {
    setHovered(null);
    if (period === undefined) setInnerPeriod(id);
    onPeriodChange?.(id);
  };

  // Grey full-height track behind each bar, plus an outline ring that fades in on the hovered one.
  const renderTrack = ({ x, y, width, height, index }: TrackShape) => {
    if (x === undefined || y === undefined || width === undefined || height === undefined) return <g />;
    return (
      <g pointerEvents="none">
        <rect x={x} y={y} width={width} height={height} rx={BAR_RADIUS} fill="var(--color-chart-track)" />
        <rect
          x={x - RING_OFFSET}
          y={y - RING_OFFSET}
          width={width + RING_OFFSET * 2}
          height={height + RING_OFFSET * 2}
          rx={BAR_RADIUS + RING_OFFSET}
          fill="none"
          stroke={toneActiveColor(tone)}
          strokeWidth={1.5}
          opacity={index === hovered ? 1 : 0}
          className="transition-opacity duration-150 ease-out motion-reduce:transition-none"
        />
      </g>
    );
  };

  return (
    <section aria-label={`${title} chart`} className={cx(CHART_CARD_FRAME, "gap-3", className)}>
      <div className="flex flex-col gap-3 px-2 pt-2 @md:flex-row @md:items-start @md:justify-between">
        <ChartHeadline
          label={hovered !== null && point ? `Earned · ${point.label}` : title}
          value={point?.value ?? 0}
          format={money}
          delta={delta}
          swapKey={`${periodId}-${hovered ?? "current"}`}
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

      <div className="h-[248px] w-full pe-2 pb-1">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 520, height: 248 }}>
          <BarChart
            data={data}
            barCategoryGap="30%"
            margin={{ top: RING_OFFSET + 4, right: RING_OFFSET, bottom: 0, left: 0 }}
            onMouseMove={(state) => {
              const next = Number(state?.activeTooltipIndex);
              if (state?.isTooltipActive && Number.isFinite(next)) setHovered(next);
            }}
            onMouseLeave={() => setHovered(null)}
          >
            <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="4 4" />
            <YAxis
              width={48}
              domain={[0, "auto"]}
              ticks={active?.ticks}
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
              minTickGap={6}
              tick={AXIS_TICK}
            />
            <Tooltip
              cursor={false}
              offset={16}
              isAnimationActive={!reduced}
              animationDuration={160}
              wrapperStyle={{ outline: "none", zIndex: 10 }}
              content={({ active: isActive, activeIndex }) => {
                const i = activeIndex == null ? -1 : Number(activeIndex);
                const at = data[i];
                if (!isActive || !at) return null;
                const prev = data[i - 1];
                return (
                  <ChartTooltipCard
                    title={at.label}
                    rows={[
                      { key: "earned", label: "Earned", tone, value: money(at.value) },
                      ...(prev
                        ? [{ key: "change", label: `vs ${prev.label}`, value: describeDelta(at.value, prev.value).label }]
                        : []),
                    ]}
                  />
                );
              }}
            />
            <Bar
              dataKey="value"
              name="Earned"
              radius={BAR_RADIUS}
              maxBarSize={32}
              background={renderTrack}
              isAnimationActive={!reduced}
              animationDuration={450}
            >
              {data.map((p, i) => (
                <Cell
                  key={p.label}
                  fill={i === focus ? toneActiveColor(tone) : toneColor(tone)}
                  className="transition-[fill] duration-200 ease-out motion-reduce:transition-none"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
// #endregion
