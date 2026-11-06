/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "AI Image Generation" (boardui.com/templates/ai-image-generation).
 * No BoardUI source was used.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { RemixiconComponentType } from "@remixicon/react";
import {
  RiAddLine,
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiArrowUpLine,
  RiCheckLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiDownloadLine,
  RiEraserLine,
  RiFileCopy2Line,
  RiFileCopyLine,
  RiFolderLine,
  RiGalleryLine,
  RiGitBranchLine,
  RiImageAiLine,
  RiInfinityLine,
  RiLayoutRightLine,
  RiMicFill,
  RiMicLine,
  RiMoreLine,
  RiRefreshLine,
  RiShareForwardLine,
  RiSideBarLine,
  RiThumbDownFill,
  RiThumbDownLine,
  RiThumbUpFill,
  RiThumbUpLine,
} from "@remixicon/react";
import { cx } from "@/registry/lib/cx";
import { ContextUsageRing } from "@/registry/ui/context-usage-ring";
import { Dropdown, DropdownDivider, DropdownGroup, DropdownItem, DropdownPopover, DropdownTrigger } from "@/registry/ui/dropdown";
import { GalleryArt, type GalleryItem } from "@/registry/ui/image-gallery-masonry";
import { ImageGeneratingLoader } from "@/registry/ui/image-generating-loader";
import { ModelSelect } from "@/registry/ui/model-select";
import { Tooltip, TooltipTrigger } from "@/registry/ui/tooltip";
import {
  AGENT_MODES,
  IMAGE_MODELS,
  PROJECTS,
  STYLE_PRESETS,
  SUGGESTIONS,
  type ImageFeedback,
  type ThreadEntry,
} from "@/registry/ui/ai-image-generation-data";

type Icon = RemixiconComponentType;

const focusRing = "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring";
const ghostIcon = cx(
  "flex size-8 shrink-0 items-center justify-center rounded-full text-foreground-icon-secondary",
  "transition-colors duration-150 ease-out hover:bg-background-secondary-hover hover:text-foreground-icon-primary motion-reduce:transition-none",
  "disabled:cursor-not-allowed disabled:opacity-40",
  focusRing,
);

/** Icon-only button with a tooltip that repeats its name. */
export function HintButton({
  icon: IconCmp,
  label,
  onPress,
  pressed,
  disabled,
  className,
}: {
  icon: Icon;
  label: string;
  onPress: () => void;
  pressed?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <TooltipTrigger>
      <button
        type="button"
        aria-label={label}
        aria-pressed={pressed}
        disabled={disabled}
        onClick={onPress}
        className={cx(ghostIcon, className)}
      >
        <IconCmp className="size-4" aria-hidden />
      </button>
      <Tooltip>{label}</Tooltip>
    </TooltipTrigger>
  );
}

/* ---------------------------------------------------------------- header */

export interface ThreadHeaderProps {
  repoName: string;
  title: string;
  sidebarHidden: boolean;
  panelHidden: boolean;
  canDelete: boolean;
  onShowSidebar: () => void;
  onOpenDrawer: () => void;
  onShowPanel: () => void;
  onOpenPanelDrawer: () => void;
  onShare: () => void;
  onDuplicate: () => void;
  onClear: () => void;
  onDelete: () => void;
}

