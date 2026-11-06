/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Funnel Chart Card" (boardui.com/components/funnel-chart-card).
 * No BoardUI source was used.
 */
"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { RiCalendarLine } from "@remixicon/react";

import { Chip } from "@/registry/ui/chip";
import { Select, SelectItem } from "@/registry/ui/select";
import { useCountUp } from "@/registry/hooks/use-count-up";
import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";
import { cx } from "@/registry/lib/cx";
import { easeOutCubic } from "@/registry/lib/easing";

/**
 * The dashboard chart-card shell shared by the funnel, Sankey, stage bars,
 * radial and speedometer cards: a secondary-surface frame, a header with a
 * count-up headline, a delta chip and a period select, and a wrap of white
 * stat tiles that stay in step with whatever the chart has under the pointer.
 */

export type ChartColor = "lime" | "blue" | "purple" | "pink" | "yellow" | "emerald" | "sky" | "indigo" | "teal";

/** The order stages and series take their colour in when none is given. */
export const CHART_COLOR_ORDER: readonly ChartColor[] = [
  "lime",
  "blue",
  "purple",
  "pink",
  "yellow",
  "emerald",
  "sky",
  "indigo",
  "teal",
];

/** CSS colour for SVG fills, the darker hover tone, and a static swatch class. */
export const CHART_COLORS: Record<ChartColor, { fill: string; active: string; swatch: string }> = {
  lime: { fill: "var(--color-chart-2)", active: "var(--color-chart-2-active)", swatch: "bg-chart-2" },
  blue: { fill: "var(--color-chart-6)", active: "var(--color-chart-6-active)", swatch: "bg-chart-6" },
  purple: { fill: "var(--color-chart-5)", active: "var(--color-chart-5-active)", swatch: "bg-chart-5" },
  pink: { fill: "var(--color-chart-3)", active: "var(--color-chart-3-active)", swatch: "bg-chart-3" },
  yellow: { fill: "var(--color-chart-8)", active: "var(--color-chart-8-active)", swatch: "bg-chart-8" },
  emerald: { fill: "var(--color-chart-7)", active: "var(--color-chart-7-active)", swatch: "bg-chart-7" },
  sky: { fill: "var(--color-chart-4)", active: "var(--color-chart-4-active)", swatch: "bg-chart-4" },
  indigo: { fill: "var(--color-chart-9)", active: "var(--color-chart-9-active)", swatch: "bg-chart-9" },
  teal: { fill: "var(--color-chart-1)", active: "var(--color-chart-1-active)", swatch: "bg-chart-1" },
};

/** Single-ink fill for `mono` cards: mid grey on light, light grey on dark. */
export const MONO_FILL = "var(--color-text-secondary)";

/** The colour for the item at `index`, cycling the palette unless overridden. */
export function chartColorAt(index: number, override?: ChartColor): ChartColor {
  return override ?? CHART_COLOR_ORDER[index % CHART_COLOR_ORDER.length] ?? "lime";
}

export const formatInt = (value: number) => Math.round(value).toLocaleString("en-US");

/** "+5.2%" in lime, "-1.8%" in rose, "0%" in neutral. */
export function deltaChip(delta: number) {
  const rounded = Math.round(delta * 10) / 10;
  if (rounded === 0) return { label: "0%", color: "neutral" as const };
  return {
    label: `${rounded > 0 ? "+" : ""}${rounded}%`,
    color: rounded > 0 ? ("lime" as const) : ("rose" as const),
  };
}

/**
 * Tweens a list of numbers towards `targets` with an ease-out cubic, starting
 * from zeros on mount so the chart grows in. Interrupted tweens restart from
 * wherever the previous one had got to. With `disabled` it returns the
 * targets as they are.
 */
