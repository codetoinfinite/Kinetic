/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Profile Stat Tiles" (boardui.com/templates/ai-profile).
 * No BoardUI source was used.
 */
"use client";

import { useState } from "react";
import type { HTMLAttributes, ReactNode, Ref } from "react";
import { RiArrowDownLine, RiArrowUpLine } from "@remixicon/react";

import { useCountUp } from "@/registry/hooks/use-count-up";
import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";
import { cx } from "@/registry/lib/cx";
import { Chip } from "@/registry/ui/chip";

/**
 * Profile Stat Tiles: a headline figure with a trend chip over a row of
 * small grey tiles (value, label, optional trend).
 *
 * The headline rolls to its new value when it changes. Tiles are static by
 * default; pass `onSelectionChange` (or `selectedId`) and they become toggle
 * buttons so one metric can drive another view, such as a heatmap.
 */

export interface StatTile {
  id: string;
  label: string;
  value: ReactNode;
  /** Percent change; positive, negative or zero. */
  trend?: number;
}

export interface ProfileStatTilesProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onSelect"> {
  /** Caption above the headline, e.g. "Contributions this year". */
  label?: ReactNode;
  /** Headline number. Omit to render the tiles alone. */
  value?: number;
  formatValue?: (value: number) => string;
  /** Percent change shown as a chip beside the headline. */
  trend?: number;
  tiles: StatTile[];
  selectedId?: string | null;
  defaultSelectedId?: string | null;
  onSelectionChange?: (id: string | null) => void;
  /** Accessible name of the tile group. */
  tilesLabel?: string;
  ref?: Ref<HTMLDivElement>;
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** "+14.8%", "−3.2%", "0%"; one decimal at most, a real minus sign. Unsigned: "3.2%". */
export function formatTrend(trend: number, signed = true) {
  const abs = Math.abs(trend);
  const text = `${Number.isInteger(abs) ? abs : abs.toFixed(1)}%`;
  if (!signed) return text;
  if (trend > 0) return `+${text}`;
  if (trend < 0) return `−${text}`;
  return text;
}

function TrendChip({ trend }: { trend: number }) {
  return (
    <Chip
      variant="caption"
      color={trend > 0 ? "purple" : trend < 0 ? "rose" : "neutral"}
      className="tabular-nums"
    >
      {formatTrend(trend)}
    </Chip>
  );
}

function TileTrend({ trend }: { trend: number }) {
  const Icon = trend >= 0 ? RiArrowUpLine : RiArrowDownLine;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-0.5 text-caption-1-medium tabular-nums",
        trend > 0 ? "text-status-purple-text" : trend < 0 ? "text-status-rose-text" : "text-text-tertiary",
      )}
    >
      {trend !== 0 && <Icon aria-hidden className="size-3" />}
      <span className="sr-only">{trend > 0 ? "up" : trend < 0 ? "down" : "no change"} </span>
      {formatTrend(trend, false)}
    </span>
  );
}

export function ProfileStatTiles({
  label,
  value,
  formatValue = (n) => currency.format(n),
  trend,
  tiles,
  selectedId,
  defaultSelectedId = null,
  onSelectionChange,
  tilesLabel = "Stats",
  className,
  ref,
  ...props
}: ProfileStatTilesProps) {
  const reduced = useReducedMotion();
  const rolled = useCountUp(value ?? 0, 480);
  const shown = reduced ? (value ?? 0) : rolled;

  // #region critical
  // Tiles are toggle buttons only when someone listens or controls them.
  const selectable = onSelectionChange !== undefined || selectedId !== undefined;
  const [innerSelected, setInnerSelected] = useState<string | null>(defaultSelectedId);
  const current = selectedId !== undefined ? selectedId : innerSelected;
  const toggle = (id: string) => {
    const next = current === id ? null : id;
    if (selectedId === undefined) setInnerSelected(next);
    onSelectionChange?.(next);
  };

  const tileBase =
    "flex min-w-0 flex-col items-start gap-0.5 rounded-[10px] px-2.5 py-2.5 text-start transition-[background-color,box-shadow] duration-150 ease-out";
  // #endregion

  return (
    <div ref={ref} className={cx("flex w-full flex-col gap-3", className)} {...props}>
      {value !== undefined && (
        <div className="flex flex-col gap-0.5">
          {label && (
            <p className="text-body-regular text-text-secondary">
              {label}
            </p>
          )}
          <div className="flex items-center gap-2">
            <p className="text-title-1-regular text-text-primary tabular-nums">
              <span aria-hidden>{formatValue(shown)}</span>
              <span className="sr-only">{formatValue(value)}</span>
            </p>
            {trend !== undefined && <TrendChip trend={trend} />}
          </div>
        </div>
      )}

      <div
        role="group"
        aria-label={tilesLabel}
        className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(132px,1fr))]"
      >
        {tiles.map((tile) => {
          const body = (
            <>
              <span className="flex w-full flex-wrap items-baseline justify-between gap-x-2">
                <span className="text-body-medium text-text-primary tabular-nums">{tile.value}</span>
                {tile.trend !== undefined && <TileTrend trend={tile.trend} />}
              </span>
              <span className="truncate text-body-2-regular text-text-secondary">{tile.label}</span>
            </>
          );
          if (!selectable) {
            return (
              <div key={tile.id} className={cx(tileBase, "bg-background-secondary-default")}>
                {body}
              </div>
            );
          }
          const isSelected = current === tile.id;
          return (
            <button
              key={tile.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => toggle(tile.id)}
              className={cx(
                tileBase,
                "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                isSelected
                  ? "bg-background-primary-default shadow-xs ring-1 ring-border-button-hover"
                  : "bg-background-secondary-default hover:bg-background-secondary-hover",
              )}
            >
              {body}
            </button>
          );
        })}
      </div>
    </div>
  );
}
