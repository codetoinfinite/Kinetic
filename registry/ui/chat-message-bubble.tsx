/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Chat Message Bubble" (boardui.com/templates/ai-chat).
 * No BoardUI source was used.
 */
"use client";

import {
  RiCheckLine,
  RiErrorWarningLine,
  RiFileCopyLine,
  RiRefreshLine,
  RiSparkling2Fill,
  RiThumbDownFill,
  RiThumbDownLine,
  RiThumbUpFill,
  RiThumbUpLine,
} from "@remixicon/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button as AriaButton, ToggleButton } from "react-aria-components";

import { cx } from "@/registry/lib/cx";
import { Avatar } from "@/registry/ui/avatar";
import { Tooltip, TooltipTrigger } from "@/registry/ui/tooltip";

export type ChatSender = "user" | "assistant";
export type ChatFeedback = "like" | "dislike" | null;
type CopyState = "idle" | "copied" | "failed";

export interface ChatMessageBubbleProps {
  from: ChatSender;
  /** Message text. Single-backtick spans render as inline code; a blank line starts a new paragraph. */
  text: string;
  /** Display time, already formatted, e.g. "10:42". */
  time?: string;
  /** Machine-readable value for `<time dateTime>`. */
  dateTime?: string;
  /** Sender name, used for the default avatar and the accessible label. */
  name?: string;
  /** Replaces the default avatar. */
  avatar?: ReactNode;
  /** Controlled rating. Assistant messages only. */
  feedback?: ChatFeedback;
  defaultFeedback?: ChatFeedback;
  onFeedbackChange?: (value: ChatFeedback) => void;
  /** Shows a regenerate button on an assistant message. */
  onRegenerate?: () => void;
  /** Called once the text is on the clipboard. */
  onCopy?: (text: string) => void;
  className?: string;
}

/** How long the copy button shows its result before resetting. */
const COPY_RESET_MS = 1600;

const ACTION = cx(
  "grid size-7 shrink-0 cursor-pointer place-items-center rounded-full text-foreground-icon-tertiary outline-none",
  "transition-[background-color,color,scale] duration-150 ease-out motion-reduce:transition-none",
  "hover:bg-background-secondary-default hover:text-foreground-icon-primary",
  "data-[pressed]:scale-90 motion-reduce:data-[pressed]:scale-100",
  "data-[focus-visible]:ring-2 data-[focus-visible]:ring-border-focus-ring",
);

