/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Radial Chart Card" (boardui.com/components/radial-chart-card).
 * No BoardUI source was used.
 */
"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";

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
  type StatTileItem,
} from "@/registry/ui/funnel-chart-card-shell";
import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";
import { cx } from "@/registry/lib/cx";

/**
 * Radial bars in the dashboard card shell: one rounded arc per item over its
 * own track ring, innermost item first, every arc starting at twelve o'clock
 * and running clockwise. Hovering, focusing or tapping a ring darkens it one
 * tone, fades the others, floats a tooltip at the arc's end and swaps the
 * count-up headline to that item. `gauge` folds the items into one total
 * against a goal with the percentage in the centre.
 */

export type RadialVariant = "rings" | "labels" | "grid" | "gauge";

export type RadialItem = {
  label: string;
  value: number;
  /** Overrides the palette colour for this ring. */
  color?: ChartColor;
};

export type RadialRange = {
  id: string;
  label: string;
  /** Innermost ring first. */
  items: RadialItem[];
  delta?: number;
  /** Target the `gauge` variant measures the total against. */
  goal?: number;
};

const BROWSERS = ["Other", "Edge", "Firefox", "Safari", "Chrome"] as const;

function browserRange(id: string, label: string, values: readonly number[], delta: number, goal: number): RadialRange {
  return {
    id,
    label,
    delta,
    goal,
    items: values.map((value, index) => ({ label: BROWSERS[index] ?? `Item ${index + 1}`, value })),
  };
}

/** Three demo periods of visitors by browser, smallest share innermost. */
export const RADIAL_RANGES: RadialRange[] = [
  browserRange("7d", "Last 7 days", [90, 173, 187, 200, 275], 5.2, 1500),
  browserRange("30d", "Last 30 days", [410, 690, 820, 905, 1180], 8.4, 6000),
  browserRange("90d", "Last 90 days", [1240, 1980, 2310, 2650, 3420], -2.1, 15000),
];

/** The chart is drawn 1:1 in a 216px square, so tooltip coordinates are CSS px. */
const SIZE = 216;
const C = SIZE / 2;
/** Breathing room between the outer stroke and the square's edge. */
const EDGE = 2;
/** The innermost ring never gets closer to the centre than this. */
const MIN_HOLE = 26;
/** The largest item sweeps 90% of the circle unless `max` is given. */
const HEADROOM = 0.9;
/** Ring names on the `labels` look: 8px, about 4.9px per character. */
const LABEL_FONT = 8;
const LABEL_CHAR = 4.9;
const LABEL_OFFSET = 5;
/** Tooltip anchors stay this far from the square's sides so it never clips. */
const TIP_INSET = 52;

const LOOKS: Record<RadialVariant, { stroke: number; gap: number; track: boolean }> = {
  rings: { stroke: 8, gap: 4, track: true },
  labels: { stroke: 12, gap: 2, track: true },
  grid: { stroke: 8, gap: 4, track: false },
  gauge: { stroke: 16, gap: 0, track: true },
};

type Ring = { r: number; stroke: number; pitch: number };

/** Radii for `count` rings, outermost flush with the edge, shrinking the pitch if they would crowd the centre. */
function layoutRings(variant: RadialVariant, count: number): Ring[] {
  const look = LOOKS[variant];
  const outer = C - EDGE - look.stroke / 2;
  const fullPitch = look.stroke + look.gap;
  const pitch = count > 1 ? Math.min(fullPitch, (outer - MIN_HOLE) / (count - 1)) : fullPitch;
  const stroke = Math.min(look.stroke, Math.max(2, pitch - 1));
  return Array.from({ length: count }, (_, index) => ({ r: outer - (count - 1 - index) * pitch, stroke, pitch }));
}

const pct = (value: number, of: number) => (of > 0 ? Math.round((value / of) * 100) : 0);
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** A closed circle path starting at twelve o'clock, clockwise: the baseline for ring names. */
const circlePath = (r: number) => `M ${C} ${C - r} A ${r} ${r} 0 0 1 ${C} ${C + r} A ${r} ${r} 0 0 1 ${C} ${C - r}`;

