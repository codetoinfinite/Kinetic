/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Composer Panel" (boardui.com/components/composer-panel).
 * No BoardUI source was used.
 */
"use client";

import {
  RiAddLine,
  RiArrowDownSLine,
  RiArrowUpLine,
  RiCheckLine,
  RiDashboard3Line,
  RiFlashlightLine,
  RiFolderLine,
  RiGitBranchLine,
  RiHand,
  RiListCheck3,
  RiMicLine,
  type RemixiconComponentType,
} from "@remixicon/react";
import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";

import {
  ComposerAttachButton,
  ComposerAttachments,
  attachmentsFromFiles,
  type ComposerAttachment,
} from "@/registry/ui/composer-attachments";
import { Dropdown, DropdownGroup, DropdownItem, DropdownPopover, DropdownTrigger } from "@/registry/ui/dropdown";
import { cx } from "@/registry/lib/cx";

/* ------------------------------------------------------------- permissions */

export type ComposerPermission = "auto" | "manual" | "plan" | "bypass";

export interface ComposerPermissionOption {
  id: ComposerPermission;
  label: string;
  description: string;
  icon: RemixiconComponentType;
}

export const COMPOSER_PERMISSIONS: ComposerPermissionOption[] = [
  { id: "auto", label: "Auto", description: "Agent decides by itself", icon: RiDashboard3Line },
  { id: "manual", label: "Manual", description: "Asks before every edit or command", icon: RiHand },
  { id: "plan", label: "Plan mode", description: "Writes a plan, edits once you approve", icon: RiListCheck3 },
  { id: "bypass", label: "Bypass all", description: "Runs everything without asking", icon: RiFlashlightLine },
];

/* ------------------------------------------------------------------ models */

export interface ComposerModel {
  id: string;
  name: string;
  description?: string;
}

export const COMPOSER_MODELS: ComposerModel[] = [
  { id: "swift-2", name: "Swift 2", description: "Balanced for everyday work" },
  { id: "swift-2-mini", name: "Swift 2 Mini", description: "Fastest replies, lightest load" },
  { id: "deep-1", name: "Deep 1", description: "Slower, reasons for longer" },
];

/* -------------------------------------------------------------- status tab */

export interface ComposerStatusTabProps {
  branch?: string;
  project?: string;
  /** Context window used, 0-100. */
  context?: number;
  className?: string;
}

/** 16px ring for the tab. The arc is drawn with pathLength 100, so the dash is the percentage. */
function ContextRing({ value }: { value: number }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-4 -rotate-90">
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth={2} className="text-foreground-icon-quaternary" />
      <circle
        cx="8"
        cy="8"
        r="6"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={`${value} 100`}
        className="text-foreground-icon-secondary"
      />
    </svg>
  );
}

