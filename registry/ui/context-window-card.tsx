/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Context Window Card" (boardui.com/).
 * No BoardUI source was used.
 */
"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import { ChevronDownSmall } from "@/registry/lib/chevrons";
import { cx, sortCx } from "@/registry/lib/cx";

/**
 * Context Window Card — how much of a model's context window is used, split
 * by what is using it (system prompt, tools, memory, messages) on one thin
 * segmented bar, with the remainder left as free track.
 *
 *   <ContextWindowCard
 *     capacity={1_000_000}
 *     segments={[{ id: "system", label: "System prompt", tokens: 9_000, color: "purple" }, …]}
 *   />
 *
 * The chevron in the header discloses a legend with each category's token
 * count and share. Hovering a legend row or a bar segment dims the others so
 * the pair reads together. `children` render under a divider, so plan limits
 * or other usage rows can share the same tile.
 */

export type ContextSegmentColor =
  | "blue"
  | "purple"
  | "pink"
  | "yellow"
  | "green"
  | "sky"
  | "teal"
  | "indigo"
  | "lime";

export interface ContextSegment {
  id: string;
  label: string;
  tokens: number;
  /** Segment colour from the kit's chart palette. Default `blue`. */
  color?: ContextSegmentColor;
}

export interface ContextWindowCardProps {
  /** Category usage, drawn left to right in this order. */
  segments: ContextSegment[];
  /** Window size in tokens, e.g. 1_000_000. */
  capacity: number;
  /** Header label. Default "Context window". */
  label?: ReactNode;
  /** Legend row label for the unused remainder. Default "Free space". */
  freeLabel?: string;
  /** Legend open state (controlled). */
  expanded?: boolean;
  /** Legend open state on mount (uncontrolled). Default `false`. */
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Token formatter for the header and legend. Default compact (820k, 1M). */
  formatTokens?: (tokens: number) => string;
  /** Extra rows rendered under a divider (e.g. plan usage limits). */
  children?: ReactNode;
  className?: string;
}

const DEFAULT_SEGMENT_COLOR: ContextSegmentColor = "blue";

const swatch = sortCx({
  blue: "bg-accent-500",
  purple: "bg-chart-5",
  pink: "bg-chart-3",
  yellow: "bg-chart-8",
  green: "bg-chart-7",
  sky: "bg-chart-4",
  teal: "bg-chart-1",
  indigo: "bg-chart-9",
  lime: "bg-chart-2",
});