export function ThreadHeader(props: ThreadHeaderProps) {
  const [menu, setMenu] = useState(false);
  const run = (fn: () => void) => () => {
    setMenu(false);
    fn();
  };
  return (
    <header className="flex h-14 shrink-0 items-center gap-1 px-4">
      <HintButton icon={RiSideBarLine} label="Open sidebar" onPress={props.onOpenDrawer} className="lg:hidden" />
      {props.sidebarHidden && (
        <HintButton icon={RiSideBarLine} label="Show sidebar" onPress={props.onShowSidebar} className="max-lg:hidden" />
      )}
      <div className="flex min-w-0 flex-1 items-center gap-1.5 text-body-medium">
        <RiFolderLine className="size-4 shrink-0 text-foreground-icon-tertiary" aria-hidden />
        <span className="truncate text-text-tertiary max-sm:hidden">{props.repoName}</span>
        <RiArrowRightSLine className="size-4 shrink-0 text-foreground-icon-quaternary max-sm:hidden" aria-hidden />
        <h2 className="truncate text-text-primary">{props.title}</h2>
      </div>
      <HintButton icon={RiShareForwardLine} label="Share thread" onPress={props.onShare} />
      <Dropdown isOpen={menu} onOpenChange={setMenu}>
        <DropdownTrigger aria-label="Thread actions" className={ghostIcon}>
          <RiMoreLine className="size-4" aria-hidden />
        </DropdownTrigger>
        <DropdownPopover aria-label="Thread actions" placement="bottom end" className="w-[220px]">
          <DropdownItem onSelect={run(props.onDuplicate)}>
            <RiFileCopy2Line className="size-4 text-foreground-icon-secondary" aria-hidden />
            <span className="text-body-medium text-text-primary">Duplicate thread</span>
          </DropdownItem>
          <DropdownItem onSelect={run(props.onClear)}>
            <RiEraserLine className="size-4 text-foreground-icon-secondary" aria-hidden />
            <span className="text-body-medium text-text-primary">Clear messages</span>
          </DropdownItem>
          <DropdownDivider />
          {props.canDelete ? (
            <DropdownItem onSelect={run(props.onDelete)}>
              <RiDeleteBinLine className="size-4 text-text-destructive" aria-hidden />
              <span className="text-body-medium text-text-destructive">Delete thread</span>
            </DropdownItem>
          ) : (
            <p className="px-2 py-1.5 text-caption-1-regular text-text-tertiary">The last thread can't be deleted.</p>
          )}
        </DropdownPopover>
      </Dropdown>
      <HintButton icon={RiGalleryLine} label="Open gallery" onPress={props.onOpenPanelDrawer} className="lg:hidden" />
      {props.panelHidden && (
        <HintButton icon={RiLayoutRightLine} label="Show gallery" onPress={props.onShowPanel} className="max-lg:hidden" />
      )}
    </header>
  );
}

/* --------------------------------------------------------------- entries */

export interface ThreadEntriesProps {
  entries: ThreadEntry[];
  /** Running generations: entry id → progress (0-100) and seconds left. */
  jobs: Record<string, { progress: number; remaining: number }>;
  copiedId: string | null;
  scrollKey: string;
  onCopyPrompt: (entry: Extract<ThreadEntry, { kind: "image" }>) => void;
  onFeedback: (entryId: string, feedback: ImageFeedback) => void;
  onRegenerate: (entry: Extract<ThreadEntry, { kind: "image" }>) => void;
  onDownload: (item: GalleryItem) => void;
  onCancel: (entryId: string) => void;
  onSuggestion: (text: string) => void;
}