/** The grey strip that hangs off the card's top edge: branch, project folder and context meter. */
export function ComposerStatusTab({ branch, project, context, className }: ComposerStatusTabProps) {
  const pct = context === undefined ? undefined : Math.max(0, Math.min(100, Math.round(context)));
  return (
    <div
      className={cx(
        "mx-7 flex h-[34px] items-center gap-3 rounded-t-2xl bg-composer-panel-tab-background px-3 text-body-2-regular text-text-secondary",
        className,
      )}
    >
      {branch && (
        <span className="flex max-w-[45%] shrink-0 items-center gap-1">
          <RiGitBranchLine className="size-3.5 shrink-0 text-foreground-icon-secondary" aria-hidden />
          <span className="sr-only">Branch:</span>
          <span className="truncate">{branch}</span>
        </span>
      )}
      {project && (
        <span className="flex min-w-0 items-center gap-1">
          <RiFolderLine className="size-3.5 shrink-0 text-foreground-icon-secondary" aria-hidden />
          <span className="sr-only">Project:</span>
          <span className="truncate">{project}</span>
        </span>
      )}
      {pct !== undefined && (
        <span
          role="meter"
          aria-label="Context used"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          className="ms-auto flex shrink-0 items-center gap-1 tabular-nums"
        >
          <ContextRing value={pct} />
          {pct}%
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- panel */

export interface ComposerPanelMessage {
  text: string;
  attachments: ComposerAttachment[];
  model: ComposerModel;
  permission: ComposerPermission;
}

export interface ComposerPanelProps {
  placeholder?: string;
  /** Slot above the card, usually a ComposerStatusTab. Omit or pass null for the bare card. */
  status?: ReactNode;
  models?: ComposerModel[];
  /** Model id to start on. Defaults to the first model. */
  defaultModel?: string;
  defaultPermission?: ComposerPermission;
  /** Called with the trimmed text, the attachments and the toolbar state. The panel then clears itself. */
  onSubmit?: (message: ComposerPanelMessage) => void;
  /** Greys out send (e.g. while a turn is in flight). Typing stays possible. */
  disabled?: boolean;
  /** Shows the mic button when set. */
  onVoice?: () => void;
  /** Pressed state for the mic button. */
  voiceActive?: boolean;
  /** Passed to the file input, e.g. "image/*,.pdf". */
  accept?: string;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  className?: string;
}

/** The field grows a line at a time up to this, then scrolls. */
const MAX_LINES = 10;
/** text-body-regular line height. */
const LINE_HEIGHT = 20;
/** pt-3.5 + pb-1.5 on the textarea, which scrollHeight includes. */
const FIELD_PADDING_Y = 20;

const ROUND_FOCUS = "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring";
const EASE = "transition-colors duration-150 ease-out motion-reduce:transition-none";

export function ComposerPanel({
  placeholder = "Hi, what do you need today?",
  status,
  models = COMPOSER_MODELS,
  defaultModel,
  defaultPermission = "auto",
  onSubmit,
  disabled = false,
  onVoice,
  voiceActive = false,
  accept,
  inputRef,
  className,
}: ComposerPanelProps) {
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [permission, setPermission] = useState<ComposerPermission>(defaultPermission);
  const [modelId, setModelId] = useState(defaultModel ?? models[0]?.id ?? "");
  const [permissionOpen, setPermissionOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const ownRef = useRef<HTMLTextAreaElement>(null);
  const fieldRef = inputRef ?? ownRef;
  const batch = useRef(0);

  const model = models.find((m) => m.id === modelId) ?? models[0];
  const mode = COMPOSER_PERMISSIONS.find((p) => p.id === permission) ?? COMPOSER_PERMISSIONS[0]!;
  const ModeIcon = mode.icon;
  const canSend = draft.trim().length > 0 && !disabled && model !== undefined;

  // #region critical
  // Grow with the content a line at a time, then cap and scroll. Resetting to
  // "auto" first lets the field shrink again when lines are deleted.
  useLayoutEffect(() => {
    const el = fieldRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_LINES * LINE_HEIGHT + FIELD_PADDING_Y)}px`;
  }, [draft, fieldRef]);

  const send = () => {
    if (!canSend || !model) return;
    onSubmit?.({ text: draft.trim(), attachments, model, permission });
    setDraft("");
    setAttachments([]);
    fieldRef.current?.focus();
  };

  // Enter sends; Shift+Enter falls through to the textarea's own newline.
  // isComposing keeps an IME's confirming Enter from sending half a word.
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    send();
  };
  // #endregion

  const addFiles = (files: File[]) => {
    batch.current += 1;
    setAttachments((prev) => [...prev, ...attachmentsFromFiles(files, `b${batch.current}`)]);
  };

  return (
    <div className={cx("flex w-full flex-col", className)}>
      {status}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="@container flex flex-col rounded-3xl bg-background-primary-default shadow-sm ring-1 ring-transparent transition-shadow duration-150 ease-out has-[textarea:focus-visible]:ring-border-focus-ring motion-reduce:transition-none"
      >
        <ComposerAttachments
          attachments={attachments}
          onRemove={(id) => setAttachments((prev) => prev.filter((a) => a.id !== id))}
          className="px-3 pt-3"
        />
        <textarea
          ref={fieldRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          aria-label="Prompt"
          placeholder={placeholder}
          className="block w-full resize-none bg-transparent px-4 pt-3.5 pb-1.5 text-body-regular text-text-primary outline-none placeholder:text-text-placeholder"
        />

        <div className="flex items-center gap-1 p-2">
          <ComposerAttachButton
            onFiles={addFiles}
            accept={accept}
            aria-label="Add files"
            className={cx(
              "grid size-9 shrink-0 place-items-center rounded-full bg-composer-panel-add-background text-foreground-icon-primary hover:bg-composer-panel-add-hover-background",
              ROUND_FOCUS,
              EASE,
            )}
          >
            <RiAddLine className="size-5" aria-hidden />
          </ComposerAttachButton>

          <Dropdown isOpen={permissionOpen} onOpenChange={setPermissionOpen}>
            <DropdownTrigger
              aria-label={`Permissions: ${mode.label}`}
              className={cx(
                "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-body-regular text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary data-[pressed]:bg-background-secondary-hover",
                permissionOpen && "bg-background-secondary-hover text-text-primary",
                ROUND_FOCUS,
                EASE,
              )}
            >
              <ModeIcon className="size-4 shrink-0 text-foreground-icon-secondary" aria-hidden />
              <span>{mode.label}</span>
            </DropdownTrigger>
            <DropdownPopover aria-label="Permissions" placement="top start" className="w-[284px]">
              <DropdownGroup label="Permissions">
                {COMPOSER_PERMISSIONS.map((p) => {
                  const Icon = p.icon;
                  return (
                    <DropdownItem
                      key={p.id}
                      selected={p.id === permission}
                      className="items-start text-body-regular"
                      onSelect={() => {
                        setPermission(p.id);
                        setPermissionOpen(false);
                      }}
                    >
                      <Icon className="mt-0.5 size-4 shrink-0 text-foreground-icon-secondary" aria-hidden />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-body-medium text-text-primary">{p.label}</span>
                        <span className="text-body-2-regular text-text-tertiary">{p.description}</span>
                      </span>
                      {p.id === permission && (
                        <RiCheckLine className="mt-0.5 size-4 shrink-0 text-foreground-icon-primary" aria-hidden />
                      )}
                    </DropdownItem>
                  );
                })}
              </DropdownGroup>
            </DropdownPopover>
          </Dropdown>

          <div className="flex-1" />

          <Dropdown isOpen={modelOpen} onOpenChange={setModelOpen}>
            <DropdownTrigger
              aria-label={`Model: ${model?.name ?? "none"}`}
              className={cx(
                "flex h-9 min-w-0 items-center gap-1 rounded-full ps-3 pe-2 text-body-regular text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary",
                modelOpen && "bg-background-secondary-hover text-text-primary",
                ROUND_FOCUS,
                EASE,
              )}
            >
              <span className="truncate @max-[20rem]:hidden">{model?.name}</span>
              <RiArrowDownSLine
                className={cx(
                  "size-4 shrink-0 text-foreground-icon-tertiary transition-transform duration-150 ease-out motion-reduce:transition-none",
                  modelOpen && "rotate-180",
                )}
                aria-hidden
              />
            </DropdownTrigger>
            <DropdownPopover aria-label="Choose a model" placement="top end" className="w-[260px]">
              <DropdownGroup label="Models">
                {models.map((m) => (
                  <DropdownItem
                    key={m.id}
                    selected={m.id === modelId}
                    className="items-start text-body-regular"
                    onSelect={() => {
                      setModelId(m.id);
                      setModelOpen(false);
                    }}
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-body-medium text-text-primary">{m.name}</span>
                      {m.description && <span className="text-body-2-regular text-text-tertiary">{m.description}</span>}
                    </span>
                    {m.id === modelId && (
                      <RiCheckLine className="mt-0.5 size-4 shrink-0 text-foreground-icon-primary" aria-hidden />
                    )}
                  </DropdownItem>
                ))}
              </DropdownGroup>
            </DropdownPopover>
          </Dropdown>

          {onVoice && (
            <button
              type="button"
              aria-label="Voice input"
              aria-pressed={voiceActive}
              onClick={onVoice}
              className={cx(
                "grid size-9 shrink-0 place-items-center rounded-full border",
                voiceActive
                  ? "border-transparent bg-accent-500 text-text-white"
                  : "border-border-button-default bg-background-primary-default text-foreground-icon-primary hover:bg-background-primary-hover",
                ROUND_FOCUS,
                EASE,
              )}
            >
              <RiMicLine className="size-[18px]" aria-hidden />
            </button>
          )}

          <button
            type="submit"
            aria-label="Send"
            disabled={!canSend}
            className="grid size-9 shrink-0 place-items-center rounded-full bg-button-primary text-text-white outline-none transition-transform duration-150 ease-out focus-visible:ring-2 focus-visible:ring-border-focus-ring active:scale-95 disabled:text-button-primary-disabled-foreground disabled:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            <RiArrowUpLine className="size-[18px]" aria-hidden />
          </button>
        </div>
      </form>
    </div>
  );
}
