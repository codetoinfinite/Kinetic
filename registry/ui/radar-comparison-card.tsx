/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Radar Comparison Card" (boardui.com/).
 * No BoardUI source was used.
 */
"use client";

import { useState } from "react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";

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
  TONE_DOT,
  describeDelta,
  formatNumber,
  toneActiveColor,
} from "@/registry/ui/line-chart-card-parts";
import type { ChartTone } from "@/registry/ui/line-chart-card-parts";
import { RADAR_MARGIN, RADAR_OUTER_RADIUS, RadarActiveAxis } from "@/registry/ui/radar-chart-card";

/**
 * Radar Comparison Card: two (or more) outline-only series on one hexagonal
 * grid. The legend under the chart is live: it shows each series' range total
 * at rest and its value on the hovered axis, and each entry is a toggle button
 * that hides or shows its series. The last series left on cannot be hidden.
 */

export type RadarSeries = { key: string; label: string; tone: ChartTone };

export type RadarComparisonPoint = { label: string; values: Record<string, number> };

export type RadarComparisonRange = {
  id: string;
  label: string;
  /** One point per axis, clockwise from the top, with a value per series key. */
  data: RadarComparisonPoint[];
  /** Per-series total of the range before, for the header chip. */
  previous?: Record<string, number>;
};

export const RADAR_COMPARISON_SERIES: RadarSeries[] = [
  { key: "desktop", label: "Desktop", tone: 2 },
  { key: "mobile", label: "Mobile", tone: 6 },
];

const pt = (label: string, desktop: number, mobile: number): RadarComparisonPoint => ({
  label,
  values: { desktop, mobile },
});

/** Desktop 1,424 / Mobile 860 in H1, 1,598 / 1,100 in H2, 3,022 / 1,960 for the year. */
export const RADAR_COMPARISON_RANGES: RadarComparisonRange[] = [
  {
    id: "h1-2024",
    label: "H1 2024",
    previous: { desktop: 1354, mobile: 800 },
    data: [
      pt("January", 186, 80),
      pt("February", 305, 200),
      pt("March", 237, 120),
      pt("April", 273, 190),
      pt("May", 209, 130),
      pt("June", 214, 140),
    ],
  },
  {
    id: "h2-2024",
    label: "H2 2024",
    previous: { desktop: 1424, mobile: 860 },
    data: [
      pt("July", 251, 150),
      pt("August", 318, 210),
      pt("September", 264, 160),
      pt("October", 296, 230),
      pt("November", 228, 170),
      pt("December", 241, 180),
    ],
  },
  {
    id: "2024",
    label: "2024",
    previous: { desktop: 2780, mobile: 1700 },
    data: [
      pt("Jan–Feb", 491, 280),
      pt("Mar–Apr", 510, 310),
      pt("May–Jun", 423, 270),
      pt("Jul–Aug", 569, 360),
      pt("Sep–Oct", 560, 390),
      pt("Nov–Dec", 469, 350),
    ],
  },
];

export type RadarComparisonCardProps = {
  title?: string;
  series?: RadarSeries[];
  ranges?: RadarComparisonRange[];
  /** Controlled range id. */
  range?: string;
  defaultRange?: string;
  onRangeChange?: (id: string) => void;
  /** Controlled list of visible series keys. */
  visible?: string[];
  /** Initial visible keys when uncontrolled; defaults to every series. */
  defaultVisible?: string[];
  onVisibleChange?: (keys: string[]) => void;
  rangeControl?: "segmented" | "select";
  hideTiles?: boolean;
  className?: string;
};

