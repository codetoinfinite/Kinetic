/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Docs Callout" (boardui.com/components/typography).
 * No BoardUI source was used.
 */
"use client";

import { useEffect, useId, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { RiAlertLine, RiInformation2Line, RiLightbulbFlashLine, RiSpam2Line } from "@remixicon/react";
import { cx } from "@/registry/lib/cx";
import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";
import { CloseButton } from "@/registry/ui/close-button";

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

export type DocsCalloutVariant = "info" | "tip" | "warning" | "danger";

const VARIANTS: Record<DocsCalloutVariant, { label: string; icon: IconComponent; surface: string; chip: string }> = {
  info: {
    label: "Note",
    icon: RiInformation2Line,
    surface: "border-status-blue-text/20 bg-status-blue-background/45",
    chip: "bg-status-blue-background text-status-blue-text",
  },
  tip: {
    label: "Tip",
    icon: RiLightbulbFlashLine,
    surface: "border-status-lime-text/20 bg-status-lime-background/45",
    chip: "bg-status-lime-background text-status-lime-text",
  },
  warning: {
    label: "Warning",
    icon: RiAlertLine,
    surface: "border-status-yellow-text/25 bg-status-yellow-background/45",
    chip: "bg-status-yellow-background text-status-yellow-text",
  },
  danger: {
    label: "Danger",
    icon: RiSpam2Line,
    surface: "border-status-rose-text/20 bg-status-rose-background/45",
    chip: "bg-status-rose-background text-status-rose-text",
  },
};

/** Inline markup inside the body: links, code and paragraph spacing. */
const BODY =
  "text-body-regular text-text-secondary [&_a]:font-medium [&_a]:text-text-primary [&_a]:underline [&_a]:underline-offset-2 [&_code]:rounded-md [&_code]:bg-background-primary-default/70 [&_code]:px-1 [&_code]:py-px [&_code]:font-mono [&_code]:text-caption-1-medium [&_code]:text-text-primary [&_p+p]:mt-2";

const LEAVE_MS = 200;

export interface DocsCalloutProps {
  variant?: DocsCalloutVariant;
  /** Heading. Defaults to the variant label ("Note", "Tip", "Warning", "Danger"). */
  title?: ReactNode;
  children?: ReactNode;
  /** Replaces the variant icon; `null` hides it. */
  icon?: IconComponent | null;
  /** Shows a close button; the callout collapses and unmounts when pressed. */
  dismissible?: boolean;
  /** Called as soon as the close button is pressed, before the exit animation. Move focus here. */
  onDismiss?: () => void;
  /** Accessible name of the close button. Defaults to "Dismiss <label>". */
  dismissLabel?: string;
  /** Classes for the outer wrapper (spacing, grid placement). */
  className?: string;
}

export function DocsCallout({
  variant = "info",
  title,
  children,
  icon,
  dismissible = false,
  onDismiss,
  dismissLabel,
  className,
}: DocsCalloutProps) {
  const v = VARIANTS[variant];
  const Icon = icon === undefined ? v.icon : icon;
  const titleId = useId();
  const reduced = useReducedMotion();

  // #region critical
  // Dismiss: "shown" -> "leaving" (row collapses 1fr -> 0fr while fading, content inert)
  // -> "gone" (unmounted). Reduced motion skips straight to "gone". onDismiss runs on
  // press so the caller can move focus before the close button disappears.
  const [phase, setPhase] = useState<"shown" | "leaving" | "gone">("shown");

  useEffect(() => {
    if (phase !== "leaving") return;
    const t = window.setTimeout(() => setPhase("gone"), LEAVE_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  const dismiss = () => {
    if (phase !== "shown") return;
    onDismiss?.();
    setPhase(reduced ? "gone" : "leaving");
  };

  const leaving = phase === "leaving";
  const wrapperClass = cx(
    "grid transition-[grid-template-rows,opacity,translate] duration-200 ease-out motion-reduce:transition-none",
    leaving ? "-translate-y-1 grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100",
    className,
  );
  // #endregion

  if (phase === "gone") return null;

  return (
    <div data-phase={phase} inert={leaving} className={wrapperClass}>
      <div className={cx("min-h-0", leaving && "overflow-hidden")}>
        <div
          role="note"
          aria-labelledby={titleId}
          data-variant={variant}
          className={cx("flex items-start gap-3 rounded-2xl border p-4", v.surface)}
        >
          {Icon ? (
            <span className={cx("flex size-6 shrink-0 items-center justify-center rounded-lg", v.chip)}>
              <Icon aria-hidden className="size-4" />
            </span>
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
            <p id={titleId} className="text-body-semibold text-text-primary">
              {title !== undefined ? <span className="sr-only">{v.label}: </span> : null}
              {title ?? v.label}
            </p>
            {children ? <div className={BODY}>{children}</div> : null}
          </div>
          {dismissible ? (
            <CloseButton
              size="sm"
              aria-label={dismissLabel ?? `Dismiss ${v.label.toLowerCase()}`}
              onClick={dismiss}
              className="-me-1 shrink-0"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