function ImageEntry({
  entry,
  job,
  copied,
  props,
}: {
  entry: Extract<ThreadEntry, { kind: "image" }>;
  job: { progress: number; remaining: number } | undefined;
  copied: boolean;
  props: ThreadEntriesProps;
}) {
  if (job) {
    return (
      <div className="flex flex-col items-start gap-2">
        <ImageGeneratingLoader
          progress={job.progress}
          remainingSeconds={job.remaining}
          result={<GalleryArt item={entry.item} className="size-full" />}
        />
        <button
          type="button"
          onClick={() => props.onCancel(entry.id)}
          className={cx(
            "inline-flex items-center gap-1 rounded-full px-2 py-1 text-caption-1-medium text-text-tertiary hover:bg-background-secondary-hover hover:text-text-primary",
            focusRing,
          )}
        >
          <RiCloseLine className="size-3.5" aria-hidden />
          Stop generating
        </button>
      </div>
    );
  }
  const fb = entry.feedback ?? null;
  return (
    <figure className="flex flex-col items-start gap-1.5">
      <div className="w-[240px] rounded-2xl bg-background-primary-default p-2 shadow-2xs">
        <div className="overflow-hidden rounded-xl" style={{ aspectRatio: entry.item.ratio }}>
          <GalleryArt item={entry.item} className="size-full" />
        </div>
        <figcaption className="px-1 pt-2 pb-0.5">
          <p className="truncate text-body-2-medium text-text-primary">{entry.item.title}</p>
          <p className="truncate text-caption-1-regular text-text-tertiary">{entry.item.style}</p>
        </figcaption>
      </div>
      <div className="flex items-center" role="group" aria-label={`Actions for ${entry.item.title}`}>
        <HintButton icon={copied ? RiCheckLine : RiFileCopyLine} label={copied ? "Copied" : "Copy prompt"} onPress={() => props.onCopyPrompt(entry)} />
        <HintButton
          icon={fb === "like" ? RiThumbUpFill : RiThumbUpLine}
          label="Good image"
          pressed={fb === "like"}
          onPress={() => props.onFeedback(entry.id, fb === "like" ? null : "like")}
        />
        <HintButton
          icon={fb === "dislike" ? RiThumbDownFill : RiThumbDownLine}
          label="Bad image"
          pressed={fb === "dislike"}
          onPress={() => props.onFeedback(entry.id, fb === "dislike" ? null : "dislike")}
        />
        <HintButton icon={RiRefreshLine} label="Regenerate" onPress={() => props.onRegenerate(entry)} />
        <HintButton icon={RiDownloadLine} label="Download" onPress={() => props.onDownload(entry.item)} />
      </div>
    </figure>
  );
}