export function useTweenedValues(targets: readonly number[], { duration = 520, disabled = false } = {}) {
  const [current, setCurrent] = useState<number[]>(() => targets.map(() => 0));
  const fromRef = useRef<number[]>(current);
  const key = targets.join(",");

  useEffect(() => {
    if (disabled) {
      fromRef.current = [...targets];
      return;
    }
    const goal = key === "" ? [] : key.split(",").map(Number);
    const from = fromRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      const eased = easeOutCubic(t);
      const next = goal.map((value, index) => {
        const origin = from[index] ?? 0;
        return origin + (value - origin) * eased;
      });
      fromRef.current = next;
      setCurrent(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // `key` carries the targets' contents; the array identity changes every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, duration, disabled]);

  if (disabled) return [...targets];
  return targets.map((_, index) => current[index] ?? 0);
}

/* ----------------------------------------------------------------- frame */

export function ChartCardFrame({
  className,
  children,
  "aria-label": ariaLabel,
}: {
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  return (
    <section
      aria-label={ariaLabel}
      className={cx("flex min-w-0 flex-col gap-4 rounded-2xl bg-background-secondary-default p-2", className)}
    >
      {children}
    </section>
  );
}

/* ---------------------------------------------------------------- header */

export type ChartCardHeaderProps = {
  /** Muted label above the figure: the card title, or the hovered item's name. */
  label: ReactNode;
  /** The headline number; it counts to every new value. */
  value: number;
  /** Turns the counted number into text, e.g. hours or money. */
  formatValue?: (value: number) => string;
  /** Percent change for the chip; omit to hide the chip. */
  delta?: number;
  /** Free-form chip text that replaces the delta chip (e.g. a step conversion). */
  note?: ReactNode;
  /** Changes whenever the headline swaps subject, so the fade replays. */
  valueKey?: string | number;
  /** Right-hand slot, usually a PeriodSelect. */
  action?: ReactNode;
};

export function ChartCardHeader({
  label,
  value,
  formatValue = formatInt,
  delta,
  note,
  valueKey,
  action,
}: ChartCardHeaderProps) {
  const reduced = useReducedMotion();
  // A 1ms count lands on the next frame: the number still updates, it just doesn't roll.
  const display = useCountUp(value, reduced ? 1 : 320);
  const chip = delta === undefined ? null : deltaChip(delta);

  return (
    <div className="flex items-start justify-between gap-3 px-2 pt-2">
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="truncate text-body-medium text-text-secondary">{label}</p>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <p
            key={valueKey}
            className="animate-number-fade text-title-1-regular whitespace-nowrap text-text-primary tabular-nums motion-reduce:animate-none"
          >
            {formatValue(display)}
          </p>
          {note !== undefined ? (
            <Chip variant="bold" color="neutral" className="tabular-nums">
              {note}
            </Chip>
          ) : chip ? (
            <Chip variant="bold" color={chip.color} className="tabular-nums">
              {chip.label}
            </Chip>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* ---------------------------------------------------------- period select */

export type PeriodOption = { id: string; label: string };

export function PeriodSelect({
  options,
  selectedId,
  onChange,
  "aria-label": ariaLabel = "Period",
}: {
  options: readonly PeriodOption[];
  selectedId: string;
  onChange: (id: string) => void;
  "aria-label"?: string;
}) {
  return (
    <Select
      aria-label={ariaLabel}
      size="sm"
      selectedKey={selectedId}
      onSelectionChange={(key) => {
        if (key !== null) onChange(String(key));
      }}
      triggerClassName="gap-1.5 px-2.5 py-1.5 text-body-medium"
      popoverClassName="w-44"
      renderValue={({ selectedText }) => (
        <>
          <RiCalendarLine aria-hidden className="size-4 shrink-0 text-text-secondary" />
          <span className="truncate">{selectedText}</span>
        </>
      )}
    >
      {options.map((option) => (
        <SelectItem key={option.id} id={option.id} textValue={option.label}>
          {option.label}
        </SelectItem>
      ))}
    </Select>
  );
}

/* ------------------------------------------------------------- stat tiles */

export type StatTileItem = {
  id: string;
  label: string;
  value: ReactNode;
  /** Swatch colour; null hides the swatch (mono cards). */
  color: ChartColor | null;
};

// #region critical
/**
 * White tiles under the chart. Hovering one reports its index, so the chart
 * and the headline follow; while another item is active the rest fade back.
 * `columns` is the most tiles per row: tiles keep a 120px minimum and grow to
 * fill, so a narrow card wraps to two per row and a short last row stretches.
 */
export function StatTiles({
  items,
  activeIndex,
  onActiveChange,
  columns = 4,
  className,
}: {
  items: readonly StatTileItem[];
  activeIndex: number | null;
  onActiveChange?: (index: number | null) => void;
  columns?: number;
  className?: string;
}) {
  const basis = `calc((100% - ${(columns - 1) * 8}px) / ${columns})`;
  return (
    <ul className={cx("flex flex-wrap gap-2", className)} onPointerLeave={() => onActiveChange?.(null)}>
      {items.map((item, index) => {
        const dimmed = activeIndex !== null && activeIndex !== index;
        const style: CSSProperties = { flexBasis: basis };
        return (
          <li
            key={item.id}
            style={style}
            onPointerEnter={() => onActiveChange?.(index)}
            data-active={activeIndex === index || undefined}
            className={cx(
              "flex min-w-[120px] grow flex-col gap-0.5 rounded-2lg bg-background-primary-default px-2.5 py-2",
              "transition-opacity duration-200 ease-out motion-reduce:transition-none",
              dimmed && "opacity-45",
            )}
          >
            <span className="flex min-w-0 items-center gap-1.5 text-body-regular text-text-secondary">
              {item.color ? (
                <span aria-hidden className={cx("size-2.5 shrink-0 rounded-[3px]", CHART_COLORS[item.color].swatch)} />
              ) : null}
              <span className="truncate">{item.label}</span>
            </span>
            <span className="text-body-medium text-text-primary tabular-nums">{item.value}</span>
          </li>
        );
      })}
    </ul>
  );
}
// #endregion
