/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "AI Chat" (boardui.com/templates/ai-chat).
 * No BoardUI source was used.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { RiAddLine, RiCheckLine, RiFileCopyLine, RiPlayLine, RiRobot2Line } from "@remixicon/react";

import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";
import { cx } from "@/registry/lib/cx";
import { Button } from "@/registry/ui/button";
import { useCopyToClipboard } from "@/registry/ui/code-block-copy";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/registry/ui/modal";
import { SettingsModal } from "@/registry/ui/settings-modal";
import { Switch } from "@/registry/ui/switch";
import {
  AI_CHAT_FILES,
  AI_CHAT_FOLDERS,
  AI_CHAT_INITIAL_STEPS,
  AI_CHAT_THREADS,
  fileFor,
  replyFor,
  stepsFor,
  type AiChatFile,
  type AiChatFolder,
  type AiChatMode,
  type AiChatThread,
  type AiChatView,
} from "@/registry/ui/ai-chat-data";
import { AiChatChanges } from "@/registry/ui/ai-chat-changes";
import { AiChatSidebar } from "@/registry/ui/ai-chat-sidebar";
import { AiChatThreadView, CONTEXT_LIMIT, STEP_MS, type AiChatRun } from "@/registry/ui/ai-chat-thread";

/** Pause with no steps (Ask mode) before the reply starts. */
const THINK_MS = 1100;
/** Hold on the finished checklist before the reply streams in. */
const DONE_HOLD_MS = 600;
/** Characters added per streaming tick, and the tick length. */
const CHUNK = 3;
const TICK_MS = 24;

export interface AiChatProps {
  folders?: AiChatFolder[];
  threads?: AiChatThread[];
  files?: AiChatFile[];
  /** Chat open on first render. */
  defaultThreadId?: string;
  /** Run the opening chat's last message through the agent on mount. */
  autoStart?: boolean;
  className?: string;
}

interface Automation {
  id: string;
  name: string;
  schedule: string;
  enabled: boolean;
  lastRun: string;
}

const AUTOMATIONS: Automation[] = [
  { id: "deps", name: "Bump patch dependencies", schedule: "Mondays 09:00", enabled: true, lastRun: "3d ago" },
  { id: "lint", name: "Lint and fix on push", schedule: "On every push to dev", enabled: true, lastRun: "2h ago" },
  { id: "notes", name: "Draft release notes", schedule: "Fridays 16:00", enabled: false, lastRun: "1w ago" },
];

