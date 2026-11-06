/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Pro Access Card" (boardui.com/components/line-chart-card).
 * No BoardUI source was used.
 */
"use client";

import { useId } from "react";
import type { ComponentType, ReactNode } from "react";
import { RiLockLine, RiLockUnlockLine, RiVipCrown2Line } from "@remixicon/react";
import { cx } from "@/registry/lib/cx";
import { Button, ButtonLink } from "@/registry/ui/button";
import { SpinnerGlyph } from "@/registry/ui/spinner";

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

export interface ProAccessCardProps {
  /** Card heading, e.g. "Line Chart Card is a Pro component." */
  title: ReactNode;
  description?: ReactNode;
  /** Pill in the top-right corner while locked. */
  badge?: ReactNode;
  /** Pill text once unlocked. */
  unlockedBadge?: ReactNode;
  /** Replaces the default metallic lock tile. */
  icon?: ReactNode;
  /** The component preview. Blurred, inert and hidden from assistive tech while locked. */
  preview?: ReactNode;
  /** Text over the blurred preview. */
  lockedLabel?: ReactNode;
  /** Whether the preview is veiled. The license state lives outside the card. */
  locked?: boolean;
  footerTitle?: ReactNode;
  footerDescription?: ReactNode;
  /** Footer content shown instead of the call to action once unlocked. */
  unlockedFooter?: ReactNode;
  actionLabel?: ReactNode;
  actionIcon?: IconComponent;
  /** Renders the action as a link. */
  actionHref?: string;
  onAction?: () => void;
  /** Shows a spinner in the action and marks the card busy. */
  pending?: boolean;
  titleAs?: "h2" | "h3" | "h4";
  /** Classes for the preview stage (height, padding). */
  previewClassName?: string;
  className?: string;
}

/** Brushed-metal lock tile. The gradients are artwork, so they stay fixed in both themes. */
export function ProLockTile({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 56 56" aria-hidden className={cx("size-14 shrink-0 drop-shadow-sm", className)}>
      <defs>
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f5f5f5" />
          <stop offset="0.38" stopColor="#a3a3a3" />
          <stop offset="0.62" stopColor="#e5e5e5" />
          <stop offset="1" stopColor="#737373" />
        </linearGradient>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d4d4d4" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="54" height="54" rx="14" fill={`url(#${id}-metal)`} stroke="#525252" strokeOpacity="0.35" />
      <rect x="2.5" y="2.5" width="51" height="51" rx="12.5" fill="none" stroke="#ffffff" strokeOpacity="0.6" />
      <path d="M20 26v-5a8 8 0 0 1 16 0v5" fill="none" stroke="#f5f5f5" strokeWidth="4" strokeLinecap="round" />
      <path d="M20 26v-5a8 8 0 0 1 16 0v5" fill="none" stroke="#737373" strokeOpacity="0.5" strokeWidth="1" strokeLinecap="round" />
      <rect x="13" y="25" width="30" height="20" rx="6" fill={`url(#${id}-body)`} stroke="#737373" strokeOpacity="0.45" />
      <circle cx="28" cy="33.5" r="3" fill="#525252" />
      <rect x="26.75" y="34" width="2.5" height="5" rx="1.25" fill="#525252" />
    </svg>
  );
}

