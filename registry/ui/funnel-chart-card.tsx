/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Funnel Chart Card" (boardui.com/components/funnel-chart-card).
 * No BoardUI source was used.
 */
"use client";

import { useState } from "react";

import {
  CHART_COLORS,
  ChartCardFrame,
  ChartCardHeader,
  MONO_FILL,
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
 * Funnel Chart Card: a horizontal conversion funnel in the dashboard card
 * shell. Each stage is a column whose band is sized to its share of the top
 * stage and tapers into the next one, with a centred share pill and a tile
 * below. Hovering, focusing or tapping a stage dims the others and swaps the
 * headline for that stage's count and its step conversion from the stage
 * before. The bands are hand-drawn SVG (one per column) because Recharts'
 * funnel is a vertical trapezoid stack.
 */

export type FunnelStage = {
  label: string;
  value: number;
  /** Palette colour; stages cycle the chart palette when omitted. */
  color?: ChartColor;
};

export type FunnelRange = {
  id: string;
  /** Text in the period select, e.g. "Last 7 days". */
  label: string;
  /** Top of the funnel first. */
  stages: FunnelStage[];
  /** Percent change for the headline chip. */
  delta?: number;
  /** Headline when nothing is hovered; defaults to the top stage's value. */
  headline?: number;
};

export type FunnelShape = "curved" | "sharp";

/** Three demo periods of a sign-up funnel. */
export const SIGNUP_FUNNEL_RANGES: FunnelRange[] = [
  {
    id: "7d",
    label: "Last 7 days",
    delta: 5.2,
    stages: [
      { label: "Link opened", value: 197 },
      { label: "Started", value: 110 },
      { label: "Completed", value: 77 },
      { label: "Converted", value: 38 },
    ],
  },
  {
    id: "30d",
    label: "Last 30 days",
    delta: 8.4,
    stages: [
      { label: "Link opened", value: 842 },
      { label: "Started", value: 512 },
      { label: "Completed", value: 289 },
      { label: "Converted", value: 171 },
    ],
  },
  {
    id: "90d",
    label: "Last 90 days",
    delta: -2.1,
    stages: [
      { label: "Link opened", value: 2604 },
      { label: "Started", value: 1186 },
      { label: "Completed", value: 903 },
      { label: "Converted", value: 412 },
    ],
  },
];

/** Outer edge of the layered halo, in px above and below the core band. */
const EDGE = 12;
/** The two halo layers: extra half-height in px and opacity. */
const LAYERS = [
  { grow: EDGE, opacity: 0.16 },
  { grow: EDGE / 2, opacity: 0.32 },
] as const;
/** Where the curved band stops running flat and starts easing, in 0-100 column units. */
const FLAT = 50;
/** Height of the faint track behind sharp columns, in px. */
const SHARP_TRACK = 36;
/** Thinnest core band so a 1% stage still reads as a line. */
const MIN_CORE = 2;

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const n = (value: number) => Math.round(value * 100) / 100;

/** One column's band from its own height `h0` into the next stage's `h1`. */
function bandPath(h0: number, h1: number, mid: number, shape: FunnelShape) {
  const t0 = n(mid - h0 / 2);
  const b0 = n(mid + h0 / 2);
  const t1 = n(mid - h1 / 2);
  const b1 = n(mid + h1 / 2);
  if (shape === "sharp") return `M0 ${t0}L100 ${t1}L100 ${b1}L0 ${b0}Z`;
  const c = (FLAT + 100) / 2;
  return `M0 ${t0}H${FLAT}C${c} ${t0} ${c} ${t1} 100 ${t1}V${b1}C${c} ${b1} ${c} ${b0} ${FLAT} ${b0}H0Z`;
}

export type FunnelChartCardProps = {
  /** Card label shown while no stage is active. */
  title?: string;
  /** Periods, each with its own stages; the select appears with two or more. */
  ranges?: FunnelRange[];
  /** Plain stage list; when set it replaces `ranges` and the select is hidden. */
  stages?: FunnelStage[];
  /** Headline chip when `stages` is used. */
  delta?: number;
  /** Controlled period id. */
  range?: string;
  /** Initial period id when uncontrolled; defaults to the first range. */
  defaultRange?: string;
  onRangeChange?: (id: string) => void;
  /** "curved" eases each band into the next with layered edges; "sharp" draws plain trapezoids. */
  shape?: FunnelShape;
  /** Paint every stage in the text colour and drop the swatches. */
  mono?: boolean;
  /** Chart height in px, halo included. */
  chartHeight?: number;
  className?: string;
};

// #region critical
export function FunnelChartCard({
  title = "Sign-up funnel",
  ranges = SIGNUP_FUNNEL_RANGES,
  stages: stagesProp,
  delta: deltaProp,
  range: rangeProp,
  defaultRange,
  onRangeChange,
  shape = "curved",
  mono = false,
  chartHeight = 160,
  className,
}: FunnelChartCardProps) {
  const reduced = useReducedMotion();
  const [innerRange, setInnerRange] = useState(defaultRange ?? ranges[0]?.id ?? "");
  const rangeId = rangeProp ?? innerRange;
  const activeRange = ranges.find((r) => r.id === rangeId) ?? ranges[0];
  const stages = stagesProp ?? activeRange?.stages ?? [];
  const delta = stagesProp ? deltaProp : activeRange?.delta;

  const [hovered, setHovered] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const active = hovered ?? (pinned !== null && pinned < stages.length ? pinned : null);

  const top = stages[0]?.value ?? 0;
  const coreMax = chartHeight - EDGE * 2;
  const mid = chartHeight / 2;
  // Shares are tweened, not heights, so a new period re-grows from the old shape.
  const shares = useTweenedValues(
    stages.map((s) => (top > 0 ? s.value / top : 0)),
    { disabled: reduced },
  );
  const heights = shares.map((share) => Math.max(MIN_CORE, share * coreMax));

  const activeStage = active !== null ? stages[active] : undefined;
  const prevStage = active !== null && active > 0 ? stages[active - 1] : undefined;
  const headline = activeStage ? activeStage.value : (!stagesProp && activeRange?.headline) || top;

  const selectRange = (id: string) => {
    if (rangeProp === undefined) setInnerRange(id);
    setPinned(null);
    onRangeChange?.(id);
  };

  return (
    <ChartCardFrame className={className} aria-label={title}>
      <ChartCardHeader
        label={activeStage ? activeStage.label : title}
        value={headline}
        valueKey={active ?? "total"}
        delta={activeStage ? undefined : delta}
        note={
          activeStage
            ? prevStage
              ? `${pct(activeStage.value, prevStage.value)}% of ${prevStage.label}`
              : "Top of funnel"
            : undefined
        }
        action={
          !stagesProp && ranges.length > 1 ? (
            <PeriodSelect options={ranges} selectedId={activeRange?.id ?? ""} onChange={selectRange} />
          ) : undefined
        }
      />

      <div
        role="group"
        aria-label={`${title} stages`}
        className="flex gap-0.5 px-2"
        style={{ height: chartHeight }}
        onPointerLeave={() => setHovered(null)}
      >
        {stages.map((stage, index) => {
          const color = CHART_COLORS[chartColorAt(index, stage.color)];
          const isActive = active === index;
          const fill = mono ? (isActive ? "var(--color-text-primary)" : MONO_FILL) : isActive ? color.active : color.fill;
          const h0 = heights[index] ?? MIN_CORE;
          const h1 = heights[index + 1] ?? h0;
          const share = pct(stage.value, top);
          const prev = index > 0 ? stages[index - 1] : undefined;
          return (
            <button
              key={`${stage.label}-${index}`}
              type="button"
              aria-pressed={pinned === index}
              aria-label={`${stage.label}: ${formatInt(stage.value)}, ${share}% of ${stages[0]?.label ?? "top"}${
                prev ? `, ${pct(stage.value, prev.value)}% of ${prev.label}` : ""
              }`}
              onPointerEnter={() => setHovered(index)}
              onFocus={() => setHovered(index)}
              onBlur={() => setHovered(null)}
              onClick={() => setPinned((p) => (p === index ? null : index))}
              className={cx(
                "relative min-w-0 flex-1 cursor-pointer rounded-md outline-none",
                "transition-opacity duration-200 ease-out motion-reduce:transition-none",
                "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                active !== null && !isActive && "opacity-35",
              )}
            >
              <svg
                aria-hidden
                viewBox={`0 0 100 ${chartHeight}`}
                preserveAspectRatio="none"
                className="absolute inset-0 size-full overflow-visible"
              >
                {shape === "sharp" ? (
                  <rect
                    x={0}
                    y={mid - SHARP_TRACK / 2}
                    width={100}
                    height={SHARP_TRACK}
                    style={{ fill: mono ? MONO_FILL : color.fill, opacity: 0.18 }}
                  />
                ) : (
                  LAYERS.map((layer) => (
                    <path
                      key={layer.grow}
                      d={bandPath(h0 + layer.grow * 2, h1 + layer.grow * 2, mid, shape)}
                      style={{ fill: mono ? MONO_FILL : color.fill, opacity: layer.opacity }}
                    />
                  ))
                )}
                <path
                  d={bandPath(h0, h1, mid, shape)}
                  className="transition-[fill] duration-200 ease-out motion-reduce:transition-none"
                  style={{ fill }}
                />
              </svg>
              <span
                aria-hidden
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background-primary-default px-1.5 py-px text-caption-1-medium text-text-primary tabular-nums shadow-xs"
              >
                {share}%
              </span>
            </button>
          );
        })}
      </div>

      <StatTiles
        columns={Math.max(1, stages.length)}
        activeIndex={active}
        onActiveChange={setHovered}
        items={stages.map((stage, index) => ({
          id: `${stage.label}-${index}`,
          label: stage.label,
          value: formatInt(stage.value),
          color: mono ? null : chartColorAt(index, stage.color),
        }))}
      />
    </ChartCardFrame>
  );
}
// #endregion