export function ThreadEntries(props: ThreadEntriesProps) {
  const { entries, jobs, copiedId, scrollKey } = props;
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries.length, scrollKey]);

  if (entries.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-background-primary-default text-foreground-icon-secondary shadow-2xs">
          <RiImageAiLine className="size-6" aria-hidden />
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="text-headline-semibold text-text-primary">What should we make?</h3>
          <p className="max-w-[360px] text-body-regular text-text-tertiary">
            Describe an image and the agent draws it here. Finished pictures land in the gallery.
          </p>
        </div>
        <ul className="flex max-w-[480px] flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((text) => (
            <li key={text}>
              <button
                type="button"
                onClick={() => props.onSuggestion(text)}
                className={cx(
                  "rounded-full border border-border-button-default bg-background-primary-default px-3 py-1.5 text-body-2-regular text-text-secondary shadow-2xs",
                  "transition-colors duration-150 ease-out hover:bg-background-primary-hover hover:text-text-primary motion-reduce:transition-none",
                  focusRing,
                )}
              >
                {text}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-8">
      <ol aria-label="Messages" className="mx-auto flex max-w-[640px] flex-col gap-5 py-4">
        {entries.map((entry) => (
          <li key={entry.id} className={cx("flex", entry.kind === "user" && "justify-end")}>
            {entry.kind === "user" ? (
              <div className="flex max-w-[78%] flex-col items-end gap-1.5">
                <p className="rounded-2xl rounded-br-md bg-background-primary-default px-3.5 py-2.5 text-body-regular text-text-primary shadow-2xs">
                  {entry.text}
                </p>
                {entry.styles && entry.styles.length > 0 && (
                  <p className="text-caption-1-regular text-text-tertiary">Styles: {entry.styles.join(", ")}</p>
                )}
              </div>
            ) : entry.kind === "assistant" ? (
              <p className="max-w-[78%] text-body-regular text-text-primary">{entry.text}</p>
            ) : (
              <ImageEntry
                entry={entry}
                job={jobs[entry.id]}
                copied={copiedId === entry.id}
                props={props}
              />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

/* -------------------------------------------------------------- composer */

const DICTATION = "a lighthouse on a cliff in a soft pastel duotone";

export interface ImageComposerProps {
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  styles: string[];
  onToggleStyle: (id: string) => void;
  model: string;
  onModelChange: (id: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
}

export function ImageComposer({ draft, onDraftChange, onSubmit, styles, onToggleStyle, model, onModelChange, inputRef }: ImageComposerProps) {
  const [listening, setListening] = useState(false);
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  // Dictation stand-in: after a short listen the phrase lands in the field.
  useEffect(() => {
    if (!listening) return;
    const id = window.setTimeout(() => {
      const current = draftRef.current.trim();
      onDraftChange(current ? `${current} ${DICTATION}` : DICTATION.charAt(0).toUpperCase() + DICTATION.slice(1));
      setListening(false);
    }, 1800);
    return () => window.clearTimeout(id);
  }, [listening, onDraftChange]);

  const canSend = draft.trim().length > 0;
  const selected = STYLE_PRESETS.filter((preset) => styles.includes(preset.id));

  return (
    <form
      className="flex flex-col gap-2 rounded-[28px] border border-border-button-white bg-background-primary-default p-2 shadow-card"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) onSubmit();
      }}
    >
      {selected.length > 0 && (
        <ul aria-label="Selected styles" className="flex flex-wrap gap-1.5 px-1 pt-1">
          {selected.map((preset) => (
            <li key={preset.id}>
              <button
                type="button"
                aria-label={`Remove ${preset.label} style`}
                onClick={() => onToggleStyle(preset.id)}
                className={cx(
                  "inline-flex items-center gap-1 rounded-full bg-status-blue-background py-0.5 pr-1.5 pl-2.5 text-caption-1-medium text-status-blue-text",
                  focusRing,
                )}
              >
                {preset.label}
                <RiCloseLine className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-1.5">
        <StylePicker styles={styles} onToggleStyle={onToggleStyle} />
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          aria-label="Describe an image"
          placeholder={listening ? "Listening…" : "Ask me anything"}
          className="min-w-0 flex-1 bg-transparent px-1 text-body-regular text-text-primary outline-none placeholder:text-text-placeholder"
        />
        <ModelSelect
          models={IMAGE_MODELS}
          value={model}
          onChange={(id) => onModelChange(id)}
          variant="ghost"
          size="sm"
          aria-label="Image model"
          className="max-sm:hidden"
        />
        <TooltipTrigger>
          <button
            type="button"
            aria-label={listening ? "Stop dictation" : "Dictate"}
            aria-pressed={listening}
            onClick={() => setListening((on) => !on)}
            className={cx(
              "flex size-9 shrink-0 items-center justify-center rounded-full border border-border-button-default bg-background-primary-default shadow-2xs",
              "transition-colors duration-150 ease-out hover:bg-background-primary-hover motion-reduce:transition-none",
              listening ? "text-status-rose-text" : "text-foreground-icon-secondary",
              focusRing,
            )}
          >
            {listening ? <RiMicFill className="size-4 animate-pulse motion-reduce:animate-none" aria-hidden /> : <RiMicLine className="size-4" aria-hidden />}
          </button>
          <Tooltip>{listening ? "Stop dictation" : "Dictate"}</Tooltip>
        </TooltipTrigger>
        <button
          type="submit"
          aria-label="Generate image"
          disabled={!canSend}
          className={cx(
            "flex size-9 shrink-0 items-center justify-center rounded-full bg-button-primary text-text-white button-press-motion",
            "disabled:cursor-not-allowed disabled:opacity-40",
            focusRing,
          )}
        >
          <RiArrowUpLine className="size-4" aria-hidden />
        </button>
      </div>
    </form>
  );
}

function StylePicker({ styles, onToggleStyle }: { styles: string[]; onToggleStyle: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dropdown isOpen={open} onOpenChange={setOpen}>
      <DropdownTrigger
        aria-label="Add a style"
        className={cx(
          "flex size-9 shrink-0 items-center justify-center rounded-full bg-ai-chat-composer-add-background text-foreground-icon-secondary",
          "transition-colors duration-150 ease-out hover:bg-ai-chat-composer-add-hover-background motion-reduce:transition-none",
          focusRing,
        )}
      >
        <RiAddLine className="size-4" aria-hidden />
      </DropdownTrigger>
      <DropdownPopover aria-label="Styles" placement="top start" className="w-[240px]" dialogClassName="max-h-[320px] overflow-y-auto">
        <DropdownGroup label="Styles">
          {STYLE_PRESETS.map((preset) => (
            <DropdownItem key={preset.id} selected={styles.includes(preset.id)} onSelect={() => onToggleStyle(preset.id)} className="px-2 py-1.5">
              <span className="size-6 shrink-0 overflow-hidden rounded-md">
                <GalleryArt item={preset.sample} className="size-full" />
              </span>
              <span className="flex-1 text-body-2-medium text-text-primary">{preset.label}</span>
              {styles.includes(preset.id) && <RiCheckLine className="size-4 text-accent-500" aria-hidden />}
            </DropdownItem>
          ))}
        </DropdownGroup>
      </DropdownPopover>
    </Dropdown>
  );
}

/* ------------------------------------------------------------ status row */

function Picker({
  icon: IconCmp,
  label,
  value,
  options,
  onChange,
  placement = "top start",
}: {
  icon: Icon;
  label: string;
  value: string;
  options: { id: string; label: string; description?: string }[];
  onChange: (id: string) => void;
  placement?: "top start" | "top end";
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.id === value);
  return (
    <Dropdown isOpen={open} onOpenChange={setOpen}>
      <DropdownTrigger
        aria-label={`${label}: ${current?.label ?? value}`}
        className={cx(
          "inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-caption-1-medium text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary",
          focusRing,
        )}
      >
        <IconCmp className="size-3.5 text-foreground-icon-tertiary" aria-hidden />
        {current?.label ?? value}
        <RiArrowDownSLine className="size-3.5 text-foreground-icon-tertiary" aria-hidden />
      </DropdownTrigger>
      <DropdownPopover aria-label={label} placement={placement} className="w-[240px]">
        <DropdownGroup label={label}>
          {options.map((option) => (
            <DropdownItem
              key={option.id}
              selected={option.id === value}
              onSelect={() => {
                onChange(option.id);
                setOpen(false);
              }}
              className="px-2 py-1.5"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-body-2-medium text-text-primary">{option.label}</span>
                {option.description && <span className="text-caption-1-regular text-text-tertiary">{option.description}</span>}
              </span>
              {option.id === value && <RiCheckLine className="size-4 text-accent-500" aria-hidden />}
            </DropdownItem>
          ))}
        </DropdownGroup>
      </DropdownPopover>
    </Dropdown>
  );
}

const BRANCHES = [
  { id: "main", label: "Main" },
  { id: "hero-art", label: "hero-art" },
  { id: "gallery-v2", label: "gallery-v2" },
];

export interface ComposerStatusProps {
  branch: string;
  onBranch: (id: string) => void;
  project: string;
  onProject: (id: string) => void;
  mode: string;
  onMode: (id: string) => void;
  contextUsed: number;
  contextLimit: number;
}

export function ComposerStatus(props: ComposerStatusProps) {
  return (
    <div className="flex items-center gap-1 px-2">
      <Picker icon={RiGitBranchLine} label="Branch" value={props.branch} options={BRANCHES} onChange={props.onBranch} />
      <Picker
        icon={RiFolderLine}
        label="Project"
        value={props.project}
        options={PROJECTS.map((id) => ({ id, label: id }))}
        onChange={props.onProject}
      />
      <span className="flex-1" />
      <Picker
        icon={RiInfinityLine}
        label="Agent mode"
        value={props.mode}
        options={AGENT_MODES}
        onChange={props.onMode}
        placement="top end"
      />
      <ContextUsageRing
        used={props.contextUsed}
        limit={props.contextLimit}
        breakdown={[
          { label: "Prompts", tokens: Math.round(props.contextUsed * 0.3), tone: "blue" },
          { label: "Reference images", tokens: Math.round(props.contextUsed * 0.55), tone: "purple" },
          { label: "System", tokens: props.contextUsed - Math.round(props.contextUsed * 0.3) - Math.round(props.contextUsed * 0.55), tone: "orange" },
        ]}
      />
    </div>
  );
}
