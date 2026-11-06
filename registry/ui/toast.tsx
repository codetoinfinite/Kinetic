/*
 * Adapted from BoardUI — https://github.com/BoardUI/boardui (components/base/toast/toast.tsx)
 * Copyright (c) 2026 Mertcan Dundar Esmergul (BoardUI). MIT License.
 * SPDX-License-Identifier: MIT
 */
"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { ComponentType, ReactNode } from "react";
import {
  Notification,
  NotificationViewport,
  type NotificationAction,
  type NotificationAvatar,
  type NotificationPosition,
  type NotificationStatus,
} from "@/registry/ui/notification";
import { cx } from "@/registry/lib/cx";

/**
 * Toast — fire-and-forget notifications from anywhere in the app:
 *
 *   toast.success("Changes saved");
 *   toast.error("Upload failed", { description: "The file is over 20MB." });
 *   const id = toast("Exporting…", { duration: Infinity });
 *   toast.update(id, { title: "Export ready", status: "success", duration: 4000 });
 *   toast.dismiss(id);
 *
 * Render one <Toaster /> near the root of the app. It draws each toast as a
 * Notification card inside a NotificationViewport, so toasts share the
 * card, status icons, countdown bar, enter and exit motion, and the spring
 * that closes the stack's gaps. Extra Toasters render nothing, so a second
 * one in a nested layout never doubles every toast.
 *
 * The region is a polite live region (errors are announced as alerts). Every
 * countdown pauses while the pointer or keyboard focus is inside the stack,
 * so nobody loses a toast while reading it or reaching for its action.
 */

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

export type ToastId = string | number;

export interface ToastOptions {
  /** Reuse an id to replace a toast that is still showing. */
  id?: ToastId;
  description?: ReactNode;
  status?: NotificationStatus;
  /** Custom leading icon; defaults to the status icon. */
  icon?: IconComponent;
  avatar?: NotificationAvatar;
  /** Small buttons under the message. Pressing one also dismisses the toast. */
  actions?: NotificationAction[];
  /** Milliseconds before it dismisses itself; `Infinity` keeps it until closed. Default from the Toaster (5000). */
  duration?: number;
  /** Show the close button. Default true. */
  dismissible?: boolean;
  /** Called once the toast has left the screen. */
  onDismiss?: () => void;
}

interface ToastRecord extends ToastOptions {
  id: ToastId;
  title: ReactNode;
  dismissed: boolean;
  /** Internal card key: unique per card, unlike `id`, which callers choose. */
  key: number;
}

/* -------------------------------------------------------------------- store */

let toasts: ToastRecord[] = [];
let nextId = 1;
let nextKey = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Generated ids skip any id a caller has already given a toast that is in the store.
function generateId(): ToastId {
  let id = nextId++;
  while (toasts.some((item) => item.id === id)) id = nextId++;
  return id;
}

function show(title: ReactNode, options: ToastOptions = {}): ToastId {
  const id = options.id ?? generateId();
  // A toast that is still showing is changed in place. If the id only
  // belongs to one that is leaving, the new toast gets its own card at the
  // end of the stack, and the leaving record stays until its exit finishes,
  // so that card still plays out and its onDismiss still fires.
  const showing = toasts.find((item) => item.id === id && !item.dismissed);
  const record: ToastRecord = { ...options, id, title, dismissed: false, key: showing ? showing.key : nextKey++ };
  toasts = showing ? toasts.map((item) => (item === showing ? record : item)) : [...toasts, record];
  emit();
  return id;
}

// Called by a card once its exit has finished. It removes that card's record
// only, never a newer toast that has since taken the same id.
function remove(key: number) {
  const record = toasts.find((item) => item.key === key);
  if (!record) return;
  toasts = toasts.filter((item) => item !== record);
  emit();
  record.onDismiss?.();
}

// Dismisses one card by its key. A card that is leaving keeps its old
// handlers until its exit ends; by key, a press on it can never dismiss a
// newer toast that has taken the same id.
function dismissCard(key: number) {
  if (!toasts.some((item) => item.key === key && !item.dismissed)) return;
  toasts = toasts.map((item) => (item.key === key ? { ...item, dismissed: true } : item));
  emit();
}

/** Show a toast. Returns its id, for `toast.update` and `toast.dismiss`. */
export function toast(title: ReactNode, options?: ToastOptions): ToastId {
  return show(title, options);
}

toast.success = (title: ReactNode, options?: Omit<ToastOptions, "status">) => show(title, { ...options, status: "success" });
toast.error = (title: ReactNode, options?: Omit<ToastOptions, "status">) => show(title, { ...options, status: "error" });
toast.info = (title: ReactNode, options?: Omit<ToastOptions, "status">) => show(title, { ...options, status: "information" });

/** Change a toast that is showing. A new `duration` restarts its countdown. */
toast.update = (id: ToastId, options: ToastOptions & { title?: ReactNode }) => {
  const current = toasts.find((item) => item.id === id && !item.dismissed);
  if (!current) return;
  const { title = current.title, ...rest } = options;
  show(title, { ...current, ...rest, id });
};