type RingViewProps = {
  item: RadialItem;
  index: number;
  ring: Ring;
  fraction: number;
  color: ChartColor;
  variant: RadialVariant;
  active: number | null;
  pinned: boolean;
  focusVisible: boolean;
  label: string;
  pathId: string;
  onTarget: (index: number | null) => void;
  onFocusVisible: (index: number | null) => void;
  onTogglePin: () => void;
};

// #region critical
/**
 * One ring: track, arc, optional name on a text path, and a transparent hit
 * stroke as wide as the ring pitch so the gaps between rings still hover.
 * The arc is a circle rotated to twelve o'clock with `pathLength=100`, so its
 * dash is simply the tweened fraction × 100 and round caps close it off.
 */
function RingView({
  item,
  index,
  ring,
  fraction,
  color,
  variant,
  active,
  pinned,
  focusVisible,
  label,
  pathId,
  onTarget,
  onFocusVisible,
  onTogglePin,
}: RingViewProps) {
  const tone = CHART_COLORS[color];
  const isActive = active === index;
  const dimmed = active !== null && !isActive;
  const look = LOOKS[variant];
  const dash = clamp01(fraction) * 100;
  const arcLength = clamp01(fraction) * 2 * Math.PI * ring.r;
  const showName =
    variant === "labels" && arcLength >= item.label.length * LABEL_CHAR + LABEL_OFFSET * 2 + ring.stroke;

  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onTogglePin();
  };

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={pinned}
      data-ring={item.label}
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
      onClick={onTogglePin}
      onKeyDown={onKeyDown}
    >
      {focusVisible ? (
        <circle
          cx={C}
          cy={C}
          r={ring.r}
          fill="none"
          stroke="var(--color-border-focus-ring)"
          strokeWidth={ring.stroke + Math.min(4, ring.pitch - ring.stroke + 2)}
        />
      ) : null}
      {look.track ? (
        <circle cx={C} cy={C} r={ring.r} fill="none" stroke="var(--color-chart-track)" strokeWidth={ring.stroke} />
      ) : null}
      {dash > 0 ? (
        <circle
          cx={C}
          cy={C}
          r={ring.r}
          fill="none"
          stroke={isActive ? tone.active : tone.fill}
          strokeWidth={ring.stroke}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${dash} 100`}
          transform={`rotate(-90 ${C} ${C})`}
          opacity={dimmed ? 0.3 : 1}
          className="transition-[stroke,opacity] duration-200 ease-out motion-reduce:transition-none"
        />
      ) : null}
      {variant === "labels" ? (
        <>
          <path id={pathId} d={circlePath(ring.r)} fill="none" stroke="none" />
          <text
            aria-hidden
            fontSize={LABEL_FONT}
            fontWeight={600}
            fill="#fff"
            dominantBaseline="central"
            opacity={showName ? (dimmed ? 0.5 : 1) : 0}
            className="pointer-events-none select-none transition-opacity duration-200 ease-out motion-reduce:transition-none"
          >
            <textPath href={`#${pathId}`} startOffset={LABEL_OFFSET}>
              {item.label}
            </textPath>
          </text>
        </>
      ) : null}
      <circle
        cx={C}
        cy={C}
        r={ring.r}
        fill="none"
        stroke="transparent"
        strokeWidth={ring.pitch}
        pointerEvents="stroke"
      />
    </g>
  );
}
// #endregion

/** Faint concentric circles on every ring line plus twelve spokes, for the `grid` look. */
function GridLines({ rings }: { rings: readonly Ring[] }) {
  const first = rings[0];
  const last = rings[rings.length - 1];
  if (!first || !last) return null;
  const inner = first.r - first.pitch / 2;
  const outer = last.r + last.stroke / 2;
  const stroke = "var(--color-chart-track)";
  return (
    <g aria-hidden pointerEvents="none">
      {[inner, ...rings.map((ring) => ring.r + ring.pitch / 2)].map((r, i) => (
        <circle key={`c${i}`} cx={C} cy={C} r={Math.min(r, outer)} fill="none" stroke={stroke} strokeWidth={1} />
      ))}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <line
            key={`s${i}`}
            x1={C + inner * Math.cos(a)}
            y1={C + inner * Math.sin(a)}
            x2={C + outer * Math.cos(a)}
            y2={C + outer * Math.sin(a)}
            stroke={stroke}
            strokeWidth={1}
            strokeDasharray="2 3"
          />
        );
      })}
    </g>
  );
}