/** 820_000 → "820k", 1_000_000 → "1M", 1_250_000 → "1.3M", 950 → "950". */
export function formatTokensCompact(tokens: number): string {
  if (tokens >= 1_000_000) {
    const m = Math.round(tokens / 100_000) / 10;
    return `${Number.isInteger(m) ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}k`;
  return `${Math.round(tokens)}`;
}

function percentOf(part: number, whole: number) {
  return whole > 0 ? (part / whole) * 100 : 0;
}

// #region critical
export function ContextWindowCard({
  segments,
  capacity,
  label = "Context window",
  freeLabel = "Free space",
  expanded,
  defaultExpanded = false,
  onExpandedChange,
  formatTokens = formatTokensCompact,
  children,
  className,
}: ContextWindowCardProps) {
  const legendId = useId();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultExpanded);
  const open = expanded ?? uncontrolledOpen;
  const [active, setActive] = useState<string | null>(null);

  const setOpen = (next: boolean) => {
    setUncontrolledOpen(next);
    onExpandedChange?.(next);
  };

  // Clamp so an over-full window never paints past the track.
  const used = Math.min(
    capacity,
    segments.reduce((sum, s) => sum + Math.max(0, s.tokens), 0),
  );
  const free = Math.max(0, capacity - used);
  const usedPct = Math.round(percentOf(used, capacity));

  // Each segment's width is its share of the WHOLE window, so the empty
  // track to the right is the free space with no extra element.
  let remaining = capacity;
  const widths = segments.map((s) => {
    const tokens = Math.min(Math.max(0, s.tokens), remaining);
    remaining -= tokens;
    return percentOf(tokens, capacity);
  });

  return (
    <section
      className={cx(
        "flex w-full min-w-0 flex-col gap-3 rounded-[14px] bg-background-secondary-default p-3.5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-caption-1-medium text-text-secondary">{label}</h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={legendId}
          onClick={() => setOpen(!open)}
          className="-me-1 inline-flex cursor-pointer items-center gap-1 rounded-md px-1 py-0.5 text-caption-1-medium text-text-secondary tabular-nums outline-none transition-colors duration-150 ease-out hover:bg-background-secondary-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring"
        >
          <span>
            {formatTokens(used)} / {formatTokens(capacity)}{" "}
            <span className="text-caption-1-semibold text-text-primary">({usedPct}%)</span>
          </span>
          <span className="sr-only">{open ? "Hide breakdown" : "Show breakdown"}</span>
          <ChevronDownSmall
            aria-hidden
            className={cx(
              "size-3.5 shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none",
              open && "rotate-180",
            )}
          />
        </button>
      </div>

      <div
        role="meter"
        aria-label={typeof label === "string" ? label : "Context window"}
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-valuenow={used}
        aria-valuetext={`${formatTokens(used)} of ${formatTokens(capacity)} tokens used (${usedPct}%)`}
        className="flex h-1 w-full gap-px overflow-hidden rounded-full bg-chart-track"
      >
        {segments.map((s, i) => (
          <span
            key={s.id}
            onPointerEnter={() => setActive(s.id)}
            onPointerLeave={() => setActive(null)}
            className={cx(
              "h-full shrink-0 first:rounded-s-full",
              "transition-[width,opacity] duration-500 ease-out motion-reduce:transition-none",
              swatch[s.color ?? DEFAULT_SEGMENT_COLOR],
              active !== null && active !== s.id && "opacity-35",
            )}
            style={{ width: `${widths[i] ?? 0}%` }}
          />
        ))}
      </div>

      <div
        id={legendId}
        className={cx(
          "grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out motion-reduce:transition-none",
          // Closed, the -mt-3 cancels the flex gap so the empty row adds no space.
          open ? "grid-rows-[1fr] opacity-100" : "-mt-3 grid-rows-[0fr] opacity-0",
        )}
        inert={!open}
      >
        <ul className="min-h-0 overflow-hidden">
          {segments.map((s, i) => (
            <li
              key={s.id}
              onPointerEnter={() => setActive(s.id)}
              onPointerLeave={() => setActive(null)}
              className={cx(
                "flex items-center gap-2 rounded-md px-1 py-1 text-caption-1-medium transition-[background-color,opacity] duration-150 ease-out",
                active === s.id && "bg-background-secondary-hover",
                active !== null && active !== s.id && "opacity-60",
              )}
            >
              <span aria-hidden className={cx("size-2 shrink-0 rounded-[3px]", swatch[s.color ?? DEFAULT_SEGMENT_COLOR])} />
              <span className="min-w-0 flex-1 truncate text-text-primary">{s.label}</span>
              <span className="shrink-0 text-text-secondary tabular-nums">{formatTokens(s.tokens)}</span>
              <span className="w-10 shrink-0 text-end text-text-tertiary tabular-nums">
                {(widths[i] ?? 0).toFixed(1)}%
              </span>
            </li>
          ))}
          <li className="flex items-center gap-2 px-1 py-1 text-caption-1-medium">
            <span aria-hidden className="size-2 shrink-0 rounded-[3px] bg-chart-track ring-1 ring-border-button-default ring-inset" />
            <span className="min-w-0 flex-1 truncate text-text-secondary">{freeLabel}</span>
            <span className="shrink-0 text-text-secondary tabular-nums">{formatTokens(free)}</span>
            <span className="w-10 shrink-0 text-end text-text-tertiary tabular-nums">
              {percentOf(free, capacity).toFixed(1)}%
            </span>
          </li>
        </ul>
      </div>

      {children != null && children !== false ? (
        <>
          <hr className="border-border-table" />
          {children}
        </>
      ) : null}
    </section>
  );
}
// #endregion