/** Dismiss one toast, or every toast when called without an id. */
toast.dismiss = (id?: ToastId) => {
  toasts = toasts.map((item) => (id === undefined || item.id === id ? { ...item, dismissed: true } : item));
  emit();
};

/* ------------------------------------------------------------------ toaster */

// Only the first mounted Toaster draws the stack; the rest stand by and take
// over if it unmounts.
let owners: string[] = [];
const ownerListeners = new Set<() => void>();

function subscribeOwners(listener: () => void) {
  ownerListeners.add(listener);
  return () => {
    ownerListeners.delete(listener);
  };
}

export interface ToasterProps {
  /** Edge or corner the stack is anchored to. Default `bottom-end`. */
  position?: NotificationPosition;
  /** How many toasts show at once; older ones leave as new ones arrive. Default 3. */
  limit?: number;
  /** Default countdown in milliseconds. Default 5000. */
  duration?: number;
  /** Accessible name of the region. */
  "aria-label"?: string;
  /** Accessible name of each toast's close button. */
  closeLabel?: string;
  className?: string;
}

// #region critical
export function Toaster({
  position = "bottom-end",
  limit = 3,
  duration = 5000,
  "aria-label": ariaLabel = "Notifications",
  closeLabel,
  className,
}: ToasterProps) {
  const ownerId = useId();
  const items = useSyncExternalStore(subscribe, () => toasts, () => toasts);
  const isOwner = useSyncExternalStore(subscribeOwners, () => owners[0] === ownerId, () => false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const viewport = useRef<HTMLElement | null>(null);

  useEffect(() => {
    owners = [...owners, ownerId];
    ownerListeners.forEach((listener) => listener());
    return () => {
      owners = owners.filter((owner) => owner !== ownerId);
      ownerListeners.forEach((listener) => listener());
    };
  }, [ownerId]);

  // Toasts that were already leaving when this Toaster took over (the last
  // one unmounted mid-exit, or none was mounted) have no card to finish an
  // exit, so they are removed here and their onDismiss fires. Once per
  // takeover; the ref keeps a StrictMode re-run from sweeping toasts the
  // limit below has just started to dismiss.
  const swept = useRef(false);
  useEffect(() => {
    if (!isOwner) {
      swept.current = false;
      return;
    }
    if (swept.current) return;
    swept.current = true;
    for (const item of toasts) if (item.dismissed) remove(item.key);
  }, [isOwner]);

  // Past the limit, the oldest toasts play their exit and make room.
  useEffect(() => {
    if (!isOwner) return;
    const active = items.filter((item) => !item.dismissed);
    if (active.length > limit) {
      const overflow = new Set(active.slice(0, active.length - limit).map((item) => item.id));
      toasts = toasts.map((item) => (overflow.has(item.id) ? { ...item, dismissed: true } : item));
      emit();
    }
  }, [items, limit, isOwner]);

  // A toast removed from under the pointer or focus fires no leave or blur,
  // so an emptied stack resets both, or the next toast would start paused.
  const empty = items.length === 0;
  const [wasEmpty, setWasEmpty] = useState(empty);
  if (empty !== wasEmpty) {
    setWasEmpty(empty);
    if (empty) {
      setHovered(false);
      setFocused(false);
    }
  }

  // A card removed while it held focus (its close button, say) fires no
  // blur either. Once the stack has changed, check where focus went, or the
  // remaining countdowns would stay paused.
  useEffect(() => {
    if (!focused) return;
    const frame = requestAnimationFrame(() => {
      if (!viewport.current?.contains(document.activeElement)) setFocused(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [items, focused]);

  if (!isOwner) return null;

  return (
    <NotificationViewport
      position={position}
      aria-label={ariaLabel}
      role="region"
      aria-live="polite"
      aria-relevant="additions text"
      className={cx("z-130", className)}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={(event) => {
        viewport.current = event.currentTarget;
        setFocused(true);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      {items.map((item) => {
        const timeout = item.duration ?? duration;
        return (
          <Notification
            // A new duration remounts the card, so its countdown restarts.
            key={`${item.key}:${timeout}`}
            title={item.title}
            description={item.description}
            status={item.status}
            icon={item.icon}
            avatar={item.avatar}
            dismissible={item.dismissible ?? true}
            closeLabel={closeLabel}
            actions={item.actions?.map((action) => ({
              ...action,
              onClick: () => {
                action.onClick?.();
                dismissCard(item.key);
              },
            }))}
            autoDismissDuration={Number.isFinite(timeout) && timeout > 0 ? timeout : undefined}
            paused={hovered || focused}
            dismissed={item.dismissed}
            introDelay={0}
            onDismissStart={() => dismissCard(item.key)}
            onDismiss={() => remove(item.key)}
          />
        );
      })}
    </NotificationViewport>
  );
}
// #endregion
