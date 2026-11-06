/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Composer Footer" (boardui.com/components/ai-chat).
 * No BoardUI source was used.
 */
"use client";

import {
  RiArrowUpLine,
  RiAttachment2,
  RiGlobalLine,
  RiLightbulbLine,
  RiStopFill,
  RiTerminalBoxLine,
  type RemixiconComponentType,
} from "@remixicon/react";
import { useRef, useState, type ReactNode } from "react";
import { Button as AriaButton, ToggleButton } from "react-aria-components";

import { cx } from "@/registry/lib/cx";
import { Kbd } from "@/registry/ui/kbd";
import { Tooltip, TooltipTrigger } from "@/registry/ui/tooltip";

export interface ComposerTool {
  id: string;
  /** Tooltip text and accessible name. */
  label: string;
  icon: RemixiconComponentType;
}

export const COMPOSER_TOOLS: ComposerTool[] = [
  { id: "web", label: "Search the web", icon: RiGlobalLine },
  { id: "code", label: "Run code", icon: RiTerminalBoxLine },
  { id: "think", label: "Think longer", icon: RiLightbulbLine },
];

export interface ComposerFooterProps {
  /** Shows the paperclip and receives the picked files. Nothing is uploaded. */
  onAttach?: (files: File[]) => void;
  /** Forwarded to the file input, e.g. "image/*,.pdf". */
  accept?: string;
  tools?: ComposerTool[];
  /** Controlled set of switched-on tool ids. */
  activeTools?: string[];
  defaultActiveTools?: string[];
  onToolsChange?: (ids: string[]) => void;
  /** Slot after the tools, usually a ghost `ModelSelect`. */
  model?: ReactNode;
  /** Replaces the default keyboard hint (idle) or "Writing a reply…" (generating). */
  hint?: ReactNode;
  /** Whether there is something to send. Ignored while generating. */
  canSend?: boolean;
  /** Turns send into stop. */
  generating?: boolean;
  onSend?: () => void;
  onStop?: () => void;
  className?: string;
}

const ICON_BUTTON = cx(
  "grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-foreground-icon-secondary outline-none",
  "transition-[background-color,color,scale] duration-150 ease-out motion-reduce:transition-none",
  "hover:bg-background-secondary-default hover:text-foreground-icon-primary",
  "data-[pressed]:scale-95 motion-reduce:data-[pressed]:scale-100",
  "data-[focus-visible]:ring-2 data-[focus-visible]:ring-border-focus-ring",
);

function WithTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <TooltipTrigger delay={300}>
      {children}
      <Tooltip placement="top">{label}</Tooltip>
    </TooltipTrigger>
  );
}

// #region critical
function SendStopButton({
  generating,
  canSend,
  onSend,
  onStop,
}: Pick<ComposerFooterProps, "generating" | "canSend" | "onSend" | "onStop">) {
  // One button, two jobs. While generating it is always pressable and stops;
  // otherwise it sends and is disabled until there is something to send.
  const isDisabled = generating ? !onStop : !canSend;
  const swap = "[grid-area:1/1] transition-[opacity,scale,filter] duration-200 ease-out motion-reduce:transition-none";
  const shown = "scale-100 opacity-100 blur-none";
  const hidden = "scale-50 opacity-0 blur-[2px]";

  return (
    <span className="relative grid shrink-0 place-items-center">
      <svg
        aria-hidden
        viewBox="0 0 44 44"
        className={cx(
          "pointer-events-none absolute -inset-1 size-11 text-accent-500 transition-opacity duration-200 ease-out motion-reduce:transition-none",
          generating ? "opacity-100 motion-safe:animate-spin" : "opacity-0",
        )}
      >
        <circle cx="22" cy="22" r="20.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" pathLength={100} strokeDasharray="28 100" />
      </svg>
      <AriaButton
        aria-label={generating ? "Stop generating" : "Send"}
        isDisabled={isDisabled}
        onPress={() => (generating ? onStop?.() : onSend?.())}
        className={cx(
          "grid size-9 cursor-pointer place-items-center rounded-full bg-button-primary text-text-white shadow-xs outline-none",
          "transition-[scale] duration-150 ease-out data-[pressed]:scale-95 motion-reduce:transition-none motion-reduce:data-[pressed]:scale-100",
          "data-[focus-visible]:ring-2 data-[focus-visible]:ring-border-focus-ring data-[focus-visible]:ring-offset-2",
          "disabled:cursor-not-allowed disabled:text-button-primary-disabled-foreground",
        )}
      >
        <RiArrowUpLine aria-hidden className={cx("size-[18px]", swap, generating ? hidden : shown)} />
        <RiStopFill aria-hidden className={cx("size-3.5", swap, generating ? shown : hidden)} />
      </AriaButton>
    </span>
  );
}
// #endregion

export function ComposerFooter({
  onAttach,
  accept,
  tools = COMPOSER_TOOLS,
  activeTools,
  defaultActiveTools = [],
  onToolsChange,
  model,
  hint,
  canSend = false,
  generating = false,
  onSend,
  onStop,
  className,
}: ComposerFooterProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [ownActive, setOwnActive] = useState(defaultActiveTools);
  const active = activeTools ?? ownActive;

  const toggle = (id: string, on: boolean) => {
    const next = on ? [...active.filter((t) => t !== id), id] : active.filter((t) => t !== id);
    if (activeTools === undefined) setOwnActive(next);
    onToolsChange?.(next);
  };

  const defaultHint = generating ? (
    "Writing a reply…"
  ) : (
    <>
      <Kbd>Enter</Kbd> to send, <Kbd>Shift</Kbd> <Kbd>Enter</Kbd> for a new line
    </>
  );

  return (
    <div className={cx("@container flex items-center gap-0.5 p-2 @[26rem]:gap-1", className)}>
      {onAttach && (
        <>
          <WithTooltip label="Attach files">
            <AriaButton aria-label="Attach files" onPress={() => fileRef.current?.click()} className={ICON_BUTTON}>
              <RiAttachment2 aria-hidden className="size-[18px]" />
            </AriaButton>
          </WithTooltip>
          <input
            ref={fileRef}
            type="file"
            hidden
            multiple
            tabIndex={-1}
            accept={accept}
            onChange={(e) => {
              const picked = Array.from(e.currentTarget.files ?? []);
              e.currentTarget.value = "";
              if (picked.length > 0) onAttach(picked);
            }}
          />
        </>
      )}

      {tools.map(({ id, label, icon: Icon }) => (
        <WithTooltip key={id} label={label}>
          <ToggleButton
            aria-label={label}
            isSelected={active.includes(id)}
            onChange={(on) => toggle(id, on)}
            className={cx(
              ICON_BUTTON,
              "data-[selected]:bg-status-blue-background data-[selected]:text-status-blue-text",
            )}
          >
            <Icon aria-hidden className="size-[18px]" />
          </ToggleButton>
        </WithTooltip>
      ))}

      {model && (
        <>
          <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-border-button-default" />
          <div className="flex min-w-0 shrink">{model}</div>
        </>
      )}

      <div className="flex min-w-0 flex-1 justify-end px-2 @max-[34rem]:px-0">
        <p className="truncate text-body-2-regular text-text-tertiary @max-[34rem]:hidden">{hint ?? defaultHint}</p>
      </div>
      <span role="status" className="sr-only">
        {generating ? "Generating a reply" : ""}
      </span>

      <SendStopButton generating={generating} canSend={canSend} onSend={onSend} onStop={onStop} />
    </div>
  );
}
