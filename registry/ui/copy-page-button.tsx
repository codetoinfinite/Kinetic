/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Copy Page Button" (boardui.com/components/typography).
 * No BoardUI source was used.
 */
"use client";

import { RiArrowDownSLine, RiCheckLine, RiFileCopyLine, RiMarkdownLine } from "@remixicon/react";
import { useRef, useState } from "react";
import type { ComponentType, Ref } from "react";

import { cx } from "@/registry/lib/cx";
import { Dropdown, DropdownPopover, DropdownTrigger } from "@/registry/ui/dropdown";
import { useCopyToClipboard } from "@/registry/ui/code-block-copy";

type MarkdownSource = string | (() => string | Promise<string>);

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

export interface CopyPageAction {
  id: string;
  label: string;
  /** Muted second line under the label. */
  description?: string;
  icon?: IconComponent;
  onAction: () => void;
}

export interface CopyPageButtonProps {
  /** The page as Markdown, or a function that produces it (sync or async) at click time. */
  markdown: MarkdownSource;
  /** Where "View as Markdown" points. Opens in a new tab. */
  markdownHref?: string;
  /**
   * Replaces the default "View as Markdown" behaviour. Without this and
   * without `markdownHref`, the Markdown opens as a plain-text blob in a new tab.
   */
  onViewMarkdown?: (markdown: string) => void;
  /** Extra rows appended under the two built-in actions. */
  actions?: readonly CopyPageAction[];
  /** Main button label. */
  label?: string;
  /** Label shown while the copied state lasts. */
  copiedLabel?: string;
  /** How long the copied state lasts, in ms. */
  resetMs?: number;
  /** Called with the Markdown after a successful copy. */
  onCopied?: (markdown: string) => void;
  /** Controlled menu state. */
  isMenuOpen?: boolean;
  onMenuOpenChange?: (isOpen: boolean) => void;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

async function resolveMarkdown(source: MarkdownSource): Promise<string> {
  return typeof source === "function" ? await source() : source;
}

function openMarkdownBlob(markdown: string) {
  const url = URL.createObjectURL(new Blob([markdown], { type: "text/plain;charset=utf-8" }));
  window.open(url, "_blank", "noopener,noreferrer");
  // The new tab has its own reference once it starts loading; free ours.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function MenuRow({
  icon: Icon,
  label,
  description,
  onPress,
  href,
}: {
  icon?: IconComponent;
  label: string;
  description?: string;
  onPress?: () => void;
  href?: string;
}) {
  const body = (
    <>
      {Icon && (
        <span className="mt-px flex size-8 shrink-0 items-center justify-center rounded-lg border border-border-button-default bg-background-primary-default text-foreground-icon-secondary">
          <Icon aria-hidden className="size-4" />
        </span>
      )}
      <span className="flex min-w-0 flex-col">
        <span className="text-body-medium text-text-primary">{label}</span>
        {description && <span className="text-caption-1-regular text-text-secondary">{description}</span>}
      </span>
    </>
  );
  const rowClass = cx(
    "flex w-full cursor-pointer items-start gap-2.5 rounded-2lg p-2 text-start outline-none transition-colors duration-150 ease-out motion-reduce:transition-none",
    "hover:bg-dropdown-item-hover-background focus-visible:bg-dropdown-item-hover-background",
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" onClick={onPress} className={rowClass}>
        {body}
      </a>
    );
  }
  return (
    <button type="button" onClick={onPress} className={rowClass}>
      {body}
    </button>
  );
}

/**
 * Split button for a docs page: the main half copies the page as Markdown
 * and flips to a check + "Copied" for `resetMs`; the chevron half opens a
 * Dropdown with "Copy as Markdown", "View as Markdown" and any extra actions.
 */
