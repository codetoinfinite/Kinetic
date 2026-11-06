/*
 * Adapted from BoardUI — https://github.com/BoardUI/boardui (components/base/pagination/pagination.tsx)
 * Copyright (c) 2026 Mertcan Dundar Esmergul (BoardUI). MIT License.
 * SPDX-License-Identifier: MIT
 */
"use client";

import { useTemplateCopy } from "@/registry/lib/template-copy";

import { useCallback, useState } from "react";
import { RiArrowLeftLine, RiArrowRightLine } from "@remixicon/react";
import { Button } from "@/registry/ui/button";
import { cx } from "@/registry/lib/cx";

/**
 * Pagination — designed to match the Board UI dashboard style (no dedicated
 * Figma frame yet, so it reuses shipped tokens/components):
 *   - Previous / Next use the secondary small `Button` (same as the Recent
 *     hires card pager) with arrow icons.
 *   - Page numbers are 32×32 (radius/lg) cells. Active cell borrows the
 *     secondary-button surface (white + border/button/default + shadow/xs);
 *     inactive cells are ghost with a secondary-hover background on hover.
 *   - Overflow collapses to leading/trailing dots around a sibling window.
 *
 * Below `COMPACT_WIDTH`, a `ResizeObserver` on the nav switches to a compact
 * layout — icon-only Previous/Next and `siblingCount` clamped to 0 — so the
 * row never overflows a narrow container instead of clipping mid-label.
 *
 * Controlled: pass `page`, `totalPages`, and `onChange`.
 */

export interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  /** Page numbers shown on each side of the current page. Default 1. */
  siblingCount?: number;
  className?: string;
  /** Visible and accessible navigation labels for the application's locale. */
  previousLabel?: string;
  nextLabel?: string;
  "aria-label"?: string;
}

// #region critical
const DOTS = "dots";

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function paginationRange(
  current: number,
  total: number,
  sibling: number,
): (number | typeof DOTS)[] {
  // first + last + current + 2*sibling + 2 dots
  const totalPageNumbers = sibling * 2 + 5;
  if (totalPageNumbers >= total) return range(1, total);

  const leftSibling = Math.max(current - sibling, 1);
  const rightSibling = Math.min(current + sibling, total);
  const showLeftDots = leftSibling > 2;
  const showRightDots = rightSibling < total - 2;

  if (!showLeftDots && showRightDots) {
    return [...range(1, 3 + 2 * sibling), DOTS, total];
  }
  if (showLeftDots && !showRightDots) {
    return [1, DOTS, ...range(total - (2 + 2 * sibling), total)];
  }
  return [1, DOTS, ...range(leftSibling, rightSibling), DOTS, total];
}

// No transition on the cells: animating background/shadow/color makes the
// previously-active number visibly fade out ("flicker") on every page change.
const cell = "flex size-8 shrink-0 items-center justify-center rounded-lg text-body-medium";

/** Below this nav width, Previous/Next drop their labels and siblingCount
 *  clamps to 0 — the full-label, full-sibling layout starts clipping
 *  somewhere around 380–420px depending on totalPages' digit count. */
const COMPACT_WIDTH = 420;

function useIsCompact() {
  const [isCompact, setIsCompact] = useState(false);

  // A callback ref, so the observer follows the nav itself: it attaches when
  // the nav mounts (also when `totalPages` grows past 1 after a `null` render)
  // and disconnects when the nav unmounts. A mount-only effect would have run
  // once while the nav was absent and never observed it.
  const ref = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const measure = (width: number) => {
      // 0 means hidden or not laid out (display: none, a closed tab or panel).
      // Keep the last layout instead of flipping to compact, which would then
      // paint for a frame when the nav is shown again.
      if (width > 0) setIsCompact(width < COMPACT_WIDTH);
    };
    // Measure now, during commit, so the first paint already has the right
    // layout. The observer's first callback lands after that paint, so on a
    // narrow container the full labels would flash before switching.
    measure(el.offsetWidth);
    // Border box, like offsetWidth, and unaffected by a scaled ancestor.
    const observer = new ResizeObserver(([entry]) => {
      if (entry) measure(entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width);
    });
    observer.observe(el, { box: "border-box" });
    return () => observer.disconnect();
  }, []);

  return [ref, isCompact] as const;
}

// #endregion

export function Pagination({
  page,
  totalPages,
  onChange,
  siblingCount = 1,
  className,
  previousLabel = "Previous",
  nextLabel = "Next",
  "aria-label": ariaLabel = "Pagination",
}: PaginationProps) {
  const localize = useTemplateCopy();
  const [navRef, isCompact] = useIsCompact();
  if (totalPages <= 1) return null;
  const pages = paginationRange(page, totalPages, isCompact ? 0 : siblingCount);

  return localize((
    <nav
      ref={navRef}
      aria-label={ariaLabel}
      className={cx("flex w-full items-center justify-between gap-2", className)}
    >
      <Button
        variant="secondary"
        size="small"
        iconOnly={isCompact}
        leadingIcon={RiArrowLeftLine}
        aria-label={isCompact ? previousLabel : undefined}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        {isCompact ? undefined : previousLabel}
      </Button>

      <ul className="flex min-w-0 items-center gap-0.5">
        {pages.map((item, i) =>
          item === DOTS ? (
            <li
              key={`dots-${i}`}
              aria-hidden
              className={cx(cell, "text-text-tertiary")}
            >
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                aria-label={`Go to page ${item}`}
                aria-current={item === page ? "page" : undefined}
                onClick={() => onChange(item)}
                className={cx(
                  cell,
                  "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-focus-ring",
                  item === page
                    ? "border border-border-button-default bg-background-primary-default text-text-primary shadow-xs"
                    : "text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary",
                )}
              >
                {item}
              </button>
            </li>
          ),
        )}
      </ul>

      <Button
        variant="secondary"
        size="small"
        iconOnly={isCompact}
        leadingIcon={isCompact ? RiArrowRightLine : undefined}
        trailingIcon={isCompact ? undefined : RiArrowRightLine}
        aria-label={isCompact ? nextLabel : undefined}
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        {isCompact ? undefined : nextLabel}
      </Button>
    </nav>
  ));
}
