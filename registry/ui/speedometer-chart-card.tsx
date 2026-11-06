/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Speedometer Chart Card" (boardui.com/).
 * No BoardUI source was used.
 */
"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";

import {
  CHART_COLORS,
  ChartCardFrame,
  ChartCardHeader,
  PeriodSelect,
  StatTiles,
  chartColorAt,
  formatInt,
  useTweenedValues,
  type ChartColor,
} from "@/registry/ui/funnel-chart-card-shell";
import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";
import { cx } from "@/registry/lib/cx";

/**
 * A half gauge in the dashboard card shell. `segments` stacks the items
 * around a 220° track with round-capped gaps and writes the primary item's
 * share in the centre; `needle` draws a single value arc with a needle, tick
 * scale, centre value and min/max labels, and the needle swings to every new
 * value. Hovering a segment or a tile swaps the headline to that item.
 */

export type SpeedometerVariant = "segments" | "needle";

export type GaugeItem = {
  label: string;
  value: number;
  /** Overrides the palette colour for this item. */
  color?: ChartColor;
};

export type GaugeRange = {
  id: string;
  label: string;
  items: GaugeItem[];
  delta?: number;
};

const DEVICES = ["Desktop", "Mobile", "Tablet", "TV"] as const;

function deviceRange(id: string, label: string, values: readonly number[], delta: number): GaugeRange {
  return {
    id,
    label,
    delta,
    items: values.map((value, index) => ({ label: DEVICES[index] ?? `Item ${index + 1}`, value })),
  };
}

/** Three demo periods of visitors by device. */
export const SPEEDOMETER_RANGES: GaugeRange[] = [
  deviceRange("7d", "Last 7 days", [1180, 620, 380, 320], 5.2),
  deviceRange("30d", "Last 30 days", [4650, 2980, 1420, 950], 7.9),
  deviceRange("90d", "Last 90 days", [12100, 9800, 4200, 2400], -1.4),
];

/** Drawn 1:1: a 280 × 212 box, centre of the arc at (140, 134). */
const W = 280;
const H = 212;
const CX = W / 2;
const CY = 134;
const R = 110;
/** Arc ends 110° either side of twelve o'clock: a 220° sweep that opens at the bottom. */
const START = (-110 * Math.PI) / 180;
const SWEEP = (220 * Math.PI) / 180;
const SEG_STROKE = 28;
const NEEDLE_STROKE = 16;
/** Visible gap between neighbouring segments, in px along the arc. */
const GAP_PX = 6;
const NEEDLE_MS = 700;

/** Point at angle θ (clockwise from twelve o'clock) on a circle of radius r. */
const polar = (theta: number, r: number) => ({ x: CX + r * Math.sin(theta), y: CY - r * Math.cos(theta) });