export function ProAccessCard({
  title,
  description,
  badge = "Pro access",
  unlockedBadge = "Unlocked",
  icon,
  preview,
  lockedLabel = "Preview locked",
  locked = true,
  footerTitle = "This component is included in Pro",
  footerDescription,
  unlockedFooter,
  actionLabel = "Get access",
  actionIcon = RiVipCrown2Line,
  actionHref,
  onAction,
  pending = false,
  titleAs: Title = "h3",
  previewClassName,
  className,
}: ProAccessCardProps) {
  const titleId = useId();
  const ActionIcon = pending ? undefined : actionIcon;
  const actionContent = (
    <>
      {pending ? <SpinnerGlyph size="sm" className="me-1 text-text-secondary" /> : null}
      {actionLabel}
    </>
  );

  // #region critical
  // The veil: blur + desaturate + inert while locked, so the preview teases
  // the component but cannot be tabbed into, clicked or read out. Unlocking
  // transitions filter, opacity and scale back to identity in one 500ms pass,
  // while the lock chip fades out over 300ms and then turns `invisible`.
  const veilClass = cx(
    "origin-center transition-[filter,opacity,scale] duration-500 ease-out motion-reduce:transition-none",
    locked ? "pointer-events-none scale-[1.03] opacity-60 blur-[6px] saturate-50 select-none" : "blur-none",
    previewClassName ?? "p-3 sm:p-6",
  );
  const overlayClass = cx(
    "absolute inset-0 flex items-center justify-center bg-background-primary-default/30",
    "transition-[opacity,visibility] duration-300 ease-out motion-reduce:transition-none",
    locked ? "visible opacity-100" : "invisible opacity-0",
  );
  // #endregion

  return (
    <section
      aria-labelledby={titleId}
      aria-busy={pending || undefined}
      data-locked={locked ? "" : undefined}
      className={cx(
        "flex w-full flex-col overflow-hidden rounded-3xl border border-border-component-detail-container bg-background-primary-default",
        className,
      )}
    >
      <header className="flex items-start gap-3 p-4 sm:gap-4 sm:p-6">
        {icon ?? <ProLockTile className="size-10 sm:size-14" />}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <Title id={titleId} className="min-w-0 grow basis-56 text-title-3-medium text-text-primary">
              {title}
            </Title>
            <span
              className={cx(
                "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-caption-2-semibold tracking-[0.04em] uppercase",
                "transition-colors duration-300 ease-out motion-reduce:transition-none",
                locked
                  ? "border-border-component-detail-container bg-background-secondary-default text-text-secondary"
                  : "border-transparent bg-state-success-base text-state-success-text",
              )}
            >
              {locked ? null : <RiLockUnlockLine aria-hidden className="size-3" />}
              {locked ? badge : unlockedBadge}
            </span>
          </div>
          {description ? <p className="text-body-regular text-text-secondary">{description}</p> : null}
        </div>
      </header>

      <div className="flex flex-col gap-1 border-t border-border-component-detail-container bg-background-secondary-default p-1">
        {preview ? (
          <div className="relative isolate overflow-hidden rounded-[20px] bg-background-primary-default">
            <div
              data-preview
              inert={locked}
              aria-hidden={locked || undefined}
              className={veilClass}
            >
              {preview}
            </div>
            <div aria-hidden={!locked} className={overlayClass}>
              <span className="inline-flex items-center gap-2 rounded-full border border-border-component-detail-container bg-background-primary-default py-1.5 ps-1.5 pe-3 text-body-medium text-text-primary shadow-sm">
                <span className="flex size-7 items-center justify-center rounded-full bg-background-secondary-default">
                  <RiLockLine aria-hidden className="size-4 text-foreground-icon-secondary" />
                </span>
                {lockedLabel}
              </span>
            </div>
          </div>
        ) : null}

        <div aria-live="polite" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-5">
          {locked || !unlockedFooter ? (
            <>
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-body-medium text-text-secondary">{footerTitle}</p>
                {footerDescription ? <p className="text-caption-1-regular text-text-tertiary">{footerDescription}</p> : null}
              </div>
              {locked ? (
                actionHref ? (
                  <ButtonLink href={actionHref} variant="secondary" size="small" leadingIcon={ActionIcon} onClick={onAction}>
                    {actionContent}
                  </ButtonLink>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    leadingIcon={ActionIcon}
                    onClick={pending ? undefined : onAction}
                    aria-disabled={pending || undefined}
                  >
                    {actionContent}
                  </Button>
                )
              ) : null}
            </>
          ) : (
            unlockedFooter
          )}
        </div>
      </div>
    </section>
  );
}