/** Splits on blank lines into paragraphs, and on single backticks into inline code. */
export function renderMessageText(text: string, codeClassName?: string): ReactNode {
  return text.split(/\n{2,}/).map((para, p) => (
    <p key={p} className="whitespace-pre-wrap [overflow-wrap:anywhere]">
      {para.split(/(`[^`\n]+`)/g).map((part, i) =>
        // The capture group puts every code span at an odd index.
        i % 2 === 1 ? (
          <code key={i} className={cx("rounded-md px-1 py-0.5 font-mono text-[0.875em]", codeClassName)}>
            {part.slice(1, -1)}
          </code>
        ) : (
          part
        ),
      )}
    </p>
  ));
}

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "?";
}

function WithTip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <TooltipTrigger delay={300}>
      {children}
      <Tooltip placement="top">{label}</Tooltip>
    </TooltipTrigger>
  );
}

// #region critical
async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // No Clipboard API (insecure origin) or permission refused: copy from a
    // hidden, selected textarea instead, then hand focus back.
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
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
}

function useCopy(text: string, onCopy?: (text: string) => void) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);

  const copy = async () => {
    const ok = await writeClipboard(text);
    // The promise can settle after the message unmounts.
    if (!alive.current) return;
    if (ok) onCopy?.(text);
    setState(ok ? "copied" : "failed");
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), COPY_RESET_MS);
  };

  return [state, copy] as const;
}
// #endregion

export function ChatMessageBubble({
  from,
  text,
  time,
  dateTime,
  name,
  avatar,
  feedback,
  defaultFeedback = null,
  onFeedbackChange,
  onRegenerate,
  onCopy,
  className,
}: ChatMessageBubbleProps) {
  const isUser = from === "user";
  const sender = name ?? (isUser ? "You" : "Assistant");
  const [copyState, copy] = useCopy(text, onCopy);
  const [ownFeedback, setOwnFeedback] = useState<ChatFeedback>(defaultFeedback);
  const rating = feedback !== undefined ? feedback : ownFeedback;

  const rate = (value: ChatFeedback) => {
    if (feedback === undefined) setOwnFeedback(value);
    onFeedbackChange?.(value);
  };

  const copyLabel = copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy message";
  const CopyIcon = copyState === "copied" ? RiCheckLine : copyState === "failed" ? RiErrorWarningLine : RiFileCopyLine;

  return (
    <article
      aria-label={time ? `${sender}, ${time}` : sender}
      data-from={from}
      className={cx("group/message flex w-full items-start gap-2.5", isUser && "flex-row-reverse", className)}
    >
      {avatar ??
        (isUser ? (
          <Avatar aria-hidden size="sm" initials={initialsOf(sender)} className="mt-1 dark:bg-background-quaternary-default" />
        ) : (
          <span aria-hidden className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-button-primary text-text-white">
            <RiSparkling2Fill className="size-3.5" />
          </span>
        ))}

      <div className={cx("flex min-w-0 max-w-[min(85%,36rem)] flex-col gap-1", isUser ? "items-end" : "items-start")}>
        <div
          className={cx(
            "flex flex-col gap-2 rounded-2xl px-3.5 py-2.5 text-body-regular text-text-primary",
            isUser
              ? // In dark mode primary and tertiary are the same grey, so step up one.
                "rounded-se-md bg-background-tertiary-default dark:bg-background-quaternary-default"
              : "rounded-ss-md bg-background-primary-default ring-1 ring-inset ring-border-button-default",
          )}
        >
          {renderMessageText(
            text,
            isUser
              ? "bg-background-primary-default text-text-primary"
              : "bg-background-tertiary-default text-text-primary dark:bg-background-quaternary-default",
          )}
        </div>

        <div className={cx("flex min-h-7 items-center gap-1.5 px-1", isUser && "flex-row-reverse")}>
          {time && (
            <time dateTime={dateTime} className="text-caption-1-regular text-text-tertiary tabular-nums">
              {time}
            </time>
          )}
          <div
            role="group"
            aria-label="Message actions"
            data-pinned={copyState !== "idle" || undefined}
            className={cx(
              "flex items-center opacity-0 transition-opacity duration-150 ease-out motion-reduce:transition-none",
              "group-hover/message:opacity-100 group-focus-within/message:opacity-100 data-[pinned]:opacity-100",
              // Touch screens have no hover, so the row stays visible there.
              "[@media(hover:none)]:opacity-100",
            )}
          >
            <WithTip label={copyLabel}>
              <AriaButton
                aria-label={copyLabel}
                onPress={() => void copy()}
                className={cx(
                  ACTION,
                  // The result colour wins over the hover colour while it shows.
                  copyState === "copied" && "text-status-lime-text hover:text-status-lime-text",
                  copyState === "failed" && "text-status-rose-text hover:text-status-rose-text",
                )}
              >
                <CopyIcon aria-hidden className="size-4" />
              </AriaButton>
            </WithTip>

            {!isUser && onRegenerate && (
              <WithTip label="Regenerate">
                <AriaButton aria-label="Regenerate" onPress={onRegenerate} className={ACTION}>
                  <RiRefreshLine aria-hidden className="size-4" />
                </AriaButton>
              </WithTip>
            )}

            {!isUser && (
              <>
                <WithTip label="Good response">
                  <ToggleButton
                    aria-label="Good response"
                    isSelected={rating === "like"}
                    onChange={(on) => rate(on ? "like" : null)}
                    className={cx(ACTION, "data-[selected]:text-foreground-icon-primary")}
                  >
                    {rating === "like" ? <RiThumbUpFill aria-hidden className="size-4" /> : <RiThumbUpLine aria-hidden className="size-4" />}
                  </ToggleButton>
                </WithTip>
                <WithTip label="Bad response">
                  <ToggleButton
                    aria-label="Bad response"
                    isSelected={rating === "dislike"}
                    onChange={(on) => rate(on ? "dislike" : null)}
                    className={cx(ACTION, "data-[selected]:text-foreground-icon-primary")}
                  >
                    {rating === "dislike" ? (
                      <RiThumbDownFill aria-hidden className="size-4" />
                    ) : (
                      <RiThumbDownLine aria-hidden className="size-4" />
                    )}
                  </ToggleButton>
                </WithTip>
              </>
            )}
          </div>
          <span role="status" className="sr-only">
            {copyState === "copied" ? "Message copied" : copyState === "failed" ? "Couldn't copy the message" : ""}
          </span>
        </div>
      </div>
    </article>
  );
}
