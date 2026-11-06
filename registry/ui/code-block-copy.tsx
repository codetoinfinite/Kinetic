/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Code Block" (boardui.com/components/line-chart-card).
 * No BoardUI source was used.
 */
"use client";

import { RiCheckLine, RiFileCopyLine } from "@remixicon/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ButtonHTMLAttributes, Ref } from "react";

import { cx } from "@/registry/lib/cx";

/**
 * Write text to the clipboard. Uses the async Clipboard API when the page is
 * allowed to, and falls back to a hidden textarea + `execCommand("copy")` for
 * insecure origins, embedded iframes and browsers that reject the permission.
 * Resolves to whether the copy actually happened; it never throws.
 */
export async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or not focused: fall through to the legacy path.
  }
  if (typeof document === "undefined") return false;
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  area.style.pointerEvents = "none";
  document.body.appendChild(area);
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  area.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  area.remove();
  previous?.focus({ preventScroll: true });
  return ok;
}

/**
 * `copied` flips true after a successful copy and back to false after
 * `resetMs`. Copying again restarts the window; the timer is cleared on
 * unmount.
 */
export function useCopyToClipboard(resetMs = 1600) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(
    async (text: string) => {
      const ok = await writeClipboard(text);
      if (timer.current) clearTimeout(timer.current);
      setCopied(ok);
      if (ok) timer.current = setTimeout(() => setCopied(false), resetMs);
      return ok;
    },
    [resetMs],
  );

  return { copied, copy };
}

export interface CopyButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "value" | "onCopy" | "children"> {
  /** Text to copy, or a function that produces it at click time. */
  value: string | (() => string);
  /** Accessible name before copying. */
  label?: string;
  /** Accessible name and live-region message after copying. */
  copiedLabel?: string;
  /** How long the check mark stays, in ms. */
  resetMs?: number;
  onCopied?: (text: string) => void;
  ref?: Ref<HTMLButtonElement>;
}

/** 32px square icon button: copy glyph that cross-fades to a check once copied. */
export function CopyButton({
  value,
  label = "Copy code",
  copiedLabel = "Copied",
  resetMs = 1600,
  onCopied,
  className,
  onClick,
  ref,
  ...props
}: CopyButtonProps) {
  const { copied, copy } = useCopyToClipboard(resetMs);

  return (
    <button
      ref={ref}
      type="button"
      aria-label={copied ? copiedLabel : label}
      data-copied={copied || undefined}
      {...props}
      onClick={async (event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        const text = typeof value === "function" ? value() : value;
        if (await copy(text)) onCopied?.(text);
      }}
      className={cx(
        "relative inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg",
        "text-foreground-icon-secondary transition-colors duration-150 ease-out",
        "hover:bg-background-secondary-hover hover:text-foreground-icon-primary",
        "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
        className,
      )}
    >
      <RiFileCopyLine
        aria-hidden
        className={cx(
          "absolute size-[18px] transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none",
          copied ? "scale-50 opacity-0" : "scale-100 opacity-100",
        )}
      />
      <RiCheckLine
        aria-hidden
        className={cx(
          "absolute size-[18px] text-status-lime-text transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none",
          copied ? "scale-100 opacity-100" : "scale-50 opacity-0",
        )}
      />
      <span role="status" className="sr-only">
        {copied ? copiedLabel : ""}
      </span>
    </button>
  );
}