// #region critical
export function RadarComparisonCard({
  title = "Visitors",
  series = RADAR_COMPARISON_SERIES,
  ranges = RADAR_COMPARISON_RANGES,
  range,
  defaultRange,
  onRangeChange,
  visible,
  defaultVisible,
  onVisibleChange,
  rangeControl = "select",
  hideTiles = false,
  className,
}: RadarComparisonCardProps = {}) {
  const reduced = useReducedMotion();
  const [innerRange, setInnerRange] = useState(defaultRange ?? ranges[0]?.id ?? "");
  const [innerVisible, setInnerVisible] = useState<string[]>(defaultVisible ?? series.map((s) => s.key));
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);

  const rangeId = range ?? innerRange;
  const active = ranges.find((r) => r.id === rangeId) ?? ranges[0];
  const data = active?.data ?? [];
  const rows = data.map((p) => ({ label: p.label, ...p.values }));

  // Never render an empty chart: if nothing valid is visible, the first series stays on.
  const visibleKeys = visible ?? innerVisible;
  const picked = series.filter((s) => visibleKeys.includes(s.key));
  const shown = picked.length > 0 ? picked : series.slice(0, 1);
  const isShown = (key: string) => shown.some((s) => s.key === key);
  const lead = shown[0];

  const valueOf = (p: RadarComparisonPoint | undefined, key: string) => p?.values[key] ?? 0;
  const totalOf = (key: string) => data.reduce((sum, p) => sum + valueOf(p, key), 0);
  // One radius scale for every series, so hiding one never rescales the other.
  const max = Math.max(0, ...data.flatMap((p) => series.map((s) => valueOf(p, s.key))));

  const hovered = hoveredLabel === null ? undefined : data.find((p) => p.label === hoveredLabel);
  const leadKey = lead?.key ?? "";
  const leadTotal = totalOf(leadKey);
  const leadPrevious = active?.previous?.[leadKey];
  const headline = hovered ? valueOf(hovered, leadKey) : leadTotal;
  const delta = hovered || leadPrevious === undefined ? null : describeDelta(leadTotal, leadPrevious);

  const selectRange = (id: string) => {
    if (range === undefined) setInnerRange(id);
    onRangeChange?.(id);
  };

  const toggle = (key: string) => {
    const on = isShown(key);
    if (on && shown.length <= 1) return;
    const next = series.filter((s) => (s.key === key ? !on : isShown(s.key))).map((s) => s.key);
    if (visible === undefined) setInnerVisible(next);
    onVisibleChange?.(next);
  };

  return (
    <section aria-label={`${title} radar comparison`} className={cx(CHART_CARD_FRAME, "gap-3", className)}>
      <div className="flex items-start justify-between gap-3 px-2 pt-2">
        <ChartHeadline
          label={hovered ? `${title} · ${hovered.label}` : title}
          value={headline}
          delta={delta}
          swapKey={`${rangeId}-${leadKey}-${hovered?.label ?? "total"}`}
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

      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 420, height: 260 }}>
          <RadarChart data={rows} margin={RADAR_MARGIN} outerRadius={RADAR_OUTER_RADIUS}>
            <RadarActiveAxis onChange={setHoveredLabel} />
            <PolarGrid gridType="polygon" stroke={GRID_STROKE} />
            <PolarRadiusAxis domain={[0, max || 1]} tick={false} axisLine={false} />
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
                    rows={shown.map((s) => ({ key: s.key, label: s.label, tone: s.tone, value: formatNumber(valueOf(at, s.key)) }))}
                  />
                );
              }}
            />
            {series.map((s) => (
              <Radar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                hide={!isShown(s.key)}
                fillOpacity={0}
                stroke={toneActiveColor(s.tone)}
                strokeWidth={2}
                strokeLinejoin="round"
                dot={false}
                activeDot={<PulseDot color={toneActiveColor(s.tone)} pulse={!reduced} />}
                isAnimationActive={!reduced}
                animationDuration={500}
              />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <ul aria-label={`${title} series`} className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-2">
        {series.map((s) => {
          const on = isShown(s.key);
          const locked = on && shown.length <= 1;
          return (
            <li key={s.key}>
              <button
                type="button"
                aria-pressed={on}
                aria-disabled={locked || undefined}
                title={locked ? "At least one series stays visible" : undefined}
                onClick={() => toggle(s.key)}
                className={cx(
                  "flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-body-2-regular text-text-secondary outline-none transition-opacity duration-150 ease-out focus-visible:ring-2 focus-visible:ring-border-focus-ring motion-reduce:transition-none",
                  on ? "opacity-100" : "opacity-50",
                  locked ? "cursor-default" : "cursor-pointer hover:bg-background-primary-hover",
                )}
              >
                <span
                  aria-hidden
                  className={cx("size-2.5 shrink-0 rounded-[3px]", on ? TONE_DOT[s.tone] : "ring-1 ring-current ring-inset")}
                />
                {s.label}
                <span className="text-body-2-medium text-text-primary tabular-nums">
                  {formatNumber(hovered ? valueOf(hovered, s.key) : totalOf(s.key))}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {hideTiles ? null : (
        <ChartStatTiles
          columns={3}
          tiles={data.map((p) => ({ key: p.label, label: p.label, value: formatNumber(valueOf(p, leadKey)), tone: lead?.tone }))}
        />
      )}
    </section>
  );
}
// #endregion
