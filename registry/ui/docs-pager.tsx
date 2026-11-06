/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Docs Pager" (boardui.com/components/line-chart-card).
 * No BoardUI source was used.
 */
"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { RiArrowLeftLine, RiArrowRightLine } from "@remixicon/react";
import { cx } from "@/registry/lib/cx";
import { directionalIconClass } from "@/registry/lib/directional-icon";

export type DocsPagerDirection = "prev" | "next";

export interface DocsPagerLink {
  title: string;
  /** Short line under the title, e.g. what the page covers. */
  description?: ReactNode;
  /** Renders an anchor. Without it the card is a button and only `onNavigate` fires. */
  href?: string;
}

export interface DocsPagerProps {
  prev?: DocsPagerLink | null;
  next?: DocsPagerLink | null;
  onNavigate?: (direction: DocsPagerDirection, link: DocsPagerLink) => void;
  /** Small label above each title. Hidden when false. */
  showLabels?: boolean;
  prevLabel?: string;
  nextLabel?: string;
  "aria-label"?: string;
  className?: string;
}

export function DocsPager({
  prev,
  next,
  onNavigate,
  showLabels = false,
  prevLabel = "Previous",
  nextLabel = "Next",
  "aria-label": ariaLabel = "Previous and next page",
  className,
}: DocsPagerProps) {
  const refs = useRef<Record<DocsPagerDirection, HTMLElement | null>>({ prev: null, next: null });
  const pendingFocus = useRef<DocsPagerDirection | null>(null);

  // #region critical
  // In button mode the pager re-renders in place with new neighbours. When the
  // card that was clicked disappears (first or last page reached), focus would
  // fall to <body>; hand it to the card that is still there instead.
  useEffect(() => {
    const side = pendingFocus.current;
    if (!side) return;
    pendingFocus.current = null;
    const active = document.activeElement;
    if (active && active !== document.body && active.isConnected) return;
    const other: DocsPagerDirection = side === "prev" ? "next" : "prev";
    (refs.current[side] ?? refs.current[other])?.focus();
  }, [prev?.title, next?.title]);

  const card = (direction: DocsPagerDirection, link: DocsPagerLink) => {
    const isPrev = direction === "prev";
    const Arrow = isPrev ? RiArrowLeftLine : RiArrowRightLine;
    const label = isPrev ? prevLabel : nextLabel;
    const className = cx(
      "group flex min-w-0 flex-col gap-1 rounded-xl border border-border-button-default bg-background-primary-default px-4 py-3.5 shadow-xs outline-none",
      "transition-[background-color,border-color] duration-150 ease-out motion-reduce:transition-none",
      "hover:border-border-button-hover hover:bg-background-secondary-hover",
      "focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background-primary-default",
      isPrev ? "items-start text-start" : "items-end text-end sm:col-start-2",
    );
    const content = (
      <>
        {showLabels ? (
          <span className="text-caption-1-regular text-text-tertiary">{label}</span>
        ) : (
          <span className="sr-only">{label}: </span>
        )}
        <span className={cx("flex max-w-full items-center gap-1.5 text-body-medium text-text-primary", !isPrev && "flex-row-reverse")}>
          <Arrow
            aria-hidden
            className={cx(
              "size-4 shrink-0 text-foreground-icon-secondary transition-transform duration-200 ease-out motion-reduce:transition-none",
              "group-hover:text-foreground-icon-primary",
              isPrev
                ? "group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5"
                : "group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5",
              directionalIconClass(Arrow),
            )}
          />
          <span className="truncate">{link.title}</span>
        </span>
        {link.description ? (
          <span className="max-w-full truncate text-caption-1-regular text-text-tertiary">{link.description}</span>
        ) : null}
      </>
    );
    const setRef = (node: HTMLElement | null) => {
      refs.current[direction] = node;
    };
    const handle = () => {
      pendingFocus.current = direction;
      onNavigate?.(direction, link);
    };
    return link.href ? (
      <a key={direction} ref={setRef} href={link.href} rel={direction} onClick={handle} className={className}>
        {content}
      </a>
    ) : (
      <button key={direction} ref={setRef} type="button" onClick={handle} className={cx(className, "cursor-pointer")}>
        {content}
      </button>
    );
  };
  // #endregion

  if (!prev && !next) return null;

  return (
    <nav aria-label={ariaLabel} className={cx("grid w-full grid-cols-1 gap-3 sm:grid-cols-2", className)}>
      {prev ? card("prev", prev) : null}
      {next ? card("next", next) : null}
    </nav>
  );
}