export function AiChat({
  folders = AI_CHAT_FOLDERS,
  threads: initialThreads = AI_CHAT_THREADS,
  files: initialFiles = AI_CHAT_FILES,
  defaultThreadId = "coding",
  autoStart = true,
  className,
}: AiChatProps) {
  const reduced = useReducedMotion();
  const [threads, setThreads] = useState(initialThreads);
  const [activeId, setActiveId] = useState<string | null>(defaultThreadId);
  const [view, setView] = useState<AiChatView>("chat");
  const [collapsed, setCollapsed] = useState(false);
  const [files, setFiles] = useState(initialFiles);
  const [lastCommit, setLastCommit] = useState<string | null>(null);
  const [terminal, setTerminal] = useState<string[]>([]);
  const [panelOpen, setPanelOpen] = useState(true);
  const [wide, setWide] = useState(false);
  const [mode, setMode] = useState<AiChatMode>("agent");
  const [branch, setBranch] = useState("Main");
  const [project, setProject] = useState("project-sea");
  const [contextUsed, setContextUsed] = useState(114_000);
  const [planName, setPlanName] = useState("Pro Plan");
  const [modal, setModal] = useState<"settings" | "support" | "upgrade" | null>(null);
  const [automations, setAutomations] = useState(AUTOMATIONS);
  const [autoLint, setAutoLint] = useState(true);
  const [autoPanel, setAutoPanel] = useState(true);
  const [rules, setRules] = useState("Use kit tokens only. Keep components under 300 lines. Run lint before a build.");
  const [rulesSaved, setRulesSaved] = useState(true);
  const counter = useRef(1);
  const { copied, copy } = useCopyToClipboard(1600);

  // The opening chat arrives mid-run, the way the reference shows it.
  const [run, setRun] = useState<AiChatRun | null>(() => {
    const opening = initialThreads.find((th) => th.id === defaultThreadId);
    const prompt = opening?.turns.at(-1);
    if (!autoStart || !opening || prompt?.from !== "user") return null;
    return {
      id: 1,
      threadId: opening.id,
      steps: AI_CHAT_INITIAL_STEPS,
      step: 0,
      phase: "working",
      full: replyFor(prompt.text, "agent", 0),
      shown: "",
      prompt: prompt.text,
      mode: "agent",
    };
  });

  const active = threads.find((th) => th.id === activeId) ?? null;
  const log = (...lines: string[]) => setTerminal((t) => [...t, ...lines].slice(-200));
  const patchThread = (id: string, patch: (th: AiChatThread) => AiChatThread) =>
    setThreads((list) => list.map((th) => (th.id === id ? patch(th) : th)));

  const finish = (r: AiChatRun) => {
    patchThread(r.threadId, (th) => ({
      ...th,
      age: "now",
      turns: [...th.turns, { id: `a${r.id}`, from: "assistant", text: r.full, time: "now" }],
    }));
    if (r.mode === "agent") {
      setFiles((list) => [fileFor(r.prompt, r.id), ...list]);
      setLastCommit(null);
      if (autoLint) log("$ pnpm lint", "  0 problems", "$ pnpm build", "  Compiled successfully");
      if (autoPanel) setPanelOpen(true);
    }
    log(`run #${r.id} finished`);
    setContextUsed((u) => Math.min(CONTEXT_LIMIT, u + 2_400 + r.prompt.length * 30));
    setRun(null);
  };

  // #region critical
  // The agent timeline: one timer at a time walks the steps, holds on the
  // finished checklist, then streams the reply a few characters per tick.
  // Every state change re-arms the effect, and cleanup clears the old timer,
  // so stopping, deleting or unmounting never leaves a callback behind.
  useEffect(() => {
    if (!run) return;
    let timer: ReturnType<typeof setTimeout>;
    if (run.phase === "working") {
      const total = run.steps.length;
      const done = run.step >= total;
      timer = setTimeout(
        () => {
          if (done) {
            setRun({ ...run, phase: "streaming" });
            return;
          }
          log(`✓ ${run.steps[run.step] ?? ""}`);
          setRun({ ...run, step: run.step + 1 });
        },
        total === 0 ? THINK_MS : done ? DONE_HOLD_MS : STEP_MS,
      );
    } else {
      timer = setTimeout(
        () => {
          const shown = reduced ? run.full : run.full.slice(0, run.shown.length + CHUNK);
          if (shown.length >= run.full.length) finish(run);
          else setRun({ ...run, shown });
        },
        reduced ? 0 : TICK_MS,
      );
    }
    return () => clearTimeout(timer);
    // finish/log only call state setters, so the run and motion setting are the real inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, reduced]);
  // #endregion

  const start = (threadId: string, prompt: string) => {
    counter.current += 1;
    const id = counter.current;
    const steps = stepsFor(prompt, mode).filter((s) => autoLint || !/lint/i.test(s));
    log(`$ agent run #${id} --mode ${mode} --branch ${branch}`);
    setRun({ id, threadId, steps, step: 0, phase: "working", full: replyFor(prompt, mode, id), shown: "", prompt, mode });
  };

  const send = (text: string) => {
    if (!active) return;
    counter.current += 1;
    const userTurn = { id: `u${counter.current}`, from: "user" as const, text, time: "now" };
    patchThread(active.id, (th) => ({
      ...th,
      age: "now",
      title: th.turns.length === 0 ? text.split("\n")[0]!.slice(0, 32) : th.title,
      turns: [...th.turns, userTurn],
    }));
    start(active.id, text);
  };

  const stop = () => {
    if (!run) return;
    const text = run.shown ? `${run.shown}… (stopped)` : `Stopped after ${run.step} of ${run.steps.length} steps.`;
    patchThread(run.threadId, (th) => ({ ...th, turns: [...th.turns, { id: `a${run.id}`, from: "assistant", text, time: "now" }] }));
    log(`run #${run.id} stopped`);
    setRun(null);
  };

  const regenerate = () => {
    if (!active || run) return;
    const lastUser = [...active.turns].reverse().find((t) => t.from === "user");
    if (!lastUser) return;
    patchThread(active.id, (th) => ({ ...th, turns: th.turns.slice(0, th.turns.lastIndexOf(lastUser) + 1) }));
    start(active.id, lastUser.text);
  };

  const newAgent = (folderId?: string) => {
    counter.current += 1;
    const id = `new-${counter.current}`;
    const folder = folderId ?? active?.folderId ?? folders[0]?.id ?? "default";
    setThreads((list) => [{ id, title: "New agent", folderId: folder, age: "now", turns: [] }, ...list]);
    setActiveId(id);
    setView("chat");
  };

  const remove = (id: string) => {
    const rest = threads.filter((th) => th.id !== id);
    setThreads(rest);
    if (run?.threadId === id) setRun(null);
    if (activeId === id) setActiveId(rest[0]?.id ?? null);
  };

  const commit = (message: string) => {
    log(`$ git commit -m "${message}"`, `[${branch}] ${files.length} files changed`);
    setLastCommit(`Committed "${message}" to ${branch}.`);
    setFiles([]);
  };

  const folderName = (id: string) => folders.find((f) => f.id === id)?.name ?? id;

  return (
    <div className={cx("flex h-full w-full gap-2 overflow-hidden bg-background-primary-default p-2", className)}>
      <AiChatSidebar
        folders={folders}
        threads={threads}
        activeThreadId={activeId}
        view={view}
        runningThreadId={run?.threadId ?? null}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        onSelectThread={(id) => {
          setActiveId(id);
          setView("chat");
        }}
        onNewAgent={newAgent}
        onView={setView}
        onOpenSettings={() => setModal("settings")}
        onOpenSupport={() => setModal("support")}
        onUpgrade={() => setModal("upgrade")}
        planName={planName}
      />

      {view === "chat" && active ? (
        <AiChatThreadView
          key={active.id}
          thread={active}
          folderName={folderName(active.folderId)}
          run={run?.threadId === active.id ? run : null}
          busyElsewhere={run !== null && run.threadId !== active.id}
          onSend={send}
          onStop={stop}
          onRegenerate={regenerate}
          onRename={(title) => patchThread(active.id, (th) => ({ ...th, title }))}
          onTogglePin={() => patchThread(active.id, (th) => ({ ...th, pinned: !th.pinned }))}
          onDelete={() => remove(active.id)}
          mode={mode}
          onModeChange={setMode}
          branch={branch}
          onBranchChange={setBranch}
          project={project}
          onProjectChange={setProject}
          contextUsed={contextUsed}
          panelOpen={panelOpen}
          onShowPanel={() => setPanelOpen(true)}
        />
      ) : view === "chat" ? (
        <section aria-label="No chat" className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl bg-background-secondary-default">
          <p className="text-headline-semibold text-text-primary">No chats left</p>
          <Button variant="primary" size="small" leadingIcon={RiAddLine} onClick={() => newAgent()}>
            New agent
          </Button>
        </section>
      ) : (
        <section
          aria-label={view === "automations" ? "Automations" : "Customize"}
          className="flex min-w-0 flex-1 flex-col overflow-y-auto rounded-2xl bg-background-secondary-default p-6"
        >
          {view === "automations" ? (
            <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <h2 className="text-title-3-semibold text-text-primary">Automations</h2>
                  <p className="text-body-2-regular text-text-secondary">Agents that run on a schedule or on repository events.</p>
                </div>
                <Button
                  size="small"
                  variant="secondary"
                  leadingIcon={RiAddLine}
                  onClick={() =>
                    setAutomations((list) => [
                      ...list,
                      { id: `auto-${list.length + 1}`, name: `Untitled automation ${list.length + 1}`, schedule: "Daily 08:00", enabled: false, lastRun: "never" },
                    ])
                  }
                >
                  New automation
                </Button>
              </div>
              <ul className="flex flex-col gap-2">
                {automations.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 rounded-xl border border-separator-border bg-background-primary-default p-3 shadow-xs">
                    <span className="grid size-8 place-items-center rounded-lg bg-status-blue-background text-status-blue-text">
                      <RiRobot2Line aria-hidden className="size-4" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-body-2-semibold text-text-primary">{a.name}</span>
                      <span className="truncate text-caption-1-regular text-text-tertiary">
                        {a.schedule} · last run {a.lastRun}
                      </span>
                    </span>
                    <Button
                      size="xs"
                      variant="ghost"
                      leadingIcon={RiPlayLine}
                      onClick={() => {
                        log(`$ automation "${a.name}"`, "  done in 4s");
                        setAutomations((list) => list.map((x) => (x.id === a.id ? { ...x, lastRun: "just now" } : x)));
                      }}
                    >
                      Run now
                    </Button>
                    <Switch
                      aria-label={`Enable ${a.name}`}
                      isSelected={a.enabled}
                      onChange={(on) => setAutomations((list) => list.map((x) => (x.id === a.id ? { ...x, enabled: on } : x)))}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
              <div>
                <h2 className="text-title-3-semibold text-text-primary">Customize</h2>
                <p className="text-body-2-regular text-text-secondary">Rules and defaults every agent in this workspace follows.</p>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-caption-1-semibold text-text-secondary">Project rules</span>
                <textarea
                  value={rules}
                  rows={4}
                  onChange={(e) => {
                    setRules(e.target.value);
                    setRulesSaved(false);
                  }}
                  className="resize-none rounded-xl border border-border-button-default bg-background-primary-default p-3 text-body-2-regular text-text-primary outline-none focus:ring-2 focus:ring-border-focus-ring"
                />
              </label>
              <div className="flex items-center gap-2">
                <Button size="small" variant="primary" onClick={() => setRulesSaved(true)}>
                  Save rules
                </Button>
                <span aria-live="polite" className="text-caption-1-medium text-text-tertiary">
                  {rulesSaved ? "Saved" : "Unsaved changes"}
                </span>
              </div>
              <div className="flex flex-col gap-3 rounded-xl border border-separator-border bg-background-primary-default p-4">
                <Switch isSelected={autoLint} onChange={setAutoLint}>
                  <span className="text-body-2-medium text-text-primary">Run lint and a production build after edits</span>
                </Switch>
                <Switch isSelected={autoPanel} onChange={setAutoPanel}>
                  <span className="text-body-2-medium text-text-primary">Open the changes panel when a run ends</span>
                </Switch>
              </div>
            </div>
          )}
        </section>
      )}

      {panelOpen && (
        <AiChatChanges
          files={files}
          onDiscardAll={() => {
            log(`$ git restore . (${files.length} files)`);
            setFiles([]);
          }}
          onRevertFile={(id) => setFiles((list) => list.filter((f) => f.id !== id))}
          onCommit={commit}
          branch={branch}
          lastCommit={lastCommit}
          terminal={terminal}
          onClearTerminal={() => setTerminal([])}
          wide={wide}
          onWideChange={setWide}
          onClose={() => setPanelOpen(false)}
        />
      )}

      <SettingsModal isOpen={modal === "settings"} onClose={() => setModal(null)} />

      <Modal isOpen={modal === "support"} onOpenChange={(o) => !o && setModal(null)} size="sm">
        <ModalHeader title="Support" description="We answer within one working day. Include the chat link if a run went wrong." />
        <ModalBody className="pb-2">
          <div className="flex items-center gap-2 rounded-xl bg-background-secondary-default p-3">
            <span className="flex-1 font-mono text-body-2-regular text-text-primary">help@vibl.dev</span>
            <Button size="xs" variant="secondary" leadingIcon={copied ? RiCheckLine : RiFileCopyLine} onClick={() => void copy("help@vibl.dev")}>
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setModal(null)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={modal === "upgrade"} onOpenChange={(o) => !o && setModal(null)} size="sm">
        <ModalHeader title="Board team plan" description={`You are on the ${planName}.`} />
        <ModalBody className="flex flex-col gap-2 pb-2">
          {[
            { name: "Pro Plan", price: "$16 per seat", note: "Unlimited chats, 3 automations" },
            { name: "Team Plan", price: "$24 per seat", note: "Shared rules, unlimited automations, audit log" },
          ].map((p) => (
            <button
              key={p.name}
              type="button"
              aria-pressed={planName === p.name}
              onClick={() => {
                setPlanName(p.name);
                setModal(null);
              }}
              className={cx(
                "flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-start outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                planName === p.name ? "border-blue-500 bg-status-blue-background" : "border-separator-border hover:bg-background-secondary-default",
              )}
            >
              <span className="flex flex-1 flex-col">
                <span className="text-body-2-semibold text-text-primary">{p.name}</span>
                <span className="text-caption-1-regular text-text-tertiary">{p.note}</span>
              </span>
              <span className="text-caption-1-semibold text-text-secondary">{p.price}</span>
            </button>
          ))}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setModal(null)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
