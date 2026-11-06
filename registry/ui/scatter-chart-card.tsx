/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Scatter Chart Card" (boardui.com/components/scatter-chart-card).
 * No BoardUI source was used.
 */
"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, XAxis, YAxis } from "recharts";
import { RiArrowDownSLine, RiCalendarLine } from "@remixicon/react";

import { Chip } from "@/registry/ui/chip";
import { Dropdown, DropdownItem, DropdownPopover, DropdownTrigger } from "@/registry/ui/dropdown";
import { useCountUp } from "@/registry/hooks/use-count-up";
import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";
import { useResizeObserver } from "@/registry/hooks/use-resize-observer";
import { cx } from "@/registry/lib/cx";

/**
 * Scatter Chart Card: one dot per record, placed by two measures and, when the
 * data carries a third, sized by it. Records are grouped into series so each
 * cohort keeps its own chart colour. Hovering or arrowing onto a record puts
 * it in the headline, dims the other series and floats a small readout over
 * the dot; the tiles (or the inline legend) under the plot give each series'
 * average.
 */

export type ScatterPoint = {
  /** Horizontal measure. */
  x: number;
  /** Vertical measure, the one the headline and the averages report. */
  y: number;
  /** Optional third measure. Any point carrying one turns the dots into bubbles. */
  z?: number;
  /** Record name shown in the headline and the readout while it is active. */
  label?: string;
};

export type ScatterSeries = {
  label: string;
  points: ScatterPoint[];
  /** Any CSS colour. Defaults cycle through the kit's chart tokens. */
  color?: string;
};

export type ScatterRange = {
  id: string;
  /** Text in the period pill and its menu, e.g. "This quarter". */
  label: string;
  series: ScatterSeries[];
  /** Percent change against the previous period, shown in the chip. */
  change?: number;
};

/** Fill and ring per series slot: lime, blue, purple, pink, sky, emerald. */
const PALETTE = [
  { fill: "var(--color-chart-2)", ring: "var(--color-chart-2-active)" },
  { fill: "var(--color-chart-6)", ring: "var(--color-chart-6-active)" },
  { fill: "var(--color-chart-5)", ring: "var(--color-chart-5-active)" },
  { fill: "var(--color-chart-3)", ring: "var(--color-chart-3-active)" },
  { fill: "var(--color-chart-4)", ring: "var(--color-chart-4-active)" },
  { fill: "var(--color-chart-7)", ring: "var(--color-chart-7-active)" },
] as const;

/** Seventeen accounts in three plans; averages 270, 783 and 1,388. */
export const SCATTER_SERIES: ScatterSeries[] = [
  {
    label: "Starter",
    points: [
      { x: 12, y: 180, z: 40, label: "Acme" },
      { x: 18, y: 240, z: 60, label: "Bolt" },
      { x: 24, y: 220, z: 45, label: "Cove" },
      { x: 31, y: 310, z: 70, label: "Dune" },
      { x: 38, y: 280, z: 55, label: "Echo" },
      { x: 44, y: 390, z: 80, label: "Flux" },
    ],
  },
  {
    label: "Growth",
    points: [
      { x: 42, y: 640, z: 95, label: "Grove" },
      { x: 49, y: 700, z: 110, label: "Helix" },
      { x: 55, y: 740, z: 120, label: "Ion" },
      { x: 61, y: 760, z: 105, label: "Jolt" },
      { x: 68, y: 860, z: 150, label: "Kite" },
      { x: 74, y: 820, z: 130, label: "Lumen" },
      { x: 83, y: 961, z: 160, label: "Mosaic" },
    ],
  },
  {
    label: "Scale",
    points: [
      { x: 79, y: 1180, z: 190, label: "Nimbus" },
      { x: 87, y: 1390, z: 230, label: "Orbit" },
      { x: 92, y: 1342, z: 210, label: "Pylon" },
      { x: 98, y: 1640, z: 260, label: "Quill" },
    ],
  },
];

const defaultFormat = (n: number) => Math.round(n).toLocaleString("en-US");
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

/** Rounds a raw step up to two significant digits in fives: 533 → 550, 24.3 → 25. */
function niceStep(raw: number) {
  if (raw <= 0) return 1;
  const unit = 5 * Math.pow(10, Math.floor(Math.log10(raw)) - 1);
  return Math.ceil(raw / unit) * unit;
}

function niceTicks(max: number, count: number) {
  const step = niceStep(max / count);
  return Array.from({ length: count + 1 }, (_, i) => i * step);
}

/* Fixed chart geometry, so dot positions can be computed outside Recharts for
   the readout and keyboard focus. Must match the margin and axis sizes below. */
const CHART_HEIGHT = 208;
const MARGIN = { top: 20, right: 12, bottom: 0, left: 0 };
const Y_AXIS_WIDTH = 40;
const X_AXIS_HEIGHT = 26;
const DOT_RADIUS = 5;
const BUBBLE_RADIUS: [number, number] = [6, 14];

