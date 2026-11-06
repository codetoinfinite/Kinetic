/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Priority Badge" (boardui.com/templates/project-board).
 * No BoardUI source was used.
 */
import type { HTMLAttributes, Ref } from "react";
import { cx, sortCx } from "@/registry/lib/cx";

/**
 * Ticket priority pill from the project board cards: "Low" on blue, "Medium"
 * on yellow, "High" on orange, "Urgent" on rose. Each level can also carry a
 * small signal-bars glyph (1, 2 or 3 lit bars; urgent swaps the bars for an
 * exclamation tile) so the level still reads when colour does not.
 */

export type Priority = "urgent" | "high" | "medium" | "low";
export type PriorityBadgeSize = "sm" | "md";
export type PriorityBadgeVariant = "soft" | "plain";

/** Highest first: the order a "sort by priority" control should use. */
export const PRIORITIES: readonly Priority[] = ["urgent", "high", "medium", "low"];

export const PRIORITY_LABELS: Record<Priority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

/** Numeric weight for sorting (bigger is more pressing). */
export const PRIORITY_RANK: Record<Priority, number> = { low: 1, medium: 2, high: 3, urgent: 4 };

/** Lit bars per level. Urgent draws the exclamation tile instead. */
const LIT_BARS: Record<Priority, number> = { low: 1, medium: 2, high: 3, urgent: 3 };

export interface PriorityGlyphProps {
  priority: Priority;
  className?: string;
}

// #region critical
/** 3-bar signal glyph in `currentColor`; unlit bars sit at 30% opacity. */
export function PriorityGlyph({ priority, className }: PriorityGlyphProps) {
  if (priority === "urgent") {
    return (
      <svg viewBox="0 0 16 16" aria-hidden className={cx("size-3.5 shrink-0", className)}>
        <rect x="1.5" y="1.5" width="13" height="13" rx="3.5" fill="currentColor" />
        <path d="M8 4.5v4.25" stroke="var(--color-background-primary-default)" strokeWidth="1.75" strokeLinecap="round" />
        <circle cx="8" cy="11.25" r="1" fill="var(--color-background-primary-default)" />
      </svg>
    );
  }
  const lit = LIT_BARS[priority];
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={cx("size-3.5 shrink-0", className)}>
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={2 + i * 4.5}
          y={10 - i * 3.5}
          width="3"
          height={4.5 + i * 3.5}
          rx="1"
          fill="currentColor"
          opacity={i < lit ? 1 : 0.3}
        />
      ))}
    </svg>
  );
}

const styles = sortCx({
  base: "inline-flex shrink-0 items-center whitespace-nowrap rounded-md",
  size: {
    sm: "gap-0.5 px-1 py-px text-caption-1-medium",
    md: "gap-1 px-1.5 py-px text-body-regular",
  },
  soft: {
    urgent: "bg-status-rose-background text-status-rose-text",
    high: "bg-status-orange-background text-status-orange-text",
    medium: "bg-status-yellow-background text-status-yellow-text",
    low: "bg-status-blue-background text-status-blue-text",
  },
  /** Plain: no fill, label in secondary text, only the glyph is tinted. */
  plainGlyph: {
    urgent: "text-status-rose-text",
    high: "text-status-orange-text",
    medium: "text-status-yellow-text",
    low: "text-status-blue-text",
  },
});

export interface PriorityBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  priority: Priority;
  /** `soft` = tinted pill (board cards); `plain` = glyph + muted label (dense lists). */
  variant?: PriorityBadgeVariant;
  size?: PriorityBadgeSize;
  /** Draw the bars glyph before the label. Forced on for `plain`. */
  showIcon?: boolean;
  /** Hide the visible label (glyph only). The label stays as the accessible name. */
  iconOnly?: boolean;
  /** Override the visible text (e.g. localized copy). */
  label?: string;
  ref?: Ref<HTMLSpanElement>;
}

export function PriorityBadge({
  priority,
  variant = "soft",
  size = "md",
  showIcon = true,
  iconOnly = false,
  label,
  className,
  ref,
  ...props
}: PriorityBadgeProps) {
  const text = label ?? PRIORITY_LABELS[priority];
  const glyph = showIcon || iconOnly || variant === "plain";
  return (
    <span
      ref={ref}
      data-priority={priority}
      className={cx(
        styles.base,
        styles.size[size],
        variant === "soft" ? styles.soft[priority] : "px-0 text-text-secondary",
        iconOnly && (size === "sm" ? "px-0.5" : "px-1"),
        className,
      )}
      {...props}
    >
      {glyph && (
        <PriorityGlyph
          priority={priority}
          className={cx(size === "sm" && "size-3", variant === "plain" && styles.plainGlyph[priority])}
        />
      )}
      {iconOnly ? <span className="sr-only">{`${text} priority`}</span> : text}
    </span>
  );
}
// #endregion