/** Clockwise arc path between two angles; a near-zero span becomes a dot (round caps draw it). */
function arcPath(from: number, to: number, r: number) {
  const a = polar(from, r);
  if (to - from < 0.0005) return `M ${a.x} ${a.y} l 0.001 0`;
  const b = polar(to, r);
  const large = to - from > Math.PI ? 1 : 0;
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`;
}

const pct = (value: number, of: number) => (of > 0 ? Math.round((value / of) * 100) : 0);
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

type Segment = { from: number; to: number };

/**
 * Angles for each item from tweened cumulative boundaries (0..1 of the total).
 * The gaps scale with the last boundary, so on mount the whole gauge sweeps
 * in from the start instead of popping in with its gaps already open.
 */
function layoutSegments(bounds: readonly number[]): Segment[] {
  const n = bounds.length;
  const progress = clamp01(bounds[n - 1] ?? 0);
  const gap = (GAP_PX / R) * progress;
  const usable = SWEEP - gap * Math.max(0, n - 1);
  return bounds.map((end, index) => {
    const begin = index === 0 ? 0 : (bounds[index - 1] ?? 0);
    return { from: START + begin * usable + index * gap, to: START + end * usable + index * gap };
  });
}

type SegmentViewProps = {
  item: GaugeItem;
  index: number;
  segment: Segment;
  color: ChartColor;
  active: number | null;
  primary: boolean;
  focusVisible: boolean;
  label: string;
  onTarget: (index: number | null) => void;
  onFocusVisible: (index: number | null) => void;
  onSelect: () => void;
};

// #region critical
/**
 * One stacked segment. Its visible extent is [from, to]; the path is inset
 * by the cap's half-width at both ends so the round caps land exactly on the
 * extent and neighbours keep a clean gap. Too short for its caps, it becomes
 * a dot as wide as the extent allows, centred on it.
 */
function SegmentView({
  item,
  index,
  segment,
  color,
  active,
  primary,
  focusVisible,
  label,
  onTarget,
  onFocusVisible,
  onSelect,
}: SegmentViewProps) {
  const span = segment.to - segment.from;
  if (span <= 0.0001) return null;
  const tone = CHART_COLORS[color];
  const isActive = active === index;
  const dimmed = active !== null && !isActive;
  const cap = SEG_STROKE / 2 / R;
  const fits = span > cap * 2;
  const mid = (segment.from + segment.to) / 2;
  const d = fits ? arcPath(segment.from + cap, segment.to - cap, R) : arcPath(mid, mid, R);
  const width = fits ? SEG_STROKE : Math.max(4, span * R);

  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect();
  };

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={primary}
      data-segment={item.label}
      className="cursor-pointer outline-none"
      onPointerEnter={() => onTarget(index)}
      onFocus={(event) => {
        onTarget(index);
        onFocusVisible(event.currentTarget.matches(":focus-visible") ? index : null);
      }}
      onBlur={() => {
        onTarget(null);
        onFocusVisible(null);
      }}
      onClick={onSelect}
      onKeyDown={onKeyDown}
    >
      {focusVisible ? (
        <path d={d} fill="none" stroke="var(--color-border-focus-ring)" strokeWidth={width + 6} strokeLinecap="round" />
      ) : null}
      <path
        d={d}
        fill="none"
        stroke={isActive ? tone.active : tone.fill}
        strokeWidth={width}
        strokeLinecap="round"
        opacity={dimmed ? 0.35 : 1}
        className="transition-[stroke,opacity] duration-200 ease-out motion-reduce:transition-none"
      />
    </g>
  );
}
// #endregion

/** Needle drawn pointing at twelve o'clock and rotated about the hub. */
function Needle({ angle }: { angle: number }) {
  const length = R - NEEDLE_STROKE / 2 - 16;
  return (
    <g aria-hidden transform={`rotate(${(angle * 180) / Math.PI} ${CX} ${CY})`}>
      <polygon
        points={`${CX - 3.5},${CY} ${CX},${CY - length} ${CX + 3.5},${CY} ${CX},${CY + 12}`}
        fill="var(--color-text-primary)"
      />
      <circle cx={CX} cy={CY} r={8} fill="var(--color-text-primary)" />
      <circle cx={CX} cy={CY} r={3} fill="var(--color-background-secondary-default)" />
    </g>
  );
}

export type SpeedometerChartCardProps = {
  /** Card label shown while nothing is hovered. */
  title?: string;
  /** Stacked segments with the primary share in the centre, or one value with a needle. */
  variant?: SpeedometerVariant;
  /** Periods with their own items; two or more show the period select. */
  ranges?: GaugeRange[];
  /** Plain item list; replaces `ranges` and hides the select. */
  items?: GaugeItem[];
  /** Headline chip percentage when `items` is used. */
  delta?: number;
  /** Controlled period id. */
  range?: string;
  /** Initial period id when uncontrolled; defaults to the first range. */
  defaultRange?: string;
  onRangeChange?: (id: string) => void;
  /** Controlled index of the item the centre (and the needle) reports. */
  primary?: number;
  /** Initial primary index when uncontrolled. */
  defaultPrimary?: number;
  /** Called when a segment is clicked or pressed. */
  onPrimaryChange?: (index: number) => void;
  /** Needle value; defaults to the primary item's share of the total in percent. */
  value?: number;
  /** Needle scale. */
  min?: number;
  max?: number;
  /** Formats the needle value, the centre share and the min/max labels. */
  formatGaugeValue?: (value: number) => string;
  /** Caption under the centre value; defaults to the active item's name. */
  gaugeLabel?: string;
  /** Stat tiles under the gauge, three per row. */
  tiles?: boolean;
  formatValue?: (value: number) => string;
  className?: string;
};

export function SpeedometerChartCard({
  title = "Visitors",
  variant = "segments",
  ranges = SPEEDOMETER_RANGES,
  items: itemsProp,
  delta: deltaProp,
  range: rangeProp,
  defaultRange,
  onRangeChange,
  primary: primaryProp,
  defaultPrimary = 0,
  onPrimaryChange,
  value: valueProp,
  min = 0,
  max = 100,
  formatGaugeValue = (v: number) => `${Math.round(v)}%`,
  gaugeLabel,
  tiles = true,
  formatValue = formatInt,
  className,
}: SpeedometerChartCardProps) {
  const reduced = useReducedMotion();
  const [innerRange, setInnerRange] = useState(defaultRange ?? ranges[0]?.id ?? "");
  const rangeId = rangeProp ?? innerRange;
  const activeRange = ranges.find((r) => r.id === rangeId) ?? ranges[0];
  const items = itemsProp ?? activeRange?.items ?? [];
  const delta = itemsProp ? deltaProp : activeRange?.delta;
  const total = items.reduce((sum, item) => sum + Math.max(0, item.value), 0);

  const [innerPrimary, setInnerPrimary] = useState(defaultPrimary);
  const primary = Math.min(Math.max(0, primaryProp ?? innerPrimary), Math.max(0, items.length - 1));
  const [hovered, setHovered] = useState<number | null>(null);
  const [focusSeg, setFocusSeg] = useState<number | null>(null);
  const active = hovered !== null && hovered < items.length ? hovered : null;
  const shown = active ?? primary;
  const shownItem = items[shown];
  const colorOf = (index: number) => chartColorAt(index, items[index]?.color);

  // Segments: cumulative boundaries, tweened so the gauge sweeps in and re-proportions.
  let running = 0;
  const bounds = items.map((item) => {
    running += Math.max(0, item.value);
    return total > 0 ? running / total : 0;
  });
  const tweenedBounds = useTweenedValues(bounds, { disabled: reduced || variant !== "segments" });
  const segments = layoutSegments(tweenedBounds);

  // Needle: the explicit value, or the shown item's share in percent.
  const needleValue = valueProp ?? (shownItem ? (Math.max(0, shownItem.value) / (total || 1)) * 100 : 0);
  const span = max - min;
  const [needleFraction = 0] = useTweenedValues([span > 0 ? clamp01((needleValue - min) / span) : 0], {
    duration: NEEDLE_MS,
    disabled: reduced || variant !== "needle",
  });
  const needleAngle = START + needleFraction * SWEEP;

  let label: ReactNode = title;
  let headline = total;
  let note: string | undefined;
  const hoveredItem = active !== null ? items[active] : undefined;
  if (hoveredItem) {
    label = hoveredItem.label;
    headline = hoveredItem.value;
    note = `${pct(hoveredItem.value, total)}% of total`;
  }

  const selectRange = (id: string) => {
    if (rangeProp === undefined) setInnerRange(id);
    onRangeChange?.(id);
  };
  const selectPrimary = (index: number) => {
    if (primaryProp === undefined) setInnerPrimary(index);
    onPrimaryChange?.(index);
  };

  const centreValue =
    variant === "needle" ? formatGaugeValue(needleValue) : formatGaugeValue(shownItem ? pct(shownItem.value, total) : 0);
  const centreCaption = gaugeLabel ?? shownItem?.label ?? "";
  const ends = [polar(START, R), polar(START + SWEEP, R)] as const;

  return (
    <ChartCardFrame className={className} aria-label={title}>
      <ChartCardHeader
        label={label}
        value={headline}
        formatValue={formatValue}
        valueKey={hoveredItem ? `item-${active}` : "total"}
        delta={hoveredItem ? undefined : delta}
        note={note}
        action={
          !itemsProp && ranges.length > 1 ? (
            <PeriodSelect options={ranges} selectedId={activeRange?.id ?? ""} onChange={selectRange} />
          ) : undefined
        }
      />

      <div className="flex justify-center py-1">
        <div className="relative" style={{ width: W, height: H }} onPointerLeave={() => setHovered(null)}>
          <svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            role={variant === "segments" ? "group" : "img"}
            aria-label={
              variant === "segments"
                ? `${title} by ${title === "Visitors" ? "device" : "item"}`
                : `${centreCaption || title}: ${formatGaugeValue(needleValue)} on a scale of ${formatGaugeValue(min)} to ${formatGaugeValue(max)}`
            }
            className="block overflow-visible"
          >
            {variant === "segments" ? (
              <>
                <path
                  d={arcPath(START + SEG_STROKE / 2 / R, START + SWEEP - SEG_STROKE / 2 / R, R)}
                  fill="none"
                  stroke="var(--color-chart-track)"
                  strokeWidth={SEG_STROKE}
                  strokeLinecap="round"
                />
                {items.map((item, index) => {
                  const segment = segments[index];
                  if (!segment) return null;
                  return (
                    <SegmentView
                      key={`${item.label}-${index}`}
                      item={item}
                      index={index}
                      segment={segment}
                      color={colorOf(index)}
                      active={active}
                      primary={primary === index}
                      focusVisible={focusSeg === index}
                      label={`${item.label}: ${formatValue(item.value)}, ${pct(item.value, total)}% of total`}
                      onTarget={setHovered}
                      onFocusVisible={setFocusSeg}
                      onSelect={() => selectPrimary(index)}
                    />
                  );
                })}
              </>
            ) : (
              <>
                <path
                  d={arcPath(START, START + SWEEP, R)}
                  fill="none"
                  stroke="var(--color-chart-track)"
                  strokeWidth={NEEDLE_STROKE}
                  strokeLinecap="round"
                />
                {needleFraction > 0.001 ? (
                  <path
                    d={arcPath(START, needleAngle, R)}
                    fill="none"
                    stroke={CHART_COLORS[colorOf(shown)].fill}
                    strokeWidth={NEEDLE_STROKE}
                    strokeLinecap="round"
                    className="transition-[stroke] duration-200 ease-out motion-reduce:transition-none"
                  />
                ) : null}
                <g aria-hidden>
                  {Array.from({ length: 11 }, (_, i) => {
                    const theta = START + (i / 10) * SWEEP;
                    const major = i % 5 === 0;
                    const outer = polar(theta, R - NEEDLE_STROKE / 2 - 5);
                    const inner = polar(theta, R - NEEDLE_STROKE / 2 - (major ? 13 : 9));
                    return (
                      <line
                        key={i}
                        x1={outer.x}
                        y1={outer.y}
                        x2={inner.x}
                        y2={inner.y}
                        stroke="var(--color-text-tertiary)"
                        strokeOpacity={major ? 0.8 : 0.45}
                        strokeWidth={major ? 1.5 : 1}
                        strokeLinecap="round"
                      />
                    );
                  })}
                </g>
                <Needle angle={needleAngle} />
                <g aria-hidden fontSize={12} fill="var(--color-text-tertiary)" textAnchor="middle">
                  <text x={ends[0].x} y={ends[0].y + NEEDLE_STROKE / 2 + 16}>
                    {formatGaugeValue(min)}
                  </text>
                  <text x={ends[1].x} y={ends[1].y + NEEDLE_STROKE / 2 + 16}>
                    {formatGaugeValue(max)}
                  </text>
                </g>
              </>
            )}
          </svg>

          <div
            aria-live="polite"
            className={cx(
              "pointer-events-none absolute left-1/2 flex -translate-x-1/2 flex-col items-center",
              variant === "segments" ? "-translate-y-1/2" : "",
            )}
            style={{ top: variant === "segments" ? CY + 4 : CY + 22 }}
          >
            <span
              key={variant === "segments" ? `share-${shown}` : "needle"}
              data-gauge-value
              className={cx(
                "whitespace-nowrap text-text-primary tabular-nums",
                variant === "segments" ? "animate-number-fade text-display-4-regular motion-reduce:animate-none" : "text-title-1-regular",
              )}
            >
              {centreValue}
            </span>
            <span className="text-caption-1-regular whitespace-nowrap text-text-tertiary">{centreCaption}</span>
          </div>
        </div>
      </div>

      {tiles ? (
        <StatTiles
          columns={3}
          activeIndex={active}
          onActiveChange={setHovered}
          items={items.map((item, index) => ({
            id: `${item.label}-${index}`,
            label: item.label,
            value: formatValue(item.value),
            color: colorOf(index),
          }))}
        />
      ) : null}
    </ChartCardFrame>
  );
}
