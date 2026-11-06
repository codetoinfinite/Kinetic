/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "AI Chat" (boardui.com/templates/ai-chat).
 * No BoardUI source was used.
 */
import { useEffect, useRef, useState, type ComponentType, type KeyboardEvent } from "react";
import {
  RiAddLine,
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiArrowUpLine,
  RiAtLine,
  RiAttachmentLine,
  RiChat3Line,
  RiCheckLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiEditLine,
  RiFlowChart,
  RiFolderLine,
  RiGitBranchLine,
  RiInfinityLine,
  RiLayoutRightLine,
  RiMicFill,
  RiMicLine,
  RiMoreLine,
  RiPushpinLine,
  RiSparkling2Line,
  RiStopFill,
  RiUnpinLine,
  RiUpload2Line,
} from "@remixicon/react";

import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";
import { cx } from "@/registry/lib/cx";
import { AgentProgress } from "@/registry/ui/agent-progress";
import { AgentThinking } from "@/registry/ui/agent-thinking";
import { AlertDialog } from "@/registry/ui/modal";
import { ChatMessageBubble } from "@/registry/ui/chat-message-bubble";
import { useCopyToClipboard } from "@/registry/ui/code-block-copy";
import { ContextUsageRing } from "@/registry/ui/context-usage-ring";
import { Dropdown, DropdownGroup, DropdownItem, DropdownPopover, DropdownTrigger } from "@/registry/ui/dropdown";
import { ModelSelect } from "@/registry/ui/model-select";
import { IconAction, type AiChatMode, type AiChatThread } from "@/registry/ui/ai-chat-data";

/** A live agent run, owned by the shell so it survives switching chats. */
export interface AiChatRun {
  id: number;
  threadId: string;
  steps: string[];
  /** Index of the step in progress; equals steps.length once all are done. */
  step: number;
  phase: "working" | "streaming";
  full: string;
  shown: string;
  prompt: string;
  mode: AiChatMode;
}

export const CONTEXT_LIMIT = 200_000;

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

const MODES: { id: AiChatMode; label: string; hint: string; icon: IconComponent }[] = [
  { id: "agent", label: "Agent", hint: "Plans, edits files and runs checks", icon: RiInfinityLine },
  { id: "ask", label: "Ask", hint: "Answers without touching files", icon: RiChat3Line },
  { id: "plan", label: "Plan", hint: "Writes a plan for you to approve", icon: RiFlowChart },
];
const BRANCHES = ["Main", "dev", "feat/dark-tokens"];
const PROJECTS = ["project-sea", "boardui", "strider-site"];
const SUGGESTIONS = [
  "Add a loading skeleton to the dashboard cards",
  "Refactor the dropdown into smaller parts",
  "Run lint and a production build",
];
const DICTATION = "and add a short changelog entry when you're done";

/** Small text dropdown used by the status bar under the composer. */
function StatusMenu<T extends string>({
  label,
  icon: Icon,
  value,
  display,
  options,
  onChange,
}: {
  label: string;
  icon: IconComponent;
  value: T;
  display: string;
  options: { id: T; label: string; hint?: string }[];
  onChange: (id: T) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dropdown isOpen={open} onOpenChange={setOpen}>
      <DropdownTrigger
        aria-label={`${label}: ${display}`}
        className="inline-flex h-6 cursor-pointer items-center gap-1 rounded-md px-1.5 text-caption-1-medium text-text-secondary outline-none hover:bg-background-tertiary-default hover:text-text-primary data-[focus-visible]:ring-2 data-[focus-visible]:ring-border-focus-ring"
      >
        <Icon aria-hidden className="size-3.5 text-foreground-icon-secondary" />
        {display}
        <RiArrowDownSLine aria-hidden className="size-3.5 text-foreground-icon-tertiary" />
      </DropdownTrigger>
      <DropdownPopover aria-label={label} placement="top start" className="w-[220px]">
        <DropdownGroup label={label}>
          {options.map((o) => (
            <DropdownItem
              key={o.id}
              selected={o.id === value}
              className="px-2 py-1.5"
              onSelect={() => {
                onChange(o.id);
                setOpen(false);
              }}
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-body-2-medium text-text-primary">{o.label}</span>
                {o.hint && <span className="text-caption-1-regular text-text-tertiary">{o.hint}</span>}
              </span>
              {o.id === value && <RiCheckLine aria-hidden className="size-4 text-foreground-icon-primary" />}
            </DropdownItem>
          ))}
        </DropdownGroup>
      </DropdownPopover>
    </Dropdown>
  );
}

