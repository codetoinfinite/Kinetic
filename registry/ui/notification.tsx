/*
 * Adapted from BoardUI — https://github.com/BoardUI/boardui (components/base/notification/notification.tsx)
 * Copyright (c) 2026 Mertcan Dundar Esmergul (BoardUI). MIT License.
 * SPDX-License-Identifier: MIT
 */
"use client";

import { useDirection } from "@/registry/lib/direction";
import type {
  ComponentType,
  HTMLAttributes,
  ReactNode,
  Ref,
} from "react";
import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { useUNSAFE_PortalContext } from "react-aria";
import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
  RiInformationFill,
  RiNotification3Fill,
} from "@remixicon/react";
import { AnimatePresence, motion } from "motion/react";
import { Avatar, type AvatarProps } from "@/registry/ui/avatar";
import { Button, type ButtonProps } from "@/registry/ui/button";
import { CloseButton } from "@/registry/ui/close-button";
import { cx, sortCx } from "@/registry/lib/cx";

export type NotificationStatus = "neutral" | "information" | "success" | "error";

export type NotificationPosition =
  | "top-start"
  | "top-end"
  | "bottom-start"
  | "bottom-end"
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

type IconComponent = ComponentType<{
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

export type NotificationAvatar = Omit<AvatarProps, "size"> & {
  presence?: "online" | "busy" | "offline";
};

export type NotificationAction = {
  label: ReactNode;
  onClick?: () => void;
  variant?: ButtonProps["variant"];
};

export interface NotificationProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    | "title"
    | "onDrag"
    | "onDragStart"
    | "onDragEnd"
    | "onAnimationStart"
    | "onAnimationEnd"
  > {
  title: ReactNode;
  description?: ReactNode;
  timestamp?: ReactNode;
  status?: NotificationStatus;
  /** Custom leading icon. Defaults to the icon associated with `status`. */
  icon?: IconComponent;
  /** Avatar leading visual. When set, it takes precedence over `icon`. */
  avatar?: NotificationAvatar;
  /** Optional small BoardUI action buttons rendered below the message. */
  actions?: NotificationAction[];
  dismissible?: boolean;
  closeLabel?: string;
  /** Called after the dismiss animation completes. */
  onDismiss?: () => void;
  /**
   * Called when the card dismisses itself (close button or countdown), as its
   * exit starts. A parent that keeps its own list, like Toaster, marks the item
   * as leaving here. Not called for the `dismissed` prop.
   */
  onDismissStart?: () => void;
  /**
   * Automatically dismiss after this many milliseconds. A 3px blue countdown
   * bar is rendered along the full bottom edge for the same duration.
   */
  autoDismissDuration?: number;
  /**
   * Hold the auto-dismiss countdown and its bar, e.g. while the pointer or
   * focus is in a toast stack. The countdown resumes where it stopped.
   */
  paused?: boolean;
  /** Dismiss from outside: plays the exit animation, then calls `onDismiss`. */
  dismissed?: boolean;
  /** Optional entrance delay in seconds. */
  introDelay?: number;
  ref?: Ref<HTMLDivElement>;
}

export interface NotificationViewportProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    | "children"
    | "onDrag"
    | "onDragStart"
    | "onDragEnd"
    | "onAnimationStart"
    | "onAnimationEnd"
  > {
  children?: ReactNode;
  /** Edge or corner where the notification stack is anchored. */
  position?: NotificationPosition;
  /** @deprecated Use `position` instead. */
  placement?: Extract<NotificationPosition, "bottom-left" | "bottom-right">;
}

const STATUS_ICON: Record<NotificationStatus, IconComponent> = {
  neutral: RiNotification3Fill,
  information: RiInformationFill,
  success: RiCheckboxCircleFill,
  error: RiErrorWarningFill,
};

const styles = sortCx({
  card: [
    "relative flex w-full items-start gap-3 overflow-hidden p-4 pe-11",
    "rounded-2xl border border-border-button-default",
    "bg-background-primary-default shadow-dropdown",
  ].join(" "),
  visual: "relative flex size-10 shrink-0 items-center justify-center rounded-full",
  icon: "size-5",
  content: "flex min-w-0 flex-1 flex-col gap-1",
  header: "flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5",
  title: "text-body-medium text-text-primary",
  timestamp: "text-body-regular text-text-tertiary",
  description: "text-body-regular text-text-secondary",
  actions: "mt-1.5 flex flex-wrap items-center gap-2",
  close: "absolute top-3 end-3",
  status: {
    neutral: "bg-background-tertiary-default text-text-secondary",
    information:
      "bg-notification-information-background text-notification-information-foreground",
    success:
      "bg-notification-success-background text-notification-success-foreground",
    error:
      "bg-notification-error-background text-notification-error-foreground",
  },
  presence: {
    online: "bg-lime-500",
    busy: "bg-rose-500",
    offline: "bg-background-quaternary-hover",
  },
});

const VIEWPORT_POSITION = {
  "top-start": "top-3 start-3 items-start sm:top-6 sm:start-6",
  "top-end": "top-3 end-3 items-end sm:top-6 sm:end-6",
  "bottom-start": "bottom-3 start-3 items-start sm:bottom-6 sm:start-6",
  "bottom-end": "end-3 bottom-3 items-end sm:end-6 sm:bottom-6",
  "top-left": "top-3 left-3 items-start sm:top-6 sm:left-6",
  "top-center": "top-3 left-1/2 -translate-x-1/2 items-center sm:top-6",
  "top-right": "top-3 right-3 items-end sm:top-6 sm:right-6",
  "bottom-left": "bottom-3 left-3 items-start sm:bottom-6 sm:left-6",
  "bottom-center":
    "bottom-3 left-1/2 -translate-x-1/2 items-center sm:bottom-6",
  "bottom-right": "right-3 bottom-3 items-end sm:right-6 sm:bottom-6",
} satisfies Record<NotificationPosition, string>;

const subscribeToHydration = () => () => {};

function NotificationAvatarVisual({
  presence,
  className,
  ...avatar
}: NotificationAvatar) {
  return (
    <span className="relative shrink-0">
      <Avatar
        {...avatar}
        size="lg"
        className={cx("size-10", className)}
      />
      {presence ? (
        <span
          aria-hidden
          className={cx(
            "absolute end-0 bottom-0 size-3 rounded-full border-2 border-background-primary-default",
            styles.presence[presence],
          )}
        />
      ) : null}
    </span>
  );
}

// #region critical
export function Notification({
  title,
  description,
  timestamp,
  status = "neutral",
  icon,
  avatar,
  actions,
  dismissible = true,
  closeLabel = "Dismiss notification",
  onDismiss,
  onDismissStart,
  autoDismissDuration,
  paused = false,
  dismissed: dismissedProp = false,
  introDelay,
  className,
  ref,
  role,
  ...props
}: NotificationProps) {
  const [dismissedState, setDismissed] = useState(false);
  const dismissed = dismissedProp || dismissedState;
  // The countdown can fire long after the render that scheduled it, so it
  // reads the latest callback.
  const onDismissStartRef = useRef(onDismissStart);
  useEffect(() => {
    onDismissStartRef.current = onDismissStart;
  });
  // While a card exits, AnimatePresence keeps rendering its last element,
  // whose close button still holds this handler. The ref makes a second press
  // (or the countdown) during the exit a no-op instead of a second
  // onDismissStart.
  const dismissedRef = useRef(dismissed);
  useEffect(() => {
    dismissedRef.current = dismissed;
  });
  const dismiss = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setDismissed(true);
    onDismissStartRef.current?.();
  };
  const Icon = icon ?? STATUS_ICON[status];
  const hasIntro = introDelay !== undefined;
  const introDelayMs = (introDelay ?? 0) * 1000;
  const timed = Boolean(autoDismissDuration && autoDismissDuration > 0);

  // The countdown bar runs as one native Web Animation so `paused` can hold
  // and resume it in step with the timer below. (Motion's standalone
  // animate() on this child cancelled the card's own enter animation.)
  const barRef = useRef<HTMLSpanElement>(null);
  const bar = useRef<Animation | null>(null);
  const remaining = useRef((autoDismissDuration ?? 0) + introDelayMs);

  useEffect(() => {
    const element = barRef.current;
    if (!timed || !element) return;
    bar.current = element.animate(
      [{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }],
      { duration: autoDismissDuration, delay: introDelayMs, easing: "linear", fill: "forwards" },
    );
    return () => bar.current?.cancel();
  }, [timed, autoDismissDuration, introDelayMs]);

  useEffect(() => {
    if (!timed || dismissed) return;
    if (paused) {
      bar.current?.pause();
      return;
    }
    bar.current?.play();
    const startedAt = performance.now();
    const timer = window.setTimeout(dismiss, remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (performance.now() - startedAt));
    };
  }, [timed, paused, dismissed]);

  return (
    <AnimatePresence onExitComplete={onDismiss}>
      {!dismissed ? (
        <motion.div
          ref={ref}
          role={role ?? (status === "error" ? "alert" : "status")}
          initial={
            hasIntro
              ? { opacity: 0, y: 12, scale: 0.97, filter: "blur(4px)" }
              : false
          }
          animate={
            hasIntro
              ? {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  filter: "blur(0px)",
                  transition: {
                    duration: 0.25,
                    delay: introDelay,
                    ease: "easeOut",
                  },
                }
              : undefined
          }
          exit={{
            opacity: 0,
            y: 8,
            scale: 0.96,
            filter: "blur(3px)",
            transition: { duration: 0.18, ease: "easeOut" },
          }}
          className={cx(styles.card, className)}
          {...props}
        >
          {avatar ? (
            <NotificationAvatarVisual {...avatar} />
          ) : (
            <span className={cx(styles.visual, styles.status[status])}>
              <Icon className={styles.icon} aria-hidden />
            </span>
          )}

          <div className={styles.content}>
            <div className={styles.header}>
              <p className={styles.title}>{title}</p>
              {timestamp ? <span className={styles.timestamp}>{timestamp}</span> : null}
            </div>
            {description ? <p className={styles.description}>{description}</p> : null}

            {actions?.length ? (
              <div className={styles.actions}>
                {actions.map((action, index) => (
                  <Button
                    key={index}
                    size="small"
                    variant={action.variant ?? (index === 0 ? "secondary" : "primary")}
                    onClick={action.onClick}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>

          {dismissible ? (
            <CloseButton
              size="xs"
              aria-label={closeLabel}
              onClick={dismiss}
              className={styles.close}
            />
          ) : null}

          {timed ? (
            <span
              ref={barRef}
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-[3px] origin-left rtl:origin-right bg-accent-600"
            />
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// #endregion

/**
 * Viewport-level notification region. Anchor the stack to any corner or
 * horizontal center with `position`; children with stable keys move smoothly
 * as notifications enter and leave.
 */
export function NotificationViewport({
  children,
  position,
  placement,
  className,
  "aria-label": ariaLabel = "Notifications",
  ...props
}: NotificationViewportProps) {
  const direction = useDirection();
  // A host can send overlays to its own container (Kinetic's preview frame
  // does, because it clips fixed children); otherwise document.body.
  const { getContainer } = useUNSAFE_PortalContext();
  const resolvedPosition = position ?? placement ?? "bottom-end";
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      layoutRoot
      dir={direction}
      aria-label={ariaLabel}
      className={cx(
        "pointer-events-none fixed z-100 flex w-[min(400px,calc(100vw-24px))] flex-col gap-3",
        VIEWPORT_POSITION[resolvedPosition],
        className,
      )}
      {...props}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {Children.toArray(children).map((child, index) => (
          <motion.div
            layout
            key={isValidElement(child) && child.key !== null ? child.key : index}
            className="pointer-events-auto w-full"
            transition={{
              layout: {
                type: "spring",
                stiffness: 520,
                damping: 42,
                mass: 0.7,
              },
            }}
          >
            {child}
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>,
    getContainer?.() ?? document.body,
  );
}