type Active = { s: number; p: number } | null;

type DotDatum = ScatterPoint & { pointIndex: number };

type ShapeProps = { cx?: number; cy?: number; payload?: DotDatum };

export interface ScatterChartCardProps {
  /** Header label while no record is active. */
  title?: string;
  /** The records, grouped. Ignored when `ranges` is passed. */
  series?: ScatterSeries[];
  /** Percent change for the chip when `ranges` is not used. */
  change?: number;
  /** Static text for the period pill when `ranges` is not used. */
  periodLabel?: string;
  /** Periods to choose from: the pill becomes a dropdown. */
  ranges?: ScatterRange[];
  /** Controlled range id. */
  range?: string;
  /** Uncontrolled starting range id; defaults to the first range. */
  defaultRange?: string;
  onRangeChange?: (id: string) => void;
  /** Captions under the plot: [x measure, y measure]. */
  axisLabels?: [string, string];
  /** Formats the y measure (headline, tiles, readout). */
  format?: (value: number) => string;
  /** Formats the x measure in the readout. */
  formatX?: (value: number) => string;
  /** Size dots by `z`. Defaults to on when any point carries `z`. */
  bubble?: boolean;
  /** Average tiles under the chart; false shows a one-line legend instead. */
  tiles?: boolean;
  className?: string;
}

