/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Heatmap Chart Card" (boardui.com/components/heatmap-chart-card).
 * No BoardUI source was used.
 */
"use client";

import { Fragment, useId, useMemo, useState, type KeyboardEvent } from "react";
import { RiArrowDownSLine, RiCalendarLine } from "@remixicon/react";

import { Chip } from "@/registry/ui/chip";
import { Dropdown, DropdownItem, DropdownPopover, DropdownTrigger } from "@/registry/ui/dropdown";
import { useCountUp } from "@/registry/hooks/use-count-up";
import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";
import { createRng } from "@/registry/lib/prng";
import { cx } from "@/registry/lib/cx";

export type HeatmapRow = { label: string; values: number[] };

export type HeatmapRange = {
  id: string;
  label: string;
  rows: HeatmapRow[];
  /** Overrides the card's `columns` for this range. */
  columns?: string[];
  /** Overrides the card's `max` for this range. */
  max?: number;
  /** Percent change for the chip. */
  change?: number;
  /** Headline figure; defaults to the sum of every cell. */
  headline?: number;
};

/* ---------- Built-in demo data: weekday x two-hour slot ---------- */

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const HEATMAP_HOURS = Array.from({ length: 12 }, (_, i) => String(i * 2).padStart(2, "0"));
const DAY_WEIGHT = [0.92, 1, 0.97, 1, 0.86, 0.5, 0.46];

/** A working-hours profile with an evening bump, scaled so every cell sums to `total`. */
function hourlyRows(seed: string, total: number): HeatmapRow[] {
  const rng = createRng(seed);
  const raw = DAY_WEIGHT.map((weight, d) =>
    HEATMAP_HOURS.map((_, h) => {
      const hour = h * 2 + 1;
      const weekend = d >= 5;
      const work = Math.exp(-(((hour - 13) / 4.8) ** 2));
      const evening = 0.3 * Math.exp(-(((hour - 20) / 2.4) ** 2));
      return weight * (0.12 + work * (weekend ? 0.7 : 1) + evening * (weekend ? 1.6 : 1)) * (0.93 + rng() * 0.14);
    }),
  );
  const sum = raw.flat().reduce((a, b) => a + b, 0);
  const values = raw.map((row) => row.map((v) => Math.round((v / sum) * total)));
  // Rounding leaves a small residue; the busiest cell absorbs it so the headline is exact.
  const residue = total - values.flat().reduce((a, b) => a + b, 0);
  let peak = { d: 0, h: 0, v: -1 };
  values.forEach((row, d) => row.forEach((v, h) => (v > peak.v ? (peak = { d, h, v }) : null)));
  const peakRow = values[peak.d];
  if (peakRow) peakRow[peak.h] = peak.v + residue;
  return DAYS.map((label, d) => ({ label, values: values[d] ?? [] }));
}

export const HEATMAP_RANGES: HeatmapRange[] = [
  { id: "7d", label: "Last 7 days", rows: hourlyRows("heatmap-7d", 1892), change: 5.2 },
  { id: "30d", label: "Last 30 days", rows: hourlyRows("heatmap-30d", 8214), change: 12.4 },
  { id: "90d", label: "Last 90 days", rows: hourlyRows("heatmap-90d", 23906), change: -3.1 },
];

/* ---------- Geometry and ramp ---------- */

/** Total height the rows share; row height is derived from it and clamped. */
const PLOT_HEIGHT = 168;
const GAP = 4;
const ROW_HEIGHT: [number, number] = [18, 40];
/** Accent share of the lightest cell, so a zero still reads as a cell on the track. */
const MIX_FLOOR = 10;
const LEGEND_STEPS = [0.15, 0.4, 0.6, 0.8, 1];

const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const defaultFormat = (value: number) => numberFormat.format(value);

export interface HeatmapChartCardProps {
  /** Header label while no cell is active. */
  title?: string;
  /** One entry per row; `values` line up with `columns`. Ignored when `ranges` is passed. */
  rows?: HeatmapRow[];
  /** Column labels under the grid. */
  columns?: string[];
  /** Ramp accent, any CSS colour. */
  color?: string;
  /** Value of a fully saturated cell. Defaults to the largest value. */
  max?: number;
  /** Percent change for the chip when `ranges` is not used. */
  change?: number;
  /** Headline figure when `ranges` is not used; defaults to the sum of every cell. */
  headline?: number;
  /** Text of the static period pill. */
  periodLabel?: string;
  /** Periods to choose from; turns the pill into a dropdown. */
  ranges?: HeatmapRange[];
  /** Controlled active range id. */
  range?: string;
  /** Uncontrolled starting range id. */
  defaultRange?: string;
  onRangeChange?: (id: string) => void;
  /** Formats the headline and tooltip values. */
  format?: (value: number) => string;
  /** Names a cell in the headline and tooltip. */
  cellLabel?: (row: string, column: string) => string;
  className?: string;
}

