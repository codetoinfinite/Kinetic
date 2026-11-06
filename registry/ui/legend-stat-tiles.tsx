/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Legend Stat Tiles" (boardui.com/templates/dashboard).
 * No BoardUI source was used.
 */
"use client";

import { useMemo, useState } from "react";
import { Chip } from "@/registry/ui/chip";
import { cx } from "@/registry/lib/cx";

export type LegendColor =
  | "chart-1"
  | "chart-2"
  | "chart-3"
  | "chart-4"
  | "chart-5"
  | "chart-6"
  | "chart-7"
  | "chart-8"
  | "chart-9";

export type LegendSegment = {
  id: string;
  label: string;
  value: number;
  /** Chart token for the dot and the bar segment. Defaults by position. */
  color?: LegendColor;
};

export interface LegendStatTilesProps {
  segments: LegendSegment[];
  title?: string;
  /** Headline delta, e.g. 0.148 for +14.8%. Omit to hide the chip. */
  change?: number;
  /** Ids left out of the bar and the total. Controlled when defined. */
  hidden?: string[];
  defaultHidden?: string[];
  onHiddenChange?: (hidden: string[]) => void;
  /** Lets each tile toggle its segment in and out of the total. Default true. */
  toggleable?: boolean;
  /** Formats the headline total and each tile value. */
  formatValue?: (value: number) => string;
  locale?: string;
  className?: string;
}

const ORDER: LegendColor[] = ["chart-6", "chart-2", "chart-3", "chart-5", "chart-1", "chart-8", "chart-4", "chart-7", "chart-9"];

/* Literal class strings so Tailwind sees every one. */
const FILL: Record<LegendColor, string> = {
  "chart-1": "bg-chart-1",
  "chart-2": "bg-chart-2",
  "chart-3": "bg-chart-3",
  "chart-4": "bg-chart-4",
  "chart-5": "bg-chart-5",
  "chart-6": "bg-chart-6",
  "chart-7": "bg-chart-7",
  "chart-8": "bg-chart-8",
  "chart-9": "bg-chart-9",
};
const RING: Record<LegendColor, string> = {
  "chart-1": "ring-chart-1",
  "chart-2": "ring-chart-2",
  "chart-3": "ring-chart-3",
  "chart-4": "ring-chart-4",
  "chart-5": "ring-chart-5",
  "chart-6": "ring-chart-6",
  "chart-7": "ring-chart-7",
  "chart-8": "ring-chart-8",
  "chart-9": "ring-chart-9",
};

/**
 * Whole-number percentages that always add up to 100 (largest remainder).
 * Plain rounding of 33.3 / 33.3 / 33.3 prints 99%.
 */
export function wholePercents(values: number[]): number[] {
  const total = values.reduce((sum, v) => sum + Math.max(0, v), 0);
  if (total <= 0) return values.map(() => 0);
  const raw = values.map((v) => (Math.max(0, v) / total) * 100);
  const floors = raw.map(Math.floor);
  let left = 100 - floors.reduce((a, b) => a + b, 0);
  const byRemainder = raw
    .map((r, i) => ({ i, rem: r - Math.floor(r) }))
    .sort((a, b) => b.rem - a.rem);
  for (const { i } of byRemainder) {
    if (left <= 0) break;
    floors[i] = (floors[i] ?? 0) + 1;
    left -= 1;
  }
  return floors;
}

function useControllable<T>(value: T | undefined, initial: T, onChange?: (next: T) => void) {
  const [local, setLocal] = useState(initial);
  const current = value !== undefined ? value : local;
  const set = (next: T) => {
    if (value === undefined) setLocal(next);
    onChange?.(next);
  };
  return [current, set] as const;
}

