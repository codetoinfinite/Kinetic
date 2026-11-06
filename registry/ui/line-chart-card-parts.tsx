/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Line Chart Card" (boardui.com/components/line-chart-card).
 * No BoardUI source was used.
 */
"use client";

import type { ReactNode } from "react";
import { RiCalendarLine } from "@remixicon/react";

import { Chip } from "@/registry/ui/chip";
import type { ChipColor } from "@/registry/ui/chip";
import { SegmentedControl, SegmentedControlItem } from "@/registry/ui/segmented-control";
import { Select, SelectItem } from "@/registry/ui/select";
import { useCountUp } from "@/registry/hooks/use-count-up";
import { cx } from "@/registry/lib/cx";

/**
 * Shared pieces of the BoardUI-kit chart cards: the card frame, the count-up
 * headline with its delta chip, the period switch (segmented or a calendar
 * pill), the floating tooltip card, legend dots and the stat tiles that sit
 * under a chart. Colours are the theme's `chart-N` tokens throughout, so a
 * card follows light and dark mode with no per-theme code.
 */

/** One of the nine categorical hues in the kit theme (`--color-chart-N`). */
export type ChartTone = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** Base fill of a tone, for areas, bars and polygons. */
export const toneColor = (tone: ChartTone) => `var(--color-chart-${tone})`;
/** The darker `-active` step of a tone, for strokes and hovered marks. */
export const toneActiveColor = (tone: ChartTone) => `var(--color-chart-${tone}-active)`;

/** Static class map, so Tailwind sees every dot colour at build time. */
export const TONE_DOT: Record<ChartTone, string> = {
  1: "bg-chart-1-active",
  2: "bg-chart-2-active",
  3: "bg-chart-3-active",
  4: "bg-chart-4-active",
  5: "bg-chart-5-active",
  6: "bg-chart-6-active",
  7: "bg-chart-7-active",
  8: "bg-chart-8-active",
  9: "bg-chart-9-active",
};

/** The card surface every chart card shares. `@container` lets tiles reflow by card width. */
export const CHART_CARD_FRAME =
  "@container flex min-w-0 flex-col rounded-2xl bg-background-secondary-default p-2";

/** Axis tick style: 12px tertiary text, readable in both themes. */
export const AXIS_TICK = { fontSize: 12, fill: "var(--color-text-tertiary)" } as const;

/** Vertical hover cursor drawn by `<Tooltip cursor>`. */
export const CHART_CURSOR = {
  stroke: "var(--color-chart-cursor)",
  strokeWidth: 1,
  strokeDasharray: "4 4",
} as const;

/** Dashed horizontal grid line colour. */
export const GRID_STROKE = "var(--color-chart-track)";

const trimDecimal = (value: number) => String(Math.round(value * 10) / 10);