type Cell = { r: number; c: number } | null;

const ARROWS = ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Home", "End"];

export function HeatmapChartCard({
  title = "Active users",
  rows: rowsProp,
  columns: columnsProp,
  color = "var(--color-chart-6)",
  max: maxProp,
  change: changeProp,
  headline: headlineProp,
  periodLabel = "This week",
  ranges: rangesProp,
  range: rangeProp,
  defaultRange,
  onRangeChange,
  format = defaultFormat,
  cellLabel,
  className,
}: HeatmapChartCardProps = {}) {
  const reduced = useReducedMotion();
  const labelId = useId();

  // With no data props at all, the card runs on its three built-in ranges.
  const demo = !rowsProp && !rangesProp;
  const ranges = rangesProp ?? (demo ? HEATMAP_RANGES : undefined);
  const [innerRange, setInnerRange] = useState(defaultRange ?? ranges?.[0]?.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState<Cell>(null);

  const activeRange = ranges?.find((r) => r.id === (rangeProp ?? innerRange)) ?? ranges?.[0];
  const rows = activeRange?.rows ?? rowsProp ?? [];
  const width = Math.max(0, ...rows.map((r) => r.values.length));
  const columns =
    activeRange?.columns ?? columnsProp ?? (demo ? HEATMAP_HOURS : Array.from({ length: width }, (_, i) => String(i + 1)));
  const change = activeRange ? activeRange.change : changeProp;
  const nameOf = cellLabel ?? (demo ? (r: string, c: string) => `${r} · ${c}:00` : (r: string, c: string) => `${r} · ${c}`);

  // #region critical
  const model = useMemo(() => {
    const all = rows.flatMap((r) => r.values.slice(0, columns.length));
    const total = all.reduce((a, b) => a + b, 0);
    const largest = Math.max(0, ...all);
    const ceiling = maxProp ?? activeRange?.max ?? largest;
    return { total, mean: all.length ? total / all.length : 0, ceiling: ceiling > 0 ? ceiling : 1, largest };
  }, [rows, columns.length, maxProp, activeRange]);

  // Each cell mixes the accent into the chart track, so the ramp follows the theme.
  const mix = (t: number) => {
    const share = MIX_FLOOR + (100 - MIX_FLOOR) * Math.min(1, Math.max(0, t));
    return `color-mix(in oklab, ${color} ${Math.round(share)}%, var(--color-chart-track))`;
  };
  const rowHeight = Math.max(
    ROW_HEIGHT[0],
    Math.min(ROW_HEIGHT[1], Math.floor((PLOT_HEIGHT - (rows.length - 1) * GAP) / Math.max(1, rows.length))),
  );

  const activeValue = active ? rows[active.r]?.values[active.c] : undefined;
  const isActive = active !== null && activeValue !== undefined;
  const headlineValue = isActive ? activeValue : (activeRange?.headline ?? headlineProp ?? model.total);
  // #endregion

  const counted = useCountUp(Math.round(headlineValue));
  const shown = reduced ? Math.round(headlineValue) : counted;
  const chipValue =
    isActive && model.mean > 0 ? Math.round(((activeValue - model.mean) / model.mean) * 1000) / 10 : change;
  const activeName = isActive ? nameOf(rows[active.r]?.label ?? "", columns[active.c] ?? "") : "";

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      if (active) setActive(null);
      return;
    }
    if (!ARROWS.includes(event.key) || !rows.length || !columns.length) return;
    event.preventDefault();
    const lastR = rows.length - 1;
    const lastC = columns.length - 1;
    if (!active) {
      setActive({ r: 0, c: event.key === "End" ? lastC : 0 });
      return;
    }
    let { r, c } = active;
    if (event.key === "ArrowRight") c = Math.min(lastC, c + 1);
    else if (event.key === "ArrowLeft") c = Math.max(0, c - 1);
    else if (event.key === "ArrowDown") r = Math.min(lastR, r + 1);
    else if (event.key === "ArrowUp") r = Math.max(0, r - 1);
    else if (event.key === "Home") c = 0;
    else if (event.key === "End") c = lastC;
    setActive({ r: Math.min(r, lastR), c: Math.min(c, lastC) });
  };

  const pill = (
    <>
      <RiCalendarLine className="size-4 shrink-0 text-text-secondary" aria-hidden />
      <span className="whitespace-nowrap">{activeRange?.label ?? periodLabel}</span>
    </>
  );
  const pillClass =
    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border-button-default bg-background-primary-default px-2.5 text-body-medium text-text-primary";

  return (
    <section
      aria-labelledby={labelId}
      className={cx("@container flex w-full min-w-0 flex-col rounded-2xl bg-background-secondary-default p-2", className)}
    >
      <div className="flex flex-col gap-4 px-2 pt-2 pb-2">
        {/* Header: title or hovered cell, count-up value, change chip; period pill on the right */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5" aria-live="polite">
            <p id={labelId} className="text-body-medium text-text-secondary">
              {isActive ? activeName : title}
            </p>
            <div className="flex items-center gap-2">
              <p
                key={isActive ? `${active.r}-${active.c}` : "all"}
                className="animate-number-fade text-title-1-medium text-text-primary tabular-nums motion-reduce:animate-none"
              >
                {format(shown)}
              </p>
              {chipValue !== undefined && (
                <Chip variant="bold" color={chipValue >= 0 ? "lime" : "rose"} className="tabular-nums">
                  {chipValue > 0 ? "+" : ""}
                  {chipValue}%{isActive ? " vs avg" : ""}
                </Chip>
              )}
            </div>
          </div>
          {ranges && ranges.length > 0 ? (
            <Dropdown isOpen={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownTrigger
                aria-label={`Period: ${activeRange?.label ?? ""}`}
                className={cx(pillClass, "hover:bg-background-secondary-hover")}
              >
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

        {/* Grid: row labels, cells, column labels; keyed by range so the cells pop in again */}
        <div
          key={activeRange?.id ?? "rows"}
          tabIndex={0}
          role="group"
          aria-roledescription="heatmap"
          aria-label={`${title}: ${rows.length} rows by ${columns.length} columns, total ${format(model.total)}. Arrow keys move between cells.`}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
          onMouseLeave={() => setActive(null)}
          className="grid gap-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background-secondary-default"
          style={{ gridTemplateColumns: `max-content repeat(${columns.length}, minmax(0, 1fr))` }}
        >
          {rows.map((row, r) => (
            <Fragment key={`${row.label}-${r}`}>
              <span
                className={cx(
                  "flex items-center pr-2 text-caption-1-regular transition-colors duration-150 ease-out motion-reduce:transition-none",
                  active?.r === r ? "text-text-primary" : "text-text-tertiary",
                )}
                style={{ height: rowHeight }}
              >
                {row.label}
              </span>
              {columns.map((column, c) => {
                const value = row.values[c] ?? 0;
                const on = active?.r === r && active.c === c;
                const edge = c < 2 ? "left-0" : c > columns.length - 3 ? "right-0" : "left-1/2 -translate-x-1/2";
                return (
                  <div
                    key={c}
                    data-cell={`${r}-${c}`}
                    onMouseEnter={() => setActive({ r, c })}
                    className={cx(
                      "relative animate-cell-pop rounded-[3px] motion-reduce:animate-none",
                      on && "z-10 outline-2 outline-offset-1 outline-text-primary",
                    )}
                    style={{
                      height: rowHeight,
                      backgroundColor: mix(value / model.ceiling),
                      animationDelay: reduced ? undefined : `${c * 24 + r * 16}ms`,
                    }}
                  >
                    {on && (
                      <span
                        aria-hidden
                        className={cx(
                          "pointer-events-none absolute bottom-[calc(100%+8px)] flex flex-col gap-0.5 whitespace-nowrap rounded-lg border border-border-button-default bg-background-primary-default px-2.5 py-1.5 shadow-dropdown",
                          edge,
                        )}
                      >
                        <span className="text-caption-1-medium text-text-secondary">{nameOf(row.label, column)}</span>
                        <span className="text-body-2-medium text-text-primary tabular-nums">{format(value)}</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </Fragment>
          ))}
          <span aria-hidden />
          {columns.map((column, c) => (
            <span
              key={c}
              aria-hidden
              className={cx(
                "pt-1 text-center text-caption-1-regular tabular-nums transition-colors duration-150 ease-out motion-reduce:transition-none",
                active?.c === c ? "text-text-primary" : "text-text-tertiary",
                // Narrow cards with many columns label every other one.
                columns.length > 8 && c % 2 === 1 && "@max-sm:invisible",
              )}
            >
              {column}
            </span>
          ))}
        </div>

        {/* Ramp legend */}
        <div className="flex items-center justify-end gap-1.5 text-caption-1-regular text-text-tertiary" aria-hidden>
          <span className="mr-0.5">Less</span>
          {LEGEND_STEPS.map((t) => (
            <span key={t} className="size-2.5 rounded-[2px]" style={{ backgroundColor: mix(t) }} />
          ))}
          <span className="ml-0.5">More</span>
        </div>
      </div>
    </section>
  );
}
