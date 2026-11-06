/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "AI Image Generation" (boardui.com/templates/ai-image-generation).
 * No BoardUI source was used.
 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Key } from "react-aria-components";
import {
  RiAddLine,
  RiEqualizer2Line,
  RiGalleryLine,
  RiImageAiLine,
  RiRobot2Line,
  RiSettings4Line,
} from "@remixicon/react";
import { cx } from "@/registry/lib/cx";
import { CommandPalette, CommandPaletteItem, CommandPaletteSection } from "@/registry/ui/command-palette";
import { GALLERY_ITEMS, type GalleryItem } from "@/registry/ui/image-gallery-masonry";
import { SettingsModal } from "@/registry/ui/settings-modal";
import { Toaster, toast } from "@/registry/ui/toast";
import { ImageSidebar } from "@/registry/ui/ai-image-generation-sidebar";
import { ComposerStatus, ImageComposer, ThreadEntries, ThreadHeader } from "@/registry/ui/ai-image-generation-thread";
import { AutomationsView, CustomizeView, GalleryPanel, type PanelTab } from "@/registry/ui/ai-image-generation-panels";
import {
  ASPECTS,
  FIRST_RESULT,
  IMAGE_MODELS,
  INITIAL_REPOS,
  INITIAL_THREADS,
  STYLE_PRESETS,
  itemFromPrompt,
  type ImageFeedback,
  type ImageRepo,
  type ImageView,
  type ThreadEntry,
} from "@/registry/ui/ai-image-generation-data";

/**
 * AI Image Generation: a three-pane image studio. A repository sidebar picks
 * the thread, the middle pane holds the prompt thread and a pill composer,
 * and the right pane is a masonry gallery with a Styles tab. Sending a prompt
 * adds a generating tile that counts up, reveals its picture through the
 * halftone loader, then files the finished image in the gallery.
 */

export interface AiImageGenerationProps {
  /** Milliseconds one generation takes with the default model and mode. */
  generationMs?: number;
  /** Thread selected on first render. */
  defaultSessionId?: string;
  className?: string;
}

type ImageEntryT = Extract<ThreadEntry, { kind: "image" }>;

interface Job {
  sessionId: string;
  progress: number;
  /** Progress added per tick. */
  step: number;
  item: GalleryItem;
}

const TICK_MS = 100;
const CONTEXT_LIMIT = 200_000;
const DEFAULTS = { model: "fable-5", aspect: "4:5", saveToGallery: true };

const sessionsOf = (repos: ImageRepo[]) => repos.flatMap((repo) => repo.sessions);

