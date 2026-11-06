/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Radar Chart Card" (boardui.com/components/radar-chart-card).
 * No BoardUI source was used.
 */
"use client";

import { useEffect, useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  useActiveTooltipLabel,
  useIsTooltipActive,
} from "recharts";

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
  formatNumber,
  toneActiveColor,
  toneColor,
} from "@/registry/ui/line-chart-card-parts";
import type { ChartTone } from "@/registry/ui/line-chart-card-parts";

/**
 * Radar Chart Card: one series on a hexagonal polar grid, a header that counts
 * to the range total (or to the hovered axis), a calendar pill that swaps the
 * range, and a tile per axis underneath. Four looks: a filled polygon, a light
 * fill with vertex dots, an outline only, or a fill with a centre score disc
 * that turns rose when the value it shows is low.
 */

export type RadarAxisPoint = { label: string; value: number };

export type RadarRange = {
  id: string;
  label: string;
  /** One point per axis, clockwise from the top. */
  data: RadarAxisPoint[];
  /** Total of the range before, for the header chip. */
  previous?: number;
};

const point = (label: string, value: number): RadarAxisPoint => ({ label, value });

/** H1 totals 1,424 (+5.2% on 1,354), H2 1,598 (+12.2%), the full year 3,022 (+8.7% on 2,780). */
export const RADAR_RANGES: RadarRange[] = [
  {
    id: "h1-2024",
    label: "H1 2024",
    previous: 1354,
    data: [
      point("January", 186),
      point("February", 305),
      point("March", 237),
      point("April", 273),
      point("May", 209),
      point("June", 214),
    ],
  },
  {
    id: "h2-2024",
    label: "H2 2024",
    previous: 1424,
    data: [
      point("July", 251),
      point("August", 318),
      point("September", 264),
      point("October", 296),
      point("November", 228),
      point("December", 241),
    ],
  },
  {
    id: "2024",
    label: "2024",
    previous: 2780,
    data: [
      point("Jan–Feb", 491),
      point("Mar–Apr", 510),
      point("May–Jun", 423),
      point("Jul–Aug", 569),
      point("Sep–Oct", 560),
      point("Nov–Dec", 469),
    ],
  },
];

export type RadarVariant = "filled" | "dots" | "lines" | "score";

/** Polygon fill per look; the 2px outline is the same for all four. */
const VARIANT_FILL: Record<RadarVariant, number> = { filled: 0.6, dots: 0.2, lines: 0, score: 0.35 };

/**
 * Matching opposite margins keep the polar centre at the middle of the plot box,
 * where the score disc sits. The wider sides only bite on narrow cards, where
 * they shrink the radius so "February" and "September" stay inside the card.
 */
export const RADAR_MARGIN = { top: 12, right: 40, bottom: 12, left: 40 };
export const RADAR_OUTER_RADIUS = "78%";

/**
 * Mirrors Recharts' tooltip state into the card: the active angle label while
 * the pointer (or the chart's arrow-key focus) is on an axis, null otherwise.
 * Reading it from the store avoids the first-event lag of `onMouseMove`.
 */
export function RadarActiveAxis({ onChange }: { onChange: (label: string | null) => void }) {
  const active = useIsTooltipActive();
  const label = useActiveTooltipLabel();
  const next = active && label !== undefined ? String(label) : null;
  useEffect(() => {
    onChange(next);
  }, [next, onChange]);
  return null;
}

export type RadarChartCardProps = {
  /** Header label and series name. */
  title?: string;
  ranges?: RadarRange[];
  /** Controlled range id. */
  range?: string;
  /** Initial range when uncontrolled; defaults to the first range. */
  defaultRange?: string;
  onRangeChange?: (id: string) => void;
  variant?: RadarVariant;
  tone?: ChartTone;
  /** "score" look only: the disc turns rose below this value. */
  lowThreshold?: number;
  /** Header switch style. */
  rangeControl?: "segmented" | "select";
  /** Hide the per-axis tiles under the chart. */
  hideTiles?: boolean;
  className?: string;
};