// #region critical
export function ScatterChartCard({
  title = "Revenue per account",
  series: seriesProp = SCATTER_SERIES,
  change: changeProp = 6.8,
  periodLabel = "This quarter",
  ranges,
  range: rangeProp,
  defaultRange,
  onRangeChange,
  axisLabels = ["Sessions", "Revenue"],
  format = defaultFormat,
  formatX = defaultFormat,
  bubble,
  tiles = true,
  className,
}: ScatterChartCardProps = {}) {
  const reduced = useReducedMotion();
  const labelId = useId();
  const plotRef = useRef<HTMLDivElement>(null);
  const { width } = useResizeObserver(plotRef);

  const [innerRange, setInnerRange] = useState(defaultRange ?? ranges?.[0]?.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const rangeId = rangeProp ?? innerRange;
  const activeRange = ranges?.find((r) => r.id === rangeId) ?? ranges?.[0];
  const series = activeRange?.series ?? seriesProp;
  const change = activeRange ? activeRange.change : changeProp;

  const [active, setActive] = useState<Active>(null);
  const [hoveredSeries, setHoveredSeries] = useState<number | null>(null);

  const model = useMemo(() => {
    const all = series.flatMap((s) => s.points);
    const xMaxRaw = Math.max(1, ...all.map((p) => p.x));
    const yMaxRaw = Math.max(1, ...all.map((p) => p.y));
    const zs = all.map((p) => p.z).filter((z): z is number => z !== undefined);
    const xTicks = niceTicks(xMaxRaw, 4);
    const yTicks = niceTicks(yMaxRaw, 3);
    const averages = series.map((s) =>
      s.points.length ? s.points.reduce((sum, p) => sum + p.y, 0) / s.points.length : 0,
    );
    // Keyboard order: every record left to right, then bottom to top.
    const order = series
      .flatMap((s, si) => s.points.map((p, pi) => ({ s: si, p: pi, x: p.x, y: p.y })))
      .sort((a, b) => a.x - b.x || a.y - b.y);
    return {
      xMax: xTicks[xTicks.length - 1] ?? xMaxRaw,
      yMax: yTicks[yTicks.length - 1] ?? yMaxRaw,
      xTicks,
      yTicks,
      zMin: zs.length ? Math.min(...zs) : 0,
      zMax: zs.length ? Math.max(...zs) : 0,
      hasZ: zs.length > 0,
      overall: all.length ? all.reduce((sum, p) => sum + p.y, 0) / all.length : 0,
      averages,
      order,
    };
  }, [series]);

  const useBubbles = bubble ?? model.hasZ;
  const radiusOf = (point: ScatterPoint) => {
    if (!useBubbles || point.z === undefined || model.zMax === model.zMin) return useBubbles ? 9 : DOT_RADIUS;
    const t = (point.z - model.zMin) / (model.zMax - model.zMin);
    return BUBBLE_RADIUS[0] + t * (BUBBLE_RADIUS[1] - BUBBLE_RADIUS[0]);
  };

  const activePoint = active ? series[active.s]?.points[active.p] : undefined;
  const activeSeries = activePoint && active ? active.s : hoveredSeries;

  const headlineValue = activePoint ? activePoint.y : model.overall;
  const counted = useCountUp(Math.round(headlineValue));
  const shown = reduced ? Math.round(headlineValue) : counted;
  const pointDelta =
    activePoint && model.overall > 0 ? Math.round(((activePoint.y - model.overall) / model.overall) * 1000) / 10 : null;
  const chipValue = activePoint ? pointDelta : change;
  const colorAt = (i: number) => {
    const custom = series[i]?.color;
    const slot = PALETTE[i % PALETTE.length] ?? PALETTE[0];
    return custom ? { fill: custom, ring: custom } : slot;
  };

  // Pixel centre of a record, from the same geometry Recharts lays out.
  const plotLeft = MARGIN.left + Y_AXIS_WIDTH;
  const plotWidth = Math.max(0, width - plotLeft - MARGIN.right);
  const plotHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom - X_AXIS_HEIGHT;
  const positionOf = (point: ScatterPoint) => ({
    left: plotLeft + (point.x / model.xMax) * plotWidth,
    top: MARGIN.top + (1 - point.y / model.yMax) * plotHeight,
  });

  const step = (key: string) => {
    const { order } = model;
    if (!order.length) return;
    const at = active ? order.findIndex((o) => o.s === active.s && o.p === active.p) : -1;
    let next = at;
    if (key === "ArrowRight" || key === "ArrowUp") next = at < 0 ? 0 : Math.min(order.length - 1, at + 1);
    else if (key === "ArrowLeft" || key === "ArrowDown") next = at < 0 ? order.length - 1 : Math.max(0, at - 1);
    else if (key === "Home") next = 0;
    else if (key === "End") next = order.length - 1;
    const target = order[next];
    if (target) setActive({ s: target.s, p: target.p });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      step(event.key);
    } else if (event.key === "Escape" && active) {
      setActive(null);
    }
  };

  const renderDot = (si: number) =>
    function dot({ cx: x, cy: y, payload }: ShapeProps) {
      if (x === undefined || y === undefined || !payload) return <g />;
      const isActive = active?.s === si && active.p === payload.pointIndex;
      const dimmed = activeSeries !== null && activeSeries !== si;
      const { fill, ring } = colorAt(si);
      const r = radiusOf(payload);
      return (
        <g
          className="cursor-pointer transition-opacity duration-150 ease-out motion-reduce:transition-none"
          style={{ opacity: dimmed ? 0.22 : 1 }}
          onMouseEnter={() => setActive({ s: si, p: payload.pointIndex })}
          onMouseLeave={() => setActive(null)}
        >
          {isActive && <circle cx={x} cy={y} r={r + 5} fill={fill} opacity={0.3} />}
          <circle
            cx={x}
            cy={y}
            r={r}
            fill={fill}
            fillOpacity={useBubbles ? 0.85 : 1}
            stroke={isActive ? "var(--color-background-secondary-default)" : ring}
            strokeWidth={isActive ? 2 : 1.25}
          />
        </g>
      );
    };

  const pill = (
    <>
      <RiCalendarLine className="size-4 shrink-0 text-text-secondary" aria-hidden />
      <span className="whitespace-nowrap">{activeRange?.label ?? periodLabel}</span>
    </>
  );
  const pillClass =
    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border-button-default bg-background-primary-default px-2.5 text-body-medium text-text-primary";

  const tooltipPos = activePoint && width > 0 ? positionOf(activePoint) : null;
  const tooltipLift = activePoint ? radiusOf(activePoint) + 10 : 0;

  return (
    <section
      aria-labelledby={labelId}
      className={cx("flex w-full min-w-0 flex-col gap-3 rounded-2xl bg-background-secondary-default p-2", className)}
    >
      <div className="flex flex-col gap-3 px-2 pt-2">
        {/* Header: title or active record, count-up value, change chip; period pill on the right */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5" aria-live="polite">
            <p id={labelId} className="text-body-medium text-text-secondary">
              {activePoint && active
                ? `${activePoint.label ?? "Record"} · ${series[active.s]?.label ?? ""}`
                : title}
            </p>
            <div className="flex items-center gap-2">
              <p
                key={active ? `${active.s}-${active.p}` : "all"}
                className="animate-number-fade text-title-1-medium text-text-primary tabular-nums motion-reduce:animate-none"
              >
                {format(shown)}
              </p>
              {chipValue !== undefined && chipValue !== null && (
                <Chip variant="bold" color={chipValue >= 0 ? "lime" : "rose"} className="tabular-nums">
                  {chipValue > 0 ? "+" : ""}
                  {chipValue}%{activePoint ? " vs avg" : ""}
                </Chip>
              )}
            </div>
          </div>
          {ranges && ranges.length > 0 ? (
            <Dropdown isOpen={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownTrigger aria-label={`Period: ${activeRange?.label ?? ""}`} className={cx(pillClass, "hover:bg-background-secondary-hover")}>
                {pill}
                <RiArrowDownSLine
                  className={cx(
                    "size-4 shrink-0 text-text-secondary transition-transform duration-150 ease-out motion-reduce:transition-none",
                    menuOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </DropdownTrigger>
              <DropdownPopover aria-label="Period" placement="bottom end" className="w-44">
                {ranges.map((r) => (
                  <DropdownItem
                    key={r.id}
                    selected={r.id === activeRange?.id}
                    onSelect={() => {
                      setInnerRange(r.id);
                      onRangeChange?.(r.id);
                      setActive(null);
                      setMenuOpen(false);
                    }}
                  >
                    {r.label}
                  </DropdownItem>
                ))}
              </DropdownPopover>
            </Dropdown>
          ) : periodLabel ? (
            <span className={pillClass}>{pill}</span>
          ) : null}
        </div>

        {/* Plot: Recharts draws axes, grid and dots; the readout is HTML over it */}
        <div
          ref={plotRef}
          tabIndex={0}
          role="group"
          aria-roledescription="scatter chart"
          aria-label={`${title}: ${series.map((s, i) => `${s.label} average ${format(model.averages[i] ?? 0)}`).join(", ")}. Arrow keys step through records.`}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
          className="relative w-full rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
          style={{ height: CHART_HEIGHT }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={MARGIN} accessibilityLayer={false}>
              <CartesianGrid stroke="var(--color-chart-track)" strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="x"
                domain={[0, model.xMax]}
                ticks={model.xTicks}
                height={X_AXIS_HEIGHT}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 12, fill: "var(--color-text-tertiary)" }}
              />
              <YAxis
                type="number"
                dataKey="y"
                domain={[0, model.yMax]}
                ticks={model.yTicks}
                width={Y_AXIS_WIDTH}
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                tickFormatter={(n: number) => compact.format(n)}
                tick={{ fontSize: 12, fill: "var(--color-text-tertiary)" }}
              />
              {series.map((s, si) => (
                <Scatter
                  key={s.label}
                  name={s.label}
                  data={s.points.map((p, pointIndex) => ({ ...p, pointIndex }))}
                  shape={renderDot(si)}
                  isAnimationActive={!reduced}
                  animationDuration={450}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>

          {activePoint && active && tooltipPos && (
            <div
              role="presentation"
              className="pointer-events-none absolute z-10 flex min-w-32 flex-col gap-1 rounded-lg border border-border-button-default bg-background-primary-default px-2.5 py-2 shadow-dropdown"
              style={{
                left: tooltipPos.left,
                top: tooltipPos.top - tooltipLift,
                transform: `translate(${tooltipPos.left > width - 90 ? "-90%" : tooltipPos.left < 90 ? "-10%" : "-50%"}, -100%)`,
              }}
            >
              <span className="flex items-center gap-1.5 text-body-2-medium text-text-primary">
                <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: colorAt(active.s).fill }} aria-hidden />
                {activePoint.label ?? series[active.s]?.label}
              </span>
              <span className="flex justify-between gap-3 text-caption-1-medium text-text-secondary tabular-nums">
                {axisLabels[0]}
                <span className="text-text-primary">{formatX(activePoint.x)}</span>
              </span>
              <span className="flex justify-between gap-3 text-caption-1-medium text-text-secondary tabular-nums">
                {axisLabels[1]}
                <span className="text-text-primary">{format(activePoint.y)}</span>
              </span>
            </div>
          )}
        </div>

        {/* Axis captions under the plot: y measure left, x measure right */}
        <div className="flex justify-between text-body-2-medium text-text-tertiary">
          <span>{axisLabels[1]}</span>
          <span>{axisLabels[0]}</span>
        </div>
      </div>

      {/* Per-series averages: tiles, or a single centred legend line */}
      {tiles ? (
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(6rem,1fr))] gap-1.5">
          {series.map((s, i) => (
            <li
              key={s.label}
              onMouseEnter={() => setHoveredSeries(i)}
              onMouseLeave={() => setHoveredSeries(null)}
              className="flex min-w-0 flex-col gap-0.5 rounded-xl bg-background-primary-default px-2.5 py-2"
            >
              <span className="flex min-w-0 items-center gap-1.5 text-body-medium text-text-secondary">
                <span className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: colorAt(i).fill }} aria-hidden />
                <span className="truncate">{s.label} · avg</span>
              </span>
              <span className="text-body-medium text-text-primary tabular-nums">{format(model.averages[i] ?? 0)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-2 pb-2">
          {series.map((s, i) => (
            <li
              key={s.label}
              onMouseEnter={() => setHoveredSeries(i)}
              onMouseLeave={() => setHoveredSeries(null)}
              className="flex items-center gap-1.5 text-body-medium text-text-secondary"
            >
              <span className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: colorAt(i).fill }} aria-hidden />
              {s.label}
              <span className="text-text-primary tabular-nums">{format(model.averages[i] ?? 0)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
// #endregion