export function AiImageGeneration({ generationMs = 7000, defaultSessionId = "image-generation", className }: AiImageGenerationProps) {
  const [repos, setRepos] = useState(INITIAL_REPOS);
  const [threads, setThreads] = useState(INITIAL_THREADS);
  const [gallery, setGallery] = useState<GalleryItem[]>(GALLERY_ITEMS);
  const [sessionId, setSessionId] = useState(defaultSessionId);
  const [view, setView] = useState<ImageView>("thread");

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelDrawer, setPanelDrawer] = useState(false);
  const [panelWide, setPanelWide] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>("gallery");

  const [draft, setDraft] = useState("");
  const [styles, setStyles] = useState<string[]>([]);
  const [model, setModel] = useState(DEFAULTS.model);
  const [defaultModel, setDefaultModel] = useState(DEFAULTS.model);
  const [aspect, setAspect] = useState(DEFAULTS.aspect);
  const [saveToGallery, setSaveToGallery] = useState(DEFAULTS.saveToGallery);
  const [branch, setBranch] = useState("main");
  const [project, setProject] = useState("project-sea");
  const [mode, setMode] = useState("agent");
  const [contextUsed, setContextUsed] = useState(114_000);

  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [focusTick, setFocusTick] = useState(0);

  const [jobs, setJobs] = useState<Record<string, Job>>(() => ({
    "g-1": { sessionId: "image-generation", progress: 0, step: (100 * TICK_MS) / generationMs, item: FIRST_RESULT },
  }));

  const inputRef = useRef<HTMLInputElement>(null);
  const idCounter = useRef(0);
  const jobsRef = useRef(jobs);
  const saveRef = useRef(saveToGallery);
  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);
  useEffect(() => {
    saveRef.current = saveToGallery;
  }, [saveToGallery]);

  const nextId = (prefix: string) => {
    idCounter.current += 1;
    return `${prefix}-n${idCounter.current}`;
  };

  // #region critical
  // One interval drives every running generation. It only exists while a job
  // does, reads the latest jobs from a ref, and files finished pictures in
  // the gallery (unless Customize turned that off) before announcing them.
  const running = Object.keys(jobs).length > 0;
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const next: Record<string, Job> = {};
      const done: Job[] = [];
      for (const [key, job] of Object.entries(jobsRef.current)) {
        const progress = Math.min(100, job.progress + job.step);
        if (progress >= 100) done.push(job);
        else next[key] = { ...job, progress };
      }
      jobsRef.current = next;
      setJobs(next);
      if (done.length === 0) return;
      if (saveRef.current) {
        setGallery((prev) => [...done.map((job) => job.item), ...prev.filter((item) => !done.some((job) => job.item.id === item.id))]);
      }
      for (const job of done) {
        toast("Image ready", {
          id: `ready-${job.item.id}`,
          description: saveRef.current ? `“${job.item.title}” was added to the gallery.` : `“${job.item.title}” is in the thread.`,
          status: "success",
        });
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [running]);
  // #endregion

  useEffect(() => {
    if (!copiedId) return;
    const id = window.setTimeout(() => setCopiedId(null), 1500);
    return () => window.clearTimeout(id);
  }, [copiedId]);

  useEffect(() => {
    if (focusTick > 0) inputRef.current?.focus();
  }, [focusTick]);

  useEffect(() => {
    if (!drawer && !panelDrawer) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setDrawer(false);
      setPanelDrawer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer, panelDrawer]);

  const allSessions = useMemo(() => sessionsOf(repos), [repos]);
  const session = allSessions.find((item) => item.id === sessionId) ?? allSessions[0];
  const repo = repos.find((item) => item.sessions.some((s) => s.id === session?.id)) ?? repos[0];
  const entries = (session && threads[session.id]) ?? [];

  const jobView = useMemo(() => {
    const out: Record<string, { progress: number; remaining: number }> = {};
    for (const [key, job] of Object.entries(jobs)) {
      out[key] = { progress: job.progress, remaining: Math.max(1, Math.ceil(((100 - job.progress) / job.step) * (TICK_MS / 1000))) };
    }
    return out;
  }, [jobs]);

  const touch = (id: string) =>
    setRepos((prev) => prev.map((r) => ({ ...r, sessions: r.sessions.map((s) => (s.id === id ? { ...s, age: "now" } : s)) })));

  const append = (id: string, added: ThreadEntry[]) => setThreads((prev) => ({ ...prev, [id]: [...(prev[id] ?? []), ...added] }));

  const cancelJobsFor = (id: string) => {
    const next = Object.fromEntries(Object.entries(jobsRef.current).filter(([, job]) => job.sessionId !== id));
    jobsRef.current = next;
    setJobs(next);
  };

  const startJob = (target: string, entryId: string, item: GalleryItem) => {
    const speed = (model === "fable-5-mini" ? 0.5 : 1) * (mode === "draft" ? 0.5 : 1);
    const job: Job = { sessionId: target, progress: 0, step: (100 * TICK_MS) / (generationMs * speed), item };
    jobsRef.current = { ...jobsRef.current, [entryId]: job };
    setJobs(jobsRef.current);
  };

  const generate = (target: string, prompt: string, styleIds: string[]) => {
    const userId = nextId("u");
    const imageId = nextId("g");
    const ratio = ASPECTS.find((a) => a.id === aspect)?.ratio ?? "4 / 5";
    const styleLabels = STYLE_PRESETS.filter((preset) => styleIds.includes(preset.id)).map((preset) => preset.label);
    const modelName = IMAGE_MODELS.find((m) => m.id === model)?.name ?? "Fable 5";
    const item = itemFromPrompt(`gen-${imageId}`, prompt, ratio, styleLabels.length ? styleLabels : [modelName]);
    const added: ThreadEntry[] = [{ id: userId, kind: "user", text: prompt, styles: styleLabels }];
    if (mode === "ask") {
      added.push({ id: nextId("a"), kind: "assistant", text: `Plan: “${item.title}” at ${aspect} in ${item.style}. Starting now.` });
    }
    added.push({ id: imageId, kind: "image", prompt, item });
    append(target, added);
    startJob(target, imageId, item);
    touch(target);
    setContextUsed((used) => Math.min(CONTEXT_LIMIT, used + 3200 + prompt.length * 4));
  };

  const send = () => {
    const prompt = draft.trim();
    if (!prompt || !session) return;
    generate(session.id, prompt, styles);
    setDraft("");
    setStyles([]);
  };

  const selectSession = (id: string) => {
    setSessionId(id);
    setView("thread");
    setDrawer(false);
  };

  const newAgent = () => {
    const id = nextId("s");
    const n = idCounter.current;
    const home = repo?.id ?? repos[0]?.id;
    setRepos((prev) =>
      prev.map((r) => (r.id === home ? { ...r, sessions: [{ id, title: `new image ${n}`, age: "now" }, ...r.sessions] } : r)),
    );
    setThreads((prev) => ({ ...prev, [id]: [] }));
    setModel(defaultModel);
    selectSession(id);
    setPanelDrawer(false);
    setFocusTick((t) => t + 1);
  };

  const removeSession = (id: string) => {
    const remaining = allSessions.filter((s) => s.id !== id);
    if (remaining.length === 0) return;
    cancelJobsFor(id);
    setRepos((prev) => prev.map((r) => ({ ...r, sessions: r.sessions.filter((s) => s.id !== id) })));
    setThreads((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSessionId(remaining[0]!.id);
    toast("Thread deleted", { status: "neutral" });
  };

  const duplicate = () => {
    if (!session || !repo) return;
    const id = nextId("s");
    const copy = entries
      .filter((entry) => !(entry.id in jobsRef.current))
      .map((entry) => ({ ...entry, id: `${entry.id}-${id}` }));
    setRepos((prev) =>
      prev.map((r) => {
        if (r.id !== repo.id) return r;
        const at = r.sessions.findIndex((s) => s.id === session.id);
        const sessions = [...r.sessions];
        sessions.splice(at + 1, 0, { id, title: `${session.title} copy`, age: "now" });
        return { ...r, sessions };
      }),
    );
    setThreads((prev) => ({ ...prev, [id]: copy }));
    setSessionId(id);
    toast("Thread duplicated", { status: "success" });
  };

  const setFeedback = (entryId: string, feedback: ImageFeedback) =>
    setThreads((prev) => ({
      ...prev,
      [sessionId]: (prev[sessionId] ?? []).map((entry) => (entry.id === entryId && entry.kind === "image" ? { ...entry, feedback } : entry)),
    }));

  const regenerate = (entry: ImageEntryT) => {
    if (!session) return;
    const imageId = nextId("g");
    const item = itemFromPrompt(`gen-${imageId}`, entry.prompt, entry.item.ratio, [entry.item.style]);
    append(session.id, [{ id: imageId, kind: "image", prompt: entry.prompt, item }]);
    startJob(session.id, imageId, item);
  };

  const copyPrompt = (entry: ImageEntryT) => {
    navigator.clipboard?.writeText(entry.prompt).catch(() => undefined);
    setCopiedId(entry.id);
  };

  const download = (item: GalleryItem) =>
    toast(`Downloading “${item.title}”`, { id: `dl-${item.id}`, description: "PNG, 2048 × 2048", status: "success" });

  const toggleStyle = useCallback(
    (id: string) => setStyles((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id])),
    [],
  );

  const onPalette = (key: Key) => {
    const value = String(key);
    if (value.startsWith("session:")) selectSession(value.slice(8));
    else if (value === "new") newAgent();
    else if (value === "automations" || value === "customize") setView(value);
    else if (value === "settings") setSettingsOpen(true);
    else if (value === "gallery") {
      setPanelOpen(true);
      setPanelTab("gallery");
    }
  };

  const openPanel = () => setPanelOpen(true);

  return (
    <div className={cx("relative flex h-full w-full gap-3 overflow-hidden bg-background-primary-default p-3", className)}>
      {(drawer || panelDrawer) && (
        <button
          type="button"
          aria-label="Close panel"
          onClick={() => {
            setDrawer(false);
            setPanelDrawer(false);
          }}
          className="absolute inset-0 z-20 bg-black/30 lg:hidden"
        />
      )}

      <div
        className={cx(
          "hidden shrink-0",
          sidebarOpen && "lg:block",
          drawer && "max-lg:absolute max-lg:inset-y-3 max-lg:left-3 max-lg:z-30 max-lg:block",
        )}
      >
        <ImageSidebar
          repos={repos}
          sessionId={session?.id ?? ""}
          view={view}
          onSelectSession={selectSession}
          onNewAgent={newAgent}
          onView={(next) => {
            setView(next);
            setDrawer(false);
          }}
          onSearch={() => setSearchOpen(true)}
          onSettings={() => setSettingsOpen(true)}
          onSupport={() => toast("Support chat opened", { description: "A teammate usually replies within an hour.", status: "information" })}
          onUpgrade={() => toast("Upgrade requested", { description: "Board team will get the Business plan from next cycle.", status: "success" })}
          onAccountChange={(name) => toast(`Switched to ${name}`, { status: "neutral" })}
          onCollapse={() => (drawer ? setDrawer(false) : setSidebarOpen(false))}
        />
      </div>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-3xl bg-background-secondary-default">
        {view === "thread" && session ? (
          <>
            <ThreadHeader
              repoName={repo?.name ?? ""}
              title={session.title}
              sidebarHidden={!sidebarOpen}
              panelHidden={!panelOpen}
              canDelete={allSessions.length > 1}
              onShowSidebar={() => setSidebarOpen(true)}
              onOpenDrawer={() => setDrawer(true)}
              onShowPanel={openPanel}
              onOpenPanelDrawer={() => setPanelDrawer(true)}
              onShare={() => {
                navigator.clipboard?.writeText(`${repo?.name ?? ""} / ${session.title}`).catch(() => undefined);
                toast("Thread link copied", { status: "success" });
              }}
              onDuplicate={duplicate}
              onClear={() => {
                cancelJobsFor(session.id);
                setThreads((prev) => ({ ...prev, [session.id]: [] }));
              }}
              onDelete={() => removeSession(session.id)}
            />
            <ThreadEntries
              entries={entries}
              jobs={jobView}
              copiedId={copiedId}
              scrollKey={session.id}
              onCopyPrompt={copyPrompt}
              onFeedback={setFeedback}
              onRegenerate={regenerate}
              onDownload={download}
              onCancel={(entryId) => {
                const rest = { ...jobsRef.current };
                delete rest[entryId];
                jobsRef.current = rest;
                setJobs(rest);
                setThreads((prev) => ({ ...prev, [session.id]: (prev[session.id] ?? []).filter((e) => e.id !== entryId) }));
              }}
              onSuggestion={(text) => {
                setDraft(text);
                setFocusTick((t) => t + 1);
              }}
            />
            <div className="shrink-0 px-3 pb-3 sm:px-8">
              <div className="mx-auto flex max-w-[640px] flex-col gap-2">
                <ImageComposer
                  draft={draft}
                  onDraftChange={setDraft}
                  onSubmit={send}
                  styles={styles}
                  onToggleStyle={toggleStyle}
                  model={model}
                  onModelChange={setModel}
                  inputRef={inputRef}
                />
                <ComposerStatus
                  branch={branch}
                  onBranch={setBranch}
                  project={project}
                  onProject={setProject}
                  mode={mode}
                  onMode={setMode}
                  contextUsed={contextUsed}
                  contextLimit={CONTEXT_LIMIT}
                />
              </div>
            </div>
          </>
        ) : null}
        <div className={cx("min-h-0 flex-1 flex-col", view === "automations" ? "flex" : "hidden")}>
          <AutomationsView
            onRun={(name, prompt) => {
              if (session) generate(session.id, prompt, []);
              toast(`${name} is running`, { description: `Results land in “${session?.title ?? "the thread"}”.`, status: "information" });
            }}
          />
        </div>
        {view === "customize" && (
          <CustomizeView
            defaultModel={defaultModel}
            onDefaultModel={(id) => {
              setDefaultModel(id);
              setModel(id);
            }}
            aspect={aspect}
            onAspect={setAspect}
            saveToGallery={saveToGallery}
            onSaveToGallery={setSaveToGallery}
            onReset={() => {
              setDefaultModel(DEFAULTS.model);
              setModel(DEFAULTS.model);
              setAspect(DEFAULTS.aspect);
              setSaveToGallery(DEFAULTS.saveToGallery);
              toast("Defaults restored", { status: "neutral" });
            }}
          />
        )}
      </main>

      <aside
        aria-label="Gallery"
        className={cx(
          "hidden shrink-0 flex-col",
          panelWide ? "lg:w-[500px]" : "lg:w-[372px]",
          panelOpen && "lg:flex",
          panelDrawer && "max-lg:absolute max-lg:inset-3 max-lg:z-30 max-lg:flex max-lg:rounded-3xl max-lg:bg-background-primary-default max-lg:shadow-dropdown",
        )}
      >
        <GalleryPanel
          items={gallery}
          tab={panelTab}
          onTabChange={setPanelTab}
          wide={panelWide}
          onToggleWide={() => setPanelWide((on) => !on)}
          onNewImage={newAgent}
          onHide={() => (panelDrawer ? setPanelDrawer(false) : setPanelOpen(false))}
          styles={styles}
          onToggleStyle={toggleStyle}
          onDownload={download}
        />
      </aside>

      <CommandPalette
        isOpen={searchOpen}
        onOpenChange={setSearchOpen}
        shortcut="l"
        aria-label="Quick search"
        placeholder="Search threads and actions…"
        onAction={onPalette}
      >
        <CommandPaletteSection title="Actions">
          <CommandPaletteItem id="new" icon={RiAddLine}>New agent</CommandPaletteItem>
          <CommandPaletteItem id="gallery" icon={RiGalleryLine}>Show gallery</CommandPaletteItem>
          <CommandPaletteItem id="automations" icon={RiRobot2Line}>Automations</CommandPaletteItem>
          <CommandPaletteItem id="customize" icon={RiEqualizer2Line}>Customize</CommandPaletteItem>
          <CommandPaletteItem id="settings" icon={RiSettings4Line}>Settings</CommandPaletteItem>
        </CommandPaletteSection>
        <CommandPaletteSection title="Threads">
          {allSessions.map((s) => (
            <CommandPaletteItem
              key={s.id}
              id={`session:${s.id}`}
              icon={RiImageAiLine}
              description={repos.find((r) => r.sessions.includes(s))?.name}
              textValue={s.title}
            >
              {s.title}
            </CommandPaletteItem>
          ))}
        </CommandPaletteSection>
      </CommandPalette>
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <Toaster />
    </div>
  );
}