export function LegendStatTiles({
  segments,
  title = "Total",
  change,
  hidden: hiddenProp,
  defaultHidden = [],
  onHiddenChange,
  toggleable = true,
  formatValue,
  locale = "en-US",
  className,
}: LegendStatTilesProps) {
  const [hidden, setHidden] = useControllable<string[]>(hiddenProp, defaultHidden, onHiddenChange);
  const [active, setActive] = useState<string | null>(null);

  const format = useMemo(() => {
    if (formatValue) return formatValue;
    const nf = new Intl.NumberFormat(locale);
    return (n: number) => nf.format(n);
  }, [formatValue, locale]);
  const pct = useMemo(
    () => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" }),
    [locale],
  );

  // #region critical
  // Only shown segments count: the headline total is their sum, and the bar
  // gives each one `flex-grow: value` on a zero basis, so the widths are the
  // exact shares of that total. The printed percents use largest-remainder
  // rounding so they also add up to 100.
  const rows = useMemo(() => {
    const shown = segments.map((s) => !hidden.includes(s.id) && s.value > 0);
    const percents = wholePercents(segments.map((s, i) => (shown[i] ? s.value : 0)));
    return segments.map((s, i) => ({
      ...s,
      color: s.color ?? ORDER[i % ORDER.length] ?? "chart-1",
      shown: shown[i] ?? false,
      percent: percents[i] ?? 0,
    }));
  }, [segments, hidden]);
  const total = rows.reduce((sum, r) => sum + (r.shown ? r.value : 0), 0);
  const shownCount = rows.filter((r) => r.shown).length;
  // Spotlight only a series that is in the bar; a hidden one would dim them all.
  const spotlight = rows.find((r) => r.id === active && r.shown)?.id ?? null;

  const toggle = (id: string) => {
    const isHidden = hidden.includes(id);
    // Keep at least one segment in the total, so the bar never empties.
    if (!isHidden && shownCount <= 1) return;
    setHidden(isHidden ? hidden.filter((h) => h !== id) : [...hidden, id]);
  };
  // #endregion

  const summary = rows
    .filter((r) => r.shown)
    .map((r) => `${r.label} ${r.percent}%`)
    .join(", ");

  return (
    <section
      aria-label={title}
      className={cx("@container flex w-full min-w-0 flex-col gap-3 rounded-2xl bg-background-secondary-default p-2", className)}
    >
      <header className="flex flex-col gap-0.5 px-2 pt-2">
        <h3 className="text-body-medium text-text-secondary">{title}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-title-1-medium text-text-primary tabular-nums" aria-live="polite">
            {format(total)}
          </p>
          {change !== undefined && (
            <Chip color={change > 0 ? "lime" : change < 0 ? "rose" : "neutral"}>{pct.format(change)}</Chip>
          )}
        </div>
      </header>

      <div
        role="img"
        aria-label={summary}
        className="mx-2 flex h-2 overflow-hidden rounded-full bg-chart-track"
        onPointerLeave={() => setActive(null)}
      >
        {rows.map((r) => (
          <span
            key={r.id}
            data-segment={r.id}
            onPointerEnter={() => setActive(r.id)}
            style={{ flexGrow: r.shown ? r.value : 0 }}
            className={cx(
              "h-full min-w-0 basis-0 transition-[flex-grow,opacity] duration-300 ease-out motion-reduce:transition-none",
              r.shown ? "px-px first:ps-0 last:pe-0" : "px-0",
              spotlight && spotlight !== r.id && "opacity-35",
            )}
          >
            <span className={cx("block h-full rounded-[2px]", FILL[r.color])} />
          </span>
        ))}
      </div>

      <ul className="grid grid-cols-2 gap-2 @xl:grid-cols-4">
        {rows.map((r) => {
          const lastShown = r.shown && shownCount <= 1;
          const body = (
            <>
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-headline-medium text-text-primary tabular-nums">{format(r.value)}</span>
                <span className="shrink-0 text-caption-1-medium text-text-tertiary tabular-nums">
                  {r.shown ? `${r.percent}%` : "Off"}
                </span>
              </span>
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  aria-hidden
                  className={cx(
                    "size-2 shrink-0 rounded-full transition-colors duration-150 ease-out",
                    r.shown ? FILL[r.color] : cx("bg-transparent ring-[1.5px] ring-inset", RING[r.color]),
                  )}
                />
                <span className="truncate text-body-regular text-text-secondary">{r.label}</span>
              </span>
            </>
          );
          const tileClass = cx(
            "flex w-full min-w-0 flex-col gap-1 rounded-xl bg-background-inner-default p-2.5 text-start shadow-card transition-opacity duration-200 ease-out motion-reduce:transition-none",
            !r.shown && "opacity-60",
            spotlight && spotlight !== r.id && "opacity-60",
          );
          return (
            <li
              key={r.id}
              className="min-w-0"
              onPointerEnter={() => setActive(r.id)}
              onPointerLeave={() => setActive(null)}
            >
              {toggleable ? (
                <button
                  type="button"
                  aria-pressed={r.shown}
                  aria-disabled={lastShown || undefined}
                  title={lastShown ? "At least one series stays in the total" : undefined}
                  onClick={() => toggle(r.id)}
                  onFocus={() => setActive(r.id)}
                  onBlur={() => setActive(null)}
                  className={cx(
                    tileClass,
                    "cursor-pointer outline-none hover:bg-background-primary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring aria-disabled:cursor-default",
                  )}
                >
                  {body}
                </button>
              ) : (
                <div className={tileClass}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
