/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Quick Search Button" (boardui.com/).
 * No BoardUI source was used.
 */
"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import type { Key } from "react-aria-components";
import { RiSearchLine } from "@remixicon/react";
import { cx } from "@/registry/lib/cx";
import { CommandPalette } from "@/registry/ui/command-palette";
import { Kbd } from "@/registry/ui/kbd";

export interface QuickSearchButtonProps {
  /** Trigger text. */
  label?: string;
  /** Letter that opens the palette together with ⌘ or Ctrl. */
  shortcutKey?: string;
  /** Placeholder of the palette input. */
  placeholder?: string;
  /** Accessible name of the palette dialog. */
  paletteLabel?: string;
  /** Called with the id of the item that was run, after the palette closes. */
  onAction?: (key: Key) => void;
  /** CommandPaletteSection / CommandPaletteItem elements. */
  children: ReactNode;
  className?: string;
}

const noop = () => () => {};
const isApple = () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

// #region critical
export function QuickSearchButton({
  label = "Search...",
  shortcutKey = "k",
  placeholder,
  paletteLabel = "Search",
  onAction,
  children,
  className,
}: QuickSearchButtonProps) {
  const [open, setOpen] = useState(false);
  // The query is controlled here: the palette only clears it when it opens itself, and here it is opened from outside.
  const [query, setQuery] = useState("");
  // Server and first hydration render use the Mac glyph; the real platform lands right after without a mismatch.
  const apple = useSyncExternalStore(noop, isApple, () => true);
  const key = shortcutKey.toLowerCase();

  // One global listener for ⌘K / Ctrl+K. It toggles, so the same chord closes an open palette.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      if (event.key.toLowerCase() !== key || event.repeat) return;
      event.preventDefault();
      setQuery("");
      setOpen((current) => !current);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setQuery("");
          setOpen(true);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-keyshortcuts={`${apple ? "Meta" : "Control"}+${key.toUpperCase()}`}
        className={cx(
          "group inline-flex h-9 w-full max-w-64 min-w-0 cursor-pointer items-center gap-2 rounded-xl bg-background-primary-default pr-1.5 pl-3 text-start shadow-xs ring-1 ring-separator-border outline-none",
          "transition-[background-color,box-shadow] duration-150 ease-out hover:bg-background-secondary-default focus-visible:ring-2 focus-visible:ring-border-focus-ring motion-reduce:transition-none",
          className,
        )}
      >
        <RiSearchLine
          aria-hidden
          className="size-4 shrink-0 text-foreground-icon-tertiary transition-colors group-hover:text-foreground-icon-secondary motion-reduce:transition-none"
        />
        <span className="min-w-0 flex-1 truncate text-body-2-regular text-text-tertiary transition-colors group-hover:text-text-secondary motion-reduce:transition-none">
          {label}
        </span>
        <span aria-hidden className="flex shrink-0 items-center gap-0.5">
          <Kbd className="min-w-5">{apple ? "⌘" : "Ctrl"}</Kbd>
          <Kbd className="min-w-5">{key.toUpperCase()}</Kbd>
        </span>
      </button>

      <CommandPalette
        isOpen={open}
        onOpenChange={setOpen}
        shortcut={false}
        aria-label={paletteLabel}
        placeholder={placeholder}
        inputValue={query}
        onInputChange={setQuery}
        onAction={onAction}
      >
        {children}
      </CommandPalette>
    </>
  );
}
// #endregion