export type RadialChartCardProps = {
  /** Card label shown while nothing is hovered (and the gauge's item name). */
  title?: string;
  /** rings (default), labels along each arc, rings over a grid, or one total against a goal. */
  variant?: RadialVariant;
  /** Periods with their own items; two or more show the period select. */
  ranges?: RadialRange[];
  /** Plain item list, innermost first; replaces `ranges` and hides the select. */
  items?: RadialItem[];
  /** Headline chip percentage when `items` is used. */
  delta?: number;
  /** Value of a full circle. Rings default to the largest item ÷ 0.9; the gauge to the range's goal. */
  max?: number;
  /** Controlled period id. */
  range?: string;
  /** Initial period id when uncontrolled; defaults to the first range. */
  defaultRange?: string;
  onRangeChange?: (id: string) => void;
  /** Stat tiles under the chart, three per row. */
  tiles?: boolean;
  /** Writes the active item's value (or the total) in the hole of the ring looks. */
  showCenter?: boolean;
  /** Caption under the gauge's percentage. */
  gaugeCaption?: string;
  formatValue?: (value: number) => string;
  className?: string;
};

export function RadialChartCard({
  title = "Visitors",
  variant = "rings",
  ranges = RADIAL_RANGES,
  items: itemsProp,
  delta: deltaProp,
  max: maxProp,
  range: rangeProp,
  defaultRange,
  onRangeChange,
  tiles = true,
  showCenter = false,
  gaugeCaption = "of goal",
  formatValue = formatInt,
  className,
}: RadialChartCardProps) {
  const reduced = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [innerRange, setInnerRange] = useState(defaultRange ?? ranges[0]?.id ?? "");
  const rangeId = rangeProp ?? innerRange;
  const activeRange = ranges.find((r) => r.id === rangeId) ?? ranges[0];
  const sourceItems = itemsProp ?? activeRange?.items ?? [];
  const delta = itemsProp ? deltaProp : activeRange?.delta;
  const total = sourceItems.reduce((sum, item) => sum + Math.max(0, item.value), 0);

  const gauge = variant === "gauge";
  const goal = maxProp ?? (itemsProp ? undefined : activeRange?.goal) ?? total;
  const items: RadialItem[] = gauge ? [{ label: title, value: total, color: sourceItems[0]?.color }] : sourceItems;
  const largest = items.reduce((m, item) => Math.max(m, item.value), 0);
  const scale = gauge ? goal : (maxProp ?? largest / HEADROOM);

  const [hovered, setHovered] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const [focusRing, setFocusRing] = useState<number | null>(null);
  const raw = hovered ?? pinned;
  const active = raw !== null && raw < items.length ? raw : null;

  // Sweeps grow from 0 on mount and from wherever they are on a new period or look.
  const fractions = useTweenedValues(
    items.map((item) => (scale > 0 ? clamp01(Math.max(0, item.value) / scale) : 0)),
    { disabled: reduced },
  );
  const rings = layoutRings(variant, items.length);
  const colorOf = (index: number) => chartColorAt(index, items[index]?.color);

  const activeItem = active !== null && !gauge ? items[active] : undefined;
  let label: ReactNode = title;
  let value = total;
  let note: string | undefined;
  if (activeItem) {
    label = activeItem.label;
    value = activeItem.value;
    note = `${pct(activeItem.value, total)}% of total`;
  }

  const describe = (item: RadialItem) =>
    gauge
      ? `${item.label}: ${formatValue(item.value)} of ${formatValue(goal)}, ${pct(item.value, goal)}%`
      : `${item.label}: ${formatValue(item.value)}, ${pct(item.value, total)}% of ${title.toLowerCase()}`;

  // The tooltip sits on the tip of the active arc, clamped inside the square.
  let tip: { x: number; y: number; item: RadialItem; color: ChartColor } | null = null;
  if (active !== null) {
    const ring = rings[active];
    const item = items[active];
    if (ring && item) {
      const angle = clamp01(fractions[active] ?? 0) * Math.PI * 2 - Math.PI / 2;
      tip = {
        x: Math.min(SIZE - TIP_INSET, Math.max(TIP_INSET, C + ring.r * Math.cos(angle))),
        y: C + ring.r * Math.sin(angle),
        item,
        color: colorOf(active),
      };
    }
  }

  const selectRange = (id: string) => {
    if (rangeProp === undefined) setInnerRange(id);
    setPinned(null);
    onRangeChange?.(id);
  };

  const centerItem = activeItem ?? null;
  const tileItems: StatTileItem[] = gauge
    ? [
        { id: "total", label: title, value: formatValue(total), color: colorOf(0) },
        { id: "goal", label: "Goal", value: formatValue(goal), color: null },
        { id: "left", label: "To go", value: formatValue(Math.max(0, goal - total)), color: null },
      ]
    : items.map((item, index) => ({
        id: `${item.label}-${index}`,
        label: item.label,
        value: formatValue(item.value),
        color: colorOf(index),
      }));

  return (
    <ChartCardFrame className={className} aria-label={title}>
      <ChartCardHeader
        label={label}
        value={value}
        formatValue={formatValue}
        valueKey={activeItem ? `item-${active}` : "total"}
        delta={activeItem ? undefined : delta}
        note={note}
        action={
          !itemsProp && ranges.length > 1 ? (
            <PeriodSelect options={ranges} selectedId={activeRange?.id ?? ""} onChange={selectRange} />
          ) : undefined
        }
      />

      <div className="flex justify-center py-2">
        <div className="relative size-[216px]" onPointerLeave={() => setHovered(null)}>
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            role="group"
            aria-label={gauge ? `${title} against goal` : `${title} by ${title === "Visitors" ? "browser" : "item"}`}
            className="block overflow-visible"
          >
            {variant === "grid" ? <GridLines rings={rings} /> : null}
            {items.map((item, index) => {
              const ring = rings[index];
              if (!ring) return null;
              return (
                <RingView
                  key={`${item.label}-${index}`}
                  item={item}
                  index={index}
                  ring={ring}
                  fraction={fractions[index] ?? 0}
                  color={colorOf(index)}
                  variant={variant}
                  active={active}
                  pinned={pinned === index}
                  focusVisible={focusRing === index}
                  label={describe(item)}
                  pathId={`${uid}-ring-${index}`}
                  onTarget={setHovered}
                  onFocusVisible={setFocusRing}
                  onTogglePin={() => setPinned((p) => (p === index ? null : index))}
                />
              );
            })}
          </svg>

          {gauge ? (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-title-1-regular text-text-primary tabular-nums">
                {pct(total, goal)}%
              </span>
              <span className="text-caption-1-regular text-text-tertiary">{gaugeCaption}</span>
            </div>
          ) : showCenter ? (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span
                key={centerItem ? `c-${active}` : "c-total"}
                className="animate-number-fade text-body-medium text-text-primary tabular-nums motion-reduce:animate-none"
              >
                {formatValue(centerItem ? centerItem.value : total)}
              </span>
              <span className="text-caption-2-regular text-text-tertiary">{centerItem ? centerItem.label : "Total"}</span>
            </div>
          ) : null}

          {tip ? (
            <div
              aria-hidden
              data-radial-tooltip
              className="pointer-events-none absolute z-10 flex -translate-x-1/2 -translate-y-[calc(100%+10px)] items-center gap-1.5 rounded-lg border border-border-button-default bg-background-primary-default px-2 py-1 whitespace-nowrap shadow-md"
              style={{ left: tip.x, top: tip.y }}
            >
              <span aria-hidden className={cx("size-2 shrink-0 rounded-[3px]", CHART_COLORS[tip.color].swatch)} />
              <span className="text-caption-1-regular text-text-secondary">{tip.item.label}</span>
              <span className="text-caption-1-medium text-text-primary tabular-nums">{formatValue(tip.item.value)}</span>
              <span className="text-caption-1-regular text-text-tertiary tabular-nums">
                {gauge ? `${pct(tip.item.value, goal)}%` : `${pct(tip.item.value, total)}%`}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {tiles ? (
        <StatTiles
          columns={3}
          items={tileItems}
          activeIndex={gauge ? (active !== null ? 0 : null) : active}
          onActiveChange={(index) => setHovered(index === null ? null : gauge ? (index === 0 ? 0 : null) : index)}
        />
      ) : null}
    </ChartCardFrame>
  );
}