// #region critical
export function RadarChartCard({
  title = "Visitors",
  ranges = RADAR_RANGES,
  range,
  defaultRange,
  onRangeChange,
  variant = "filled",
  tone = 2,
  lowThreshold = 200,
  rangeControl = "select",
  hideTiles = false,
  className,
}: RadarChartCardProps = {}) {
  const reduced = useReducedMotion();
  const [innerRange, setInnerRange] = useState(defaultRange ?? ranges[0]?.id ?? "");
  const rangeId = range ?? innerRange;
  const active = ranges.find((r) => r.id === rangeId) ?? ranges[0];
  const data = active?.data ?? [];
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);

  const total = data.reduce((sum, p) => sum + p.value, 0);
  const hoveredIndex = hoveredLabel === null ? -1 : data.findIndex((p) => p.label === hoveredLabel);
  const hovered = data[hoveredIndex];

  // At rest the header is the range total against the range before; on an axis it is that axis alone.
  const headline = hovered ? hovered.value : total;
  const delta = hovered ? null : describeDelta(total, active?.previous);
  const average = data.length > 0 ? total / data.length : 0;
  const score = hovered ? hovered.value : average;
  const low = score < lowThreshold;

  const selectRange = (id: string) => {
    if (range === undefined) setInnerRange(id);
    onRangeChange?.(id);
  };

  return (
    <section aria-label={`${title} radar chart`} className={cx(CHART_CARD_FRAME, "gap-3", className)}>
      <div className="flex items-start justify-between gap-3 px-2 pt-2">
        <ChartHeadline
          label={hovered ? `${title} · ${hovered.label}` : title}
          value={headline}
          delta={delta}
          swapKey={`${rangeId}-${hovered?.label ?? "total"}`}
          reducedMotion={reduced}
        />
        {ranges.length > 1 ? (
          <ChartPeriodControl
            options={ranges}
            value={rangeId}
            onChange={selectRange}
            variant={rangeControl}
            label={`${title} range`}
            className="shrink-0"
          />
        ) : null}
      </div>

      <div className="relative h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 420, height: 280 }}>
          <RadarChart data={data} margin={RADAR_MARGIN} outerRadius={RADAR_OUTER_RADIUS}>
            <RadarActiveAxis onChange={setHoveredLabel} />
            <PolarGrid gridType="polygon" stroke={GRID_STROKE} />
            <PolarRadiusAxis domain={[0, "auto"]} tick={false} axisLine={false} />
            <PolarAngleAxis dataKey="label" tick={AXIS_TICK} tickLine={false} />
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
                    rows={[
                      { key: "value", label: title, tone, value: formatNumber(at.value) },
                      { key: "share", label: "Share", value: `${formatNumber((at.value / (total || 1)) * 100, 1)}%` },
                    ]}
                  />
                );
              }}
            />
            <Radar
              dataKey="value"
              name={title}
              fill={toneColor(tone)}
              fillOpacity={VARIANT_FILL[variant]}
              stroke={toneActiveColor(tone)}
              strokeWidth={2}
              strokeLinejoin="round"
              dot={
                variant === "dots"
                  ? {
                      r: 3.5,
                      fill: toneActiveColor(tone),
                      fillOpacity: 1,
                      stroke: "var(--color-background-secondary-default)",
                      strokeWidth: 1.5,
                    }
                  : false
              }
              activeDot={<PulseDot color={toneActiveColor(tone)} pulse={!reduced} />}
              isAnimationActive={!reduced}
              animationDuration={500}
            />
          </RadarChart>
        </ResponsiveContainer>

        {variant === "score" ? (
          <div
            aria-hidden
            className={cx(
              "pointer-events-none absolute top-1/2 left-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 bg-background-primary-default transition-colors duration-200 ease-out motion-reduce:transition-none",
              low ? "text-status-rose-text" : "text-text-primary",
            )}
            style={{ borderColor: low ? "var(--color-status-rose-text)" : toneActiveColor(tone) }}
          >
            <span className="text-body-medium tabular-nums">{formatNumber(score)}</span>
            <span className="max-w-12 truncate text-[10px] leading-3 text-text-tertiary">
              {hovered ? hovered.label : "avg"}
            </span>
          </div>
        ) : null}
      </div>

      {hideTiles ? null : (
        <ChartStatTiles
          columns={3}
          tiles={data.map((p) => ({ key: p.label, label: p.label, value: formatNumber(p.value) }))}
        />
      )}
    </section>
  );
}
// #endregion
