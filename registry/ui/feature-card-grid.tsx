/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Feature Card Grid" (boardui.com/).
 * No BoardUI source was used.
 */
"use client";

import { useState } from "react";
import type { FocusEvent, MouseEventHandler, ReactNode } from "react";
import { cx } from "@/registry/lib/cx";

export interface FeatureCardState {
  /** True while the card is hovered or holds keyboard focus. */
  active: boolean;
}

export interface FeatureCardProps {
  title: ReactNode;
  description?: ReactNode;
  /** Artwork in the top area; a function receives `{ active }` so it can react to hover. */
  illustration?: ReactNode | ((state: FeatureCardState) => ReactNode);
  /** Turns the whole card into a link. */
  href?: string;
  onClick?: MouseEventHandler<HTMLElement>;
  /** Columns spanned from the two-column breakpoint up. */
  span?: 1 | 2;
  className?: string;
}

// #region critical
/**
 * One tile of the grid. Hover and focus-within raise an `active` flag that is
 * handed to the illustration, so artwork built from kit parts can play a
 * small state change (a bar fills, a switch flips, a step completes) instead
 * of the whole card merely brightening. The artwork is `inert` and hidden from
 * assistive tech: it is a picture of a component, not a working one.
 */
export function FeatureCard({ title, description, illustration, href, onClick, span = 1, className }: FeatureCardProps) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const active = hovered || focused;
  const art = typeof illustration === "function" ? illustration({ active }) : illustration;

  const onBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
  };

  const body = (
    <>
      <div
        aria-hidden="true"
        inert
        className="relative h-[196px] overflow-hidden mask-b-from-75% mask-b-to-100%"
      >
        <div
          className={cx(
            "h-full w-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            active && "-translate-y-1 motion-reduce:translate-y-0",
          )}
        >
          {art}
        </div>
      </div>
      <div className="flex flex-col gap-1 px-5 pt-3 pb-5">
        <h3 className="text-headline-medium text-text-primary">{title}</h3>
        {description ? (
          <p className="line-clamp-2 text-body-regular text-text-tertiary">{description}</p>
        ) : null}
      </div>
    </>
  );

  const shared = {
    "data-active": active ? "true" : "false",
    onPointerEnter: () => setHovered(true),
    onPointerLeave: () => setHovered(false),
    onFocus: () => setFocused(true),
    onBlur,
    onClick,
    className: cx(
      "group/feature relative flex flex-col overflow-hidden rounded-3xl border bg-background-primary-default text-start",
      "border-border-button-default shadow-xs transition-[border-color,box-shadow] duration-200 ease-out",
      "hover:border-border-button-hover hover:shadow-md",
      "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background-full",
      span === 2 && "@xl/features:col-span-2",
      className,
    ),
  };

  return href ? (
    <a href={href} {...shared}>
      {body}
    </a>
  ) : (
    <article {...shared}>{body}</article>
  );
}
// #endregion

export interface FeatureCardGridProps {
  /** Small line above the title, e.g. an install command. */
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** `FeatureCard` elements. */
  children: ReactNode;
  className?: string;
}

export function FeatureCardGrid({ eyebrow, title, description, actions, children, className }: FeatureCardGridProps) {
  const hasHeader = Boolean(eyebrow || title || description || actions);
  return (
    <section className={cx("@container/features w-full", className)}>
      <div className="mx-auto flex w-full max-w-[1280px] flex-col px-4 @3xl/features:px-8">
        {hasHeader ? (
          <header className="mx-auto mb-12 flex max-w-[640px] flex-col items-center text-center">
            {eyebrow ? <div className="mb-5">{eyebrow}</div> : null}
            {title ? (
              <h2 className="text-display-4-semibold tracking-[-0.03em] text-balance text-text-primary @3xl/features:text-display-2-semibold">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-4 max-w-[460px] text-headline-regular text-pretty text-text-secondary">{description}</p>
            ) : null}
            {actions ? <div className="mt-7 flex flex-wrap items-center justify-center gap-2">{actions}</div> : null}
          </header>
        ) : null}
        <div className="grid grid-cols-1 gap-4 @xl/features:grid-cols-2 @4xl/features:grid-cols-3 @6xl/features:grid-cols-4 @6xl/features:gap-6">
          {children}
        </div>
      </div>
    </section>
  );
}