/** 13500 → "13.5K", 6000 with "$" → "$6K", 1.2e6 → "1.2M". */
export function formatCompact(value: number, prefix = "", suffix = "") {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${prefix}${trimDecimal(value / 1_000_000)}M${suffix}`;
  if (abs >= 1000) return `${prefix}${trimDecimal(value / 1000)}K${suffix}`;
  return `${prefix}${trimDecimal(value)}${suffix}`;
}

/** Grouped en-US number with a fixed number of decimals. */
export function formatNumber(value: number, decimals = 0) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export type ChartDelta = { label: string; color: ChipColor };

/** Percentage change as a chip: "+9.4%" lime, "-3.1%" rose, "0%" neutral, "New" with no baseline. */
export function describeDelta(current: number, previous: number | undefined): ChartDelta {
  if (previous === undefined || previous === 0) return { label: "New", color: "neutral" };
  const change = Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
  if (change === 0) return { label: "0%", color: "neutral" };
  return { label: `${change > 0 ? "+" : ""}${change}%`, color: change > 0 ? "lime" : "rose" };
}

export function ChartHeadline({
  label,
  value,
  format = (n) => formatNumber(n),
  decimals = 0,
  delta,
  swapKey,
  reducedMotion = false,
}: {
  /** Small secondary line above the figure. */
  label: ReactNode;
  /** Target figure; the display counts to it whenever it changes. */
  value: number;
  /** Turns the counted number into text ("$18,240"). */
  format?: (value: number) => string;
  /** Decimals kept while counting (the hook itself counts in integers). */
  decimals?: number;
  delta?: ChartDelta | null;
  /** Changing this replays the soft number fade, e.g. the hovered index. */
  swapKey?: string | number;
  /** Skip the count and the fade. */
  reducedMotion?: boolean;
}) {
  const scale = 10 ** decimals;
  const target = Math.round(value * scale);
  const counted = useCountUp(target);
  const shown = (reducedMotion ? target : counted) / scale;
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <p className="truncate text-body-medium text-text-secondary">{label}</p>
      <div className="flex min-w-0 items-center gap-2">
        <p
          key={swapKey}
          className="animate-number-fade text-title-1-medium whitespace-nowrap text-text-primary tabular-nums motion-reduce:animate-none"
        >
          {format(shown)}
        </p>
        {delta ? (
          <Chip variant="bold" color={delta.color} className="tabular-nums">
            {delta.label}
          </Chip>
        ) : null}
      </div>
    </div>
  );
}

export type ChartPeriod = { id: string; label: string };

/**
 * The period switch in a card header: a segmented Weekly / Monthly / Yearly
 * control, or a bordered pill with a calendar glyph that opens a listbox.
 */
export function ChartPeriodControl({
  options,
  value,
  onChange,
  variant = "segmented",
  label = "Period",
  className,
}: {
  options: readonly ChartPeriod[];
  value: string;
  onChange: (id: string) => void;
  variant?: "segmented" | "select";
  /** Accessible name of the control. */
  label?: string;
  className?: string;
}) {
  if (variant === "select") {
    return (
      <Select
        aria-label={label}
        size="sm"
        selectedKey={value}
        onSelectionChange={(key) => {
          if (key !== null) onChange(String(key));
        }}
        className={className}
        triggerClassName="gap-1.5 py-1.5 ps-2.5 pe-2 text-body-medium"
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
  return (
    <SegmentedControl
      aria-label={label}
      selectedKeys={[value]}
      onSelectionChange={(keys) => {
        const next = [...keys][0];
        if (next !== undefined) onChange(String(next));
      }}
      className={className}
    >
      {options.map((option) => (
        <SegmentedControlItem key={option.id} id={option.id}>
          {option.label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  );
}

export type ChartTooltipRow = {
  key: string;
  label: ReactNode;
  value: ReactNode;
  tone?: ChartTone;
};

/** The floating card a chart's `<Tooltip content>` renders: a title and one row per series. */
export function ChartTooltipCard({ title, rows }: { title: ReactNode; rows: readonly ChartTooltipRow[] }) {
  return (
    <div className="min-w-40 rounded-xl border border-border-button-default bg-background-primary-default px-3 py-2.5 shadow-dropdown">
      <p className="text-caption-1-medium text-text-tertiary">{title}</p>
      <ul className="mt-1.5 flex flex-col gap-1">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-2 text-body-2-regular text-text-secondary">
            {row.tone ? <span aria-hidden className={cx("size-2 shrink-0 rounded-full", TONE_DOT[row.tone])} /> : null}
            <span className="min-w-0 flex-1 truncate">{row.label}</span>
            <span className="ms-4 text-body-2-medium text-text-primary tabular-nums">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type ChartLegendItem = { key: string; label: ReactNode; tone: ChartTone };

/** A row of round colour dots naming each series. */
export function ChartLegend({ items, className }: { items: readonly ChartLegendItem[]; className?: string }) {
  return (
    <ul className={cx("flex flex-wrap items-center gap-x-4 gap-y-1 text-body-2-medium text-text-secondary", className)}>
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-1.5">
          <span aria-hidden className={cx("size-2 rounded-full", TONE_DOT[item.tone])} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export type ChartStatTile = {
  key: string;
  label: ReactNode;
  value: ReactNode;
  /** Square colour key before the label; omit for plain tiles. */
  tone?: ChartTone;
};

const TILE_COLUMNS = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  "3-wrap": "grid-cols-2 @sm:grid-cols-3",
} as const;

/** White tiles under a chart, one per series or category. */
export function ChartStatTiles({
  tiles,
  columns = 3,
  className,
}: {
  tiles: readonly ChartStatTile[];
  /** 2 or 3 fixed columns, or "3-wrap": two columns until the card is 384px wide. */
  columns?: keyof typeof TILE_COLUMNS;
  className?: string;
}) {
  return (
    <dl className={cx("grid gap-2", TILE_COLUMNS[columns], className)}>
      {tiles.map((tile) => (
        <div key={tile.key} className="flex min-w-0 flex-col gap-0.5 rounded-xl bg-background-primary-default px-2.5 py-2">
          <dt className="flex min-w-0 items-center gap-1.5 text-body-medium text-text-secondary">
            {tile.tone ? (
              <span aria-hidden className={cx("size-2.5 shrink-0 rounded-[3px]", TONE_DOT[tile.tone])} />
            ) : null}
            <span className="truncate">{tile.label}</span>
          </dt>
          <dd className="truncate text-body-medium text-text-primary tabular-nums">{tile.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The marker on a hovered point: a solid dot ringed in the card colour, with a
 * soft ping behind it unless motion is reduced. Recharts clones it with cx/cy.
 */
export function PulseDot({
  cx: x,
  cy: y,
  color,
  pulse = true,
}: {
  cx?: number;
  cy?: number;
  color: string;
  pulse?: boolean;
}) {
  if (x === undefined || y === undefined) return null;
  return (
    <g pointerEvents="none">
      {pulse ? (
        <circle
          cx={x}
          cy={y}
          r={6}
          fill={color}
          opacity={0.35}
          className="origin-center animate-ping [transform-box:fill-box] motion-reduce:animate-none"
        />
      ) : null}
      <circle cx={x} cy={y} r={4.5} fill={color} stroke="var(--color-background-secondary-default)" strokeWidth={2} />
    </g>
  );
}