export interface AiChatThreadProps {
  thread: AiChatThread;
  folderName: string;
  /** The run for this thread, if one is live. */
  run: AiChatRun | null;
  /** Another chat's agent is busy; sending here is blocked until it ends. */
  busyElsewhere: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  onRegenerate: () => void;
  onRename: (title: string) => void;
  onTogglePin: () => void;
  onDelete: () => void;
  mode: AiChatMode;
  onModeChange: (mode: AiChatMode) => void;
  branch: string;
  onBranchChange: (branch: string) => void;
  project: string;
  onProjectChange: (project: string) => void;
  contextUsed: number;
  panelOpen: boolean;
  onShowPanel: () => void;
}

export function AiChatThreadView({
  thread,
  folderName,
  run,
  busyElsewhere,
  onSend,
  onStop,
  onRegenerate,
  onRename,
  onTogglePin,
  onDelete,
  mode,
  onModeChange,
  branch,
  onBranchChange,
  project,
  onProjectChange,
  contextUsed,
  panelOpen,
  onShowPanel,
}: AiChatThreadProps) {
  const reduced = useReducedMotion();
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [listening, setListening] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { copied, copy } = useCopyToClipboard(1600);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Dictation stand-in: listening ends after a moment and drops a phrase into the field.
  useEffect(() => {
    if (!listening) return;
    const timer = setTimeout(() => {
      setDraft((d) => (d ? `${d.trimEnd()} ${DICTATION}` : DICTATION));
      setListening(false);
    }, 2200);
    return () => clearTimeout(timer);
  }, [listening]);

  // Grow the field with its content up to five lines.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [draft]);

  // Keep the newest turn in view while the reply streams in.
  const streamLength = run?.shown.length ?? 0;
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread.turns.length, streamLength, run?.step]);

  const running = run !== null;
  const send = () => {
    const text = draft.trim();
    if (!text || running || busyElsewhere) {
      inputRef.current?.focus();
      return;
    }
    const withFiles = attachments.length ? `${text}\n\nAttached: ${attachments.map((a) => `\`${a}\``).join(", ")}` : text;
    onSend(withFiles);
    setDraft("");
    setAttachments([]);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };
  const attach = (name: string) => {
    setAttachments((a) => (a.includes(name) ? a : [...a, name]));
    setAttachOpen(false);
    inputRef.current?.focus();
  };

  const lastAssistant = [...thread.turns].reverse().find((turn) => turn.from === "assistant");
  const ModeIcon = MODES.find((m) => m.id === mode)?.icon ?? RiInfinityLine;

  return (
    <section aria-label={`Chat: ${thread.title}`} className="flex min-w-0 flex-1 flex-col rounded-2xl bg-background-secondary-default">
      <header className="flex h-12 shrink-0 items-center gap-1 px-3">
        <RiFolderLine aria-hidden className="size-4 shrink-0 text-foreground-icon-tertiary" />
        <span className="truncate text-caption-1-medium text-text-tertiary">{folderName}</span>
        <RiArrowRightSLine aria-hidden className="size-3.5 shrink-0 text-foreground-icon-tertiary" />
        {renaming ? (
          <input
            aria-label="Chat title"
            defaultValue={thread.title}
            autoFocus
            className="h-7 min-w-0 flex-1 rounded-md border border-border-button-default bg-background-primary-default px-2 text-caption-1-medium text-text-primary outline-none focus:ring-2 focus:ring-border-focus-ring"
            onBlur={(e) => {
              const v = e.currentTarget.value.trim();
              if (v) onRename(v);
              setRenaming(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") setRenaming(false);
            }}
          />
        ) : (
          <h2 className="min-w-0 flex-1 truncate text-caption-1-semibold text-text-primary">{thread.title}</h2>
        )}
        <IconAction
          label={copied ? "Link copied" : "Copy share link"}
          icon={copied ? RiCheckLine : RiUpload2Line}
          onPress={() => void copy(`https://vibl.dev/share/${thread.id}`)}
        />
        <Dropdown isOpen={moreOpen} onOpenChange={setMoreOpen}>
          <DropdownTrigger
            aria-label="Chat options"
            className="grid size-7 cursor-pointer place-items-center rounded-lg text-foreground-icon-secondary outline-none hover:bg-background-tertiary-default data-[focus-visible]:ring-2 data-[focus-visible]:ring-border-focus-ring"
          >
            <RiMoreLine aria-hidden className="size-4" />
          </DropdownTrigger>
          <DropdownPopover aria-label="Chat options" placement="bottom end" className="w-[200px]">
            <DropdownItem
              className="px-2 py-1.5"
              onSelect={() => {
                setMoreOpen(false);
                setRenaming(true);
              }}
            >
              <RiEditLine aria-hidden className="size-4 text-foreground-icon-secondary" />
              <span className="text-body-2-medium text-text-primary">Rename</span>
            </DropdownItem>
            <DropdownItem
              className="px-2 py-1.5"
              onSelect={() => {
                setMoreOpen(false);
                onTogglePin();
              }}
            >
              {thread.pinned ? (
                <RiUnpinLine aria-hidden className="size-4 text-foreground-icon-secondary" />
              ) : (
                <RiPushpinLine aria-hidden className="size-4 text-foreground-icon-secondary" />
              )}
              <span className="text-body-2-medium text-text-primary">{thread.pinned ? "Unpin" : "Pin"}</span>
            </DropdownItem>
            <DropdownItem
              className="px-2 py-1.5"
              onSelect={() => {
                setMoreOpen(false);
                setConfirmDelete(true);
              }}
            >
              <RiDeleteBinLine aria-hidden className="size-4 text-text-destructive" />
              <span className="text-body-2-medium text-text-destructive">Delete chat</span>
            </DropdownItem>
          </DropdownPopover>
        </Dropdown>
        {!panelOpen && <IconAction label="Show changes panel" icon={RiLayoutRightLine} onPress={onShowPanel} />}
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {thread.turns.length === 0 && !run ? (
          <div className="mx-auto flex h-full max-w-sm flex-col items-center justify-center gap-3 text-center">
            <span className="grid size-10 place-items-center rounded-full bg-background-primary-default shadow-xs">
              <RiSparkling2Line aria-hidden className="size-5 text-foreground-icon-secondary" />
            </span>
            <p className="text-headline-semibold text-text-primary">What should the agent build?</p>
            <p className="text-body-2-regular text-text-secondary">It works in {folderName} on the {branch} branch.</p>
            <div className="mt-1 flex flex-col gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setDraft(s);
                    inputRef.current?.focus();
                  }}
                  className="cursor-pointer rounded-full border border-separator-border bg-background-primary-default px-3 py-1.5 text-caption-1-medium text-text-secondary outline-none transition-colors duration-150 ease-out hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring motion-reduce:transition-none"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ol className="mx-auto flex max-w-[640px] flex-col gap-4 pt-2" aria-label="Messages">
            {thread.turns.map((turn) => (
              <li key={turn.id}>
                <ChatMessageBubble
                  from={turn.from}
                  text={turn.text}
                  time={turn.time}
                  name={turn.from === "user" ? "You" : "Agent"}
                  onRegenerate={turn.id === lastAssistant?.id && !running ? onRegenerate : undefined}
                />
              </li>
            ))}
            {run && run.phase === "working" && (
              <li className="flex flex-col gap-2" aria-live="polite">
                {run.steps.length > 0 && (
                  <AgentProgress key={run.id} steps={run.steps} step={run.step} stepDuration={STEP_MS} className="max-w-[320px]" />
                )}
                <AgentThinking variant="infinity" label="Thinking" showTimer shimmer={!reduced} />
              </li>
            )}
            {run && run.phase === "streaming" && (
              <li aria-live="polite" aria-busy="true">
                <ChatMessageBubble from="assistant" name="Agent" text={run.shown || "…"} />
              </li>
            )}
          </ol>
        )}
      </div>

      <div className="shrink-0 px-3 pb-2">
        <div className="group/composer relative mx-auto max-w-[680px]">
          <div
            aria-hidden
            className={cx(
              "pointer-events-none absolute -inset-1 rounded-[28px] bg-linear-to-r from-status-blue-text via-status-purple-text to-status-cyan-text opacity-0 blur-md",
              "transition-opacity duration-300 ease-out group-focus-within/composer:opacity-30 motion-reduce:transition-none",
              running && "animate-pulse opacity-40 motion-reduce:animate-none",
            )}
          />
          <div className="relative flex flex-col rounded-3xl border border-separator-border bg-background-primary-default shadow-sm">
            {attachments.length > 0 && (
              <ul aria-label="Attachments" className="flex flex-wrap gap-1 px-3 pt-2">
                {attachments.map((a) => (
                  <li key={a} className="flex items-center gap-1 rounded-md bg-background-tertiary-default py-0.5 pe-0.5 ps-2 text-caption-1-medium text-text-secondary">
                    {a}
                    <button
                      type="button"
                      aria-label={`Remove ${a}`}
                      onClick={() => setAttachments((list) => list.filter((x) => x !== a))}
                      className="grid size-4 cursor-pointer place-items-center rounded text-foreground-icon-tertiary outline-none hover:text-foreground-icon-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                    >
                      <RiCloseLine aria-hidden className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-end gap-1.5 p-1.5">
              <Dropdown isOpen={attachOpen} onOpenChange={setAttachOpen}>
                <DropdownTrigger
                  aria-label="Add context"
                  className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full bg-ai-chat-composer-add-background text-foreground-icon-primary outline-none hover:bg-ai-chat-composer-add-hover-background data-[focus-visible]:ring-2 data-[focus-visible]:ring-border-focus-ring"
                >
                  <RiAddLine aria-hidden className="size-4" />
                </DropdownTrigger>
                <DropdownPopover aria-label="Add context" placement="top start" className="w-[220px]">
                  <DropdownItem className="px-2 py-1.5" onSelect={() => attach("design-notes.md")}>
                    <RiAttachmentLine aria-hidden className="size-4 text-foreground-icon-secondary" />
                    <span className="text-body-2-medium text-text-primary">Attach design-notes.md</span>
                  </DropdownItem>
                  <DropdownItem className="px-2 py-1.5" onSelect={() => attach("@button.tsx")}>
                    <RiAtLine aria-hidden className="size-4 text-foreground-icon-secondary" />
                    <span className="text-body-2-medium text-text-primary">Mention button.tsx</span>
                  </DropdownItem>
                  <DropdownItem className="px-2 py-1.5" onSelect={() => attach("@uncommitted-changes")}>
                    <RiGitBranchLine aria-hidden className="size-4 text-foreground-icon-secondary" />
                    <span className="text-body-2-medium text-text-primary">Uncommitted changes</span>
                  </DropdownItem>
                </DropdownPopover>
              </Dropdown>
              <textarea
                ref={inputRef}
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                aria-label="Message the agent"
                placeholder={listening ? "Listening…" : busyElsewhere ? "Another chat's agent is working…" : "Ask me anything"}
                className="max-h-[120px] min-h-8 min-w-0 flex-1 resize-none bg-transparent px-1 py-1.5 text-body-2-regular text-text-primary outline-none placeholder:text-text-placeholder"
              />
              <ModelSelect variant="ghost" size="sm" aria-label="Model" defaultValue="swift-2" className="shrink-0" />
              <IconAction
                label={listening ? "Stop dictation" : "Dictate"}
                icon={listening ? RiMicFill : RiMicLine}
                active={listening}
                onPress={() => setListening((l) => !l)}
                className={cx("size-8 rounded-full", listening && "text-status-rose-text")}
              />
              <button
                type="button"
                aria-label={running ? "Stop the agent" : "Send message"}
                onClick={running ? onStop : send}
                className={cx(
                  "grid size-8 shrink-0 cursor-pointer place-items-center rounded-full bg-blue-500 text-text-white outline-none",
                  "transition-[opacity,scale] duration-150 ease-out active:scale-95 focus-visible:ring-2 focus-visible:ring-border-focus-ring motion-reduce:transition-none motion-reduce:active:scale-100",
                  !running && (!draft.trim() || busyElsewhere) && "opacity-50",
                )}
              >
                {running ? <RiStopFill aria-hidden className="size-3.5" /> : <RiArrowUpLine aria-hidden className="size-4" />}
              </button>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-1.5 flex max-w-[680px] items-center gap-1 px-1">
          <StatusMenu
            label="Branch"
            icon={RiGitBranchLine}
            value={branch}
            display={branch}
            options={BRANCHES.map((b) => ({ id: b, label: b }))}
            onChange={onBranchChange}
          />
          <StatusMenu
            label="Project"
            icon={RiFolderLine}
            value={project}
            display={project}
            options={PROJECTS.map((p) => ({ id: p, label: p }))}
            onChange={onProjectChange}
          />
          <span className="flex-1" />
          <StatusMenu
            label="Mode"
            icon={ModeIcon}
            value={mode}
            display={MODES.find((m) => m.id === mode)?.label ?? "Agent"}
            options={MODES.map((m) => ({ id: m.id, label: m.label, hint: m.hint }))}
            onChange={onModeChange}
          />
          <ContextUsageRing
            used={contextUsed}
            limit={CONTEXT_LIMIT}
            size={16}
            breakdown={[
              { label: "System and tools", tokens: 21_000, tone: "purple" },
              { label: "Files read", tokens: Math.round((contextUsed - 21_000) * 0.6), tone: "blue" },
              { label: "Conversation", tokens: Math.round((contextUsed - 21_000) * 0.4), tone: "cyan" },
            ]}
          />
        </div>
      </div>

      <AlertDialog
        isOpen={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this chat?"
        description={`"${thread.title}" and its messages will be removed. Uncommitted file changes stay in the panel.`}
        confirmLabel="Delete chat"
        onConfirm={onDelete}
      />
    </section>
  );
}

/** How long each agent step runs before the next one starts. */
export const STEP_MS = 1300;