export function CopyPageButton({
  markdown,
  markdownHref,
  onViewMarkdown,
  actions = [],
  label = "Copy Page",
  copiedLabel = "Copied",
  resetMs = 1600,
  onCopied,
  isMenuOpen,
  onMenuOpenChange,
  className,
  ref,
}: CopyPageButtonProps) {
  const { copied, copy } = useCopyToClipboard(resetMs);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = isMenuOpen ?? uncontrolledOpen;
  const busy = useRef(false);

  const setOpen = (next: boolean) => {
    setUncontrolledOpen(next);
    onMenuOpenChange?.(next);
  };

  // #region critical
  const copyPage = async () => {
    // Ignore double clicks while an async source is still resolving.
    if (busy.current) return;
    busy.current = true;
    try {
      const text = await resolveMarkdown(markdown);
      if (await copy(text)) onCopied?.(text);
    } finally {
      busy.current = false;
    }
  };

  const viewMarkdown = async () => {
    setOpen(false);
    if (markdownHref) return; // the anchor navigates on its own
    const text = await resolveMarkdown(markdown);
    if (onViewMarkdown) onViewMarkdown(text);
    else openMarkdownBlob(text);
  };

  const runFromMenu = (action: () => void | Promise<void>) => () => {
    setOpen(false);
    void action();
  };
  // #endregion

  return (
    <div
      ref={ref}
      role="group"
      aria-label="Copy page"
      className={cx(
        "inline-flex h-9 shrink-0 items-stretch overflow-hidden rounded-2lg border border-border-button-default bg-background-primary-default shadow-xs",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => void copyPage()}
        data-copied={copied || undefined}
        className={cx(
          "inline-flex cursor-pointer items-center gap-1.5 ps-2.5 pe-3 text-body-medium text-text-primary outline-none",
          "transition-colors duration-150 ease-out motion-reduce:transition-none",
          "hover:bg-background-primary-hover active:bg-background-primary-active",
          "focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus-ring",
        )}
      >
        <span className="relative inline-flex size-[18px] items-center justify-center" aria-hidden>
          <RiFileCopyLine
            className={cx(
              "absolute size-[18px] text-foreground-icon-secondary transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none",
              copied ? "scale-50 opacity-0" : "scale-100 opacity-100",
            )}
          />
          <RiCheckLine
            className={cx(
              "absolute size-[18px] text-status-lime-text transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none",
              copied ? "scale-100 opacity-100" : "scale-50 opacity-0",
            )}
          />
        </span>
        <span className="whitespace-nowrap">{copied ? copiedLabel : label}</span>
      </button>

      <span aria-hidden className="w-px shrink-0 bg-border-button-default" />

      <Dropdown isOpen={open} onOpenChange={setOpen}>
        <DropdownTrigger
          aria-label="More copy options"
          className={cx(
            "inline-flex w-9 items-center justify-center text-foreground-icon-secondary",
            "transition-colors duration-150 ease-out motion-reduce:transition-none",
            "hover:bg-background-primary-hover data-[pressed]:bg-background-primary-active",
            "focus-visible:ring-inset",
          )}
        >
          <RiArrowDownSLine
            aria-hidden
            className={cx(
              "size-[18px] transition-transform duration-200 ease-out motion-reduce:transition-none",
              open && "rotate-180",
            )}
          />
        </DropdownTrigger>
        <DropdownPopover aria-label="Copy page options" placement="bottom end" offset={6} className="w-[288px]">
          <MenuRow
            icon={RiFileCopyLine}
            label="Copy as Markdown"
            description="Copy this page as Markdown for LLMs"
            onPress={runFromMenu(copyPage)}
          />
          <MenuRow
            icon={RiMarkdownLine}
            label="View as Markdown"
            description="Open this page as plain text"
            href={markdownHref}
            onPress={() => void viewMarkdown()}
          />
          {actions.map((action) => (
            <MenuRow
              key={action.id}
              icon={action.icon}
              label={action.label}
              description={action.description}
              onPress={runFromMenu(action.onAction)}
            />
          ))}
        </DropdownPopover>
      </Dropdown>

      <span role="status" className="sr-only">
        {copied ? "Page copied as Markdown" : ""}
      </span>
    </div>
  );
}
