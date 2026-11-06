/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "AI Chat" (boardui.com/templates/ai-chat).
 * No BoardUI source was used.
 */
import { useEffect, useMemo, useState } from "react";
import {
  RiArrowGoBackLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiCheckLine,
  RiCloseLine,
  RiCollapseDiagonalLine,
  RiDeleteBinLine,
  RiExpandDiagonalLine,
  RiGitCommitLine,
  RiGlassesLine,
  RiGlobalLine,
  RiLayoutRightLine,
  RiRefreshLine,
  RiTerminalBoxLine,
} from "@remixicon/react";

import { cx } from "@/registry/lib/cx";
import { Button } from "@/registry/ui/button";
import { DiffCounts } from "@/registry/ui/changes-diff-panel";
import { splitLines, tokenizeTsx, TOKEN_CLASS } from "@/registry/ui/code-block-tokenize";
import { AlertDialog } from "@/registry/ui/modal";
import { fileIconFor } from "@/registry/ui/repo-tree-nav";
import { IconAction, type AiChatFile } from "@/registry/ui/ai-chat-data";

export interface AiChatChangesProps {
  files: AiChatFile[];
  onDiscardAll: () => void;
  onRevertFile: (id: string) => void;
  onCommit: (message: string) => void;
  branch: string;
  /** Last commit summary, shown once the tree is clean. */
  lastCommit: string | null;
  terminal: string[];
  onClearTerminal: () => void;
  wide: boolean;
  onWideChange: (wide: boolean) => void;
  onClose: () => void;
}

const ROUTES = [
  { path: "/", label: "Home" },
  { path: "/pricing", label: "Pricing" },
  { path: "/docs", label: "Docs" },
];

function CodeView({ code }: { code: string }) {
  const lines = useMemo(() => splitLines(tokenizeTsx(code)), [code]);
  return (
    <ol aria-label="File contents" className="font-mono text-caption-1-regular leading-5">
      {lines.map((line, i) => (
        <li key={i} className="flex gap-3">
          <span aria-hidden className="w-6 shrink-0 select-none text-end text-text-tertiary tabular-nums">
            {i + 1}
          </span>
          <code className="min-w-0 flex-1 whitespace-pre-wrap break-words">
            {line.length === 0
              ? " "
              : line.map((tok, j) => (
                  <span key={j} className={TOKEN_CLASS[tok.kind]}>
                    {tok.text}
                  </span>
                ))}
          </code>
        </li>
      ))}
    </ol>
  );
}

/** A tiny stand-in for the app the agent is editing, so the Browser tab has something real to drive. */
function SitePreview({ route, onNavigate }: { route: string; onNavigate: (path: string) => void }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-separator-border bg-background-primary-default">
      <nav aria-label="Preview site" className="flex items-center gap-3 border-b border-separator-border px-4 py-2.5">
        <span className="text-body-2-bold text-text-primary">vibl</span>
        <span className="flex-1" />
        {ROUTES.map((r) => (
          <button
            key={r.path}
            type="button"
            onClick={() => onNavigate(r.path)}
            aria-current={route === r.path ? "page" : undefined}
            className={cx(
              "cursor-pointer rounded-md px-1.5 py-0.5 text-caption-1-medium outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
              route === r.path ? "text-text-primary" : "text-text-tertiary hover:text-text-primary",
            )}
          >
            {r.label}
          </button>
        ))}
      </nav>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
        {route === "/" && (
          <>
            <p className="text-title-3-semibold text-text-primary">Ship the screen, not the setup.</p>
            <p className="text-body-2-regular text-text-secondary">Tokens, components and a theme toggle that respects both modes.</p>
            <button
              type="button"
              onClick={() => onNavigate("/pricing")}
              className="w-fit cursor-pointer rounded-full bg-blue-500 px-3 py-1.5 text-caption-1-semibold text-text-white outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
            >
              See pricing
            </button>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {["Tokens", "Toggle", "Build"].map((c) => (
                <div key={c} className="rounded-lg bg-background-secondary-default p-3">
                  <div className="mb-2 size-5 rounded-md bg-status-blue-background" />
                  <p className="text-caption-1-semibold text-text-primary">{c}</p>
                </div>
              ))}
            </div>
          </>
        )}
        {route === "/pricing" && (
          <div className="grid grid-cols-2 gap-2">
            {[
              { name: "Solo", price: "$0" },
              { name: "Team", price: "$24" },
            ].map((p) => (
              <div key={p.name} className="rounded-lg border border-separator-border p-3">
                <p className="text-caption-1-medium text-text-secondary">{p.name}</p>
                <p className="text-title-3-semibold text-text-primary">{p.price}</p>
                <p className="text-caption-2-regular text-text-tertiary">per seat, monthly</p>
              </div>
            ))}
          </div>
        )}
        {route === "/docs" && (
          <ul className="flex flex-col gap-2">
            {["Installation", "Theming", "Dark mode tokens", "Theme toggle"].map((d) => (
              <li key={d} className="rounded-md bg-background-secondary-default px-3 py-2 text-caption-1-medium text-text-primary">
                {d}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function AiChatChanges({
  files,
  onDiscardAll,
  onRevertFile,
  onCommit,
  branch,
  lastCommit,
  terminal,
  onClearTerminal,
  wide,
  onWideChange,
  onClose,
}: AiChatChangesProps) {
  const [tab, setTab] = useState<"changes" | "browser">("changes");
  const [selected, setSelected] = useState<string | null>(files[0]?.id ?? null);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState({ stack: ["/"], index: 0 });
  const [loading, setLoading] = useState(false);

  const current = files.find((f) => f.id === selected) ?? files[0] ?? null;
  const added = files.reduce((n, f) => n + f.added, 0);
  const removed = files.reduce((n, f) => n + f.removed, 0);
  const route = history.stack[history.index] ?? "/";

  // A reload or navigation shows a short loading bar.
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, [loading]);

  const navigate = (path: string) => {
    setHistory((h) => ({ stack: [...h.stack.slice(0, h.index + 1), path], index: h.index + 1 }));
    setLoading(true);
  };
  const go = (delta: number) => {
    setHistory((h) => ({ ...h, index: Math.min(h.stack.length - 1, Math.max(0, h.index + delta)) }));
    setLoading(true);
  };

  const TAB = "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-caption-1-medium outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring";

  return (
    <aside
      aria-label="Changes and browser"
      className={cx(
        "flex shrink-0 flex-col overflow-hidden rounded-2xl bg-background-primary-default",
        "transition-[width] duration-300 ease-out motion-reduce:transition-none",
        wide ? "w-[560px]" : "w-[400px]",
      )}
    >
      <header className="flex h-12 shrink-0 items-center gap-1 px-3">
        <div role="tablist" aria-label="Panel view" className="flex items-center gap-1">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "changes"}
            onClick={() => setTab("changes")}
            className={cx(TAB, tab === "changes" ? "bg-status-blue-background text-status-blue-text" : "text-text-secondary hover:text-text-primary")}
          >
            <RiGlassesLine aria-hidden className="size-4" />
            Changes
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "browser"}
            onClick={() => setTab("browser")}
            className={cx(TAB, tab === "browser" ? "bg-status-blue-background text-status-blue-text" : "text-text-secondary hover:text-text-primary")}
          >
            <RiGlobalLine aria-hidden className="size-4" />
            Browser
          </button>
        </div>
        <span className="flex-1" />
        <IconAction label={terminalOpen ? "Hide terminal" : "Show terminal"} icon={RiTerminalBoxLine} active={terminalOpen} onPress={() => setTerminalOpen((o) => !o)} />
        <IconAction label={wide ? "Narrow panel" : "Widen panel"} icon={wide ? RiCollapseDiagonalLine : RiExpandDiagonalLine} onPress={() => onWideChange(!wide)} />
        <IconAction label="Hide panel" icon={RiLayoutRightLine} onPress={onClose} />
      </header>

      {tab === "changes" ? (
        <div role="tabpanel" aria-label="Changes" className="flex min-h-0 flex-1 flex-col">
          {files.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
              <span className="grid size-10 place-items-center rounded-full bg-background-secondary-default">
                <RiCheckLine aria-hidden className="size-5 text-foreground-icon-secondary" />
              </span>
              <p className="text-body-2-semibold text-text-primary">Working tree clean</p>
              <p className="text-caption-1-regular text-text-tertiary">{lastCommit ?? `Nothing to commit on ${branch}.`}</p>
            </div>
          ) : (
            <>
              <div className="mx-3 flex items-center gap-2 rounded-lg bg-background-secondary-default py-1 pe-1 ps-2.5">
                <p className="flex min-w-0 flex-1 items-center gap-1.5 text-caption-1-medium text-text-secondary">
                  <span data-testid="change-count">
                    {files.length} Uncommitted {files.length === 1 ? "change" : "changes"}
                  </span>
                  <DiffCounts added={added} removed={removed} />
                </p>
                <IconAction label="Discard all changes" icon={RiArrowGoBackLine} onPress={() => setConfirmDiscard(true)} />
              </div>
              <ul aria-label="Changed files" className="flex flex-col gap-0.5 px-3 pt-1.5">
                {files.map((f) => {
                  const Icon = fileIconFor(f.path);
                  const active = current?.id === f.id;
                  return (
                    <li key={f.id} className="group/file flex items-center gap-1">
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => setSelected(f.id)}
                        className={cx(
                          "flex h-7 min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-md px-2 text-start outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                          active ? "bg-background-secondary-default" : "hover:bg-background-secondary-default",
                        )}
                      >
                        <Icon aria-hidden className="size-3.5 shrink-0 text-status-blue-text" />
                        <span className="min-w-0 flex-1 truncate font-mono text-caption-1-regular text-text-primary">{f.path}</span>
                        <DiffCounts added={f.added} removed={f.removed} hideZero className="shrink-0" />
                        <span className="shrink-0 rounded bg-background-tertiary-default px-1 text-caption-2-medium text-text-tertiary">
                          {f.isNew ? "New" : "Edited"}
                        </span>
                      </button>
                      <IconAction
                        label={`Revert ${f.path}`}
                        icon={RiDeleteBinLine}
                        onPress={() => onRevertFile(f.id)}
                        className="size-6 opacity-0 group-hover/file:opacity-100 data-[focus-visible]:opacity-100"
                      />
                    </li>
                  );
                })}
              </ul>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{current && <CodeView code={current.code} />}</div>
              <form
                className="flex shrink-0 items-center gap-2 border-t border-separator-border p-2.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  onCommit(message.trim() || `Update ${files.length} ${files.length === 1 ? "file" : "files"}`);
                  setMessage("");
                }}
              >
                <input
                  aria-label="Commit message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`Commit to ${branch}`}
                  className="h-8 min-w-0 flex-1 rounded-lg border border-border-button-default bg-background-primary-default px-2.5 text-caption-1-regular text-text-primary outline-none placeholder:text-text-placeholder focus:ring-2 focus:ring-border-focus-ring"
                />
                <Button type="submit" size="small" variant="primary" leadingIcon={RiGitCommitLine}>
                  Commit
                </Button>
              </form>
            </>
          )}
        </div>
      ) : (
        <div role="tabpanel" aria-label="Browser" className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-3">
          <div className="flex items-center gap-1">
            <IconAction label="Back" icon={RiArrowLeftLine} onPress={() => go(-1)} className={cx(history.index === 0 && "opacity-40")} />
            <IconAction
              label="Forward"
              icon={RiArrowRightLine}
              onPress={() => go(1)}
              className={cx(history.index >= history.stack.length - 1 && "opacity-40")}
            />
            <IconAction label="Reload" icon={RiRefreshLine} onPress={() => setLoading(true)} />
            <div className="relative flex h-7 min-w-0 flex-1 items-center overflow-hidden rounded-full bg-background-secondary-default px-3">
              <span data-testid="browser-url" className="truncate font-mono text-caption-1-regular text-text-secondary">
                localhost:3000{route}
              </span>
              {loading && <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 animate-pulse bg-blue-500 motion-reduce:animate-none" />}
            </div>
          </div>
          <div className={cx("min-h-0 flex-1 transition-opacity duration-200 ease-out motion-reduce:transition-none", loading && "opacity-50")}>
            <SitePreview route={route} onNavigate={navigate} />
          </div>
        </div>
      )}

      {terminalOpen && (
        <section aria-label="Terminal" className="flex h-40 shrink-0 flex-col border-t border-separator-border bg-background-secondary-default">
          <div className="flex items-center gap-1 px-3 pt-1.5">
            <p className="flex-1 text-caption-1-semibold text-text-secondary">Terminal</p>
            <IconAction label="Clear terminal" icon={RiDeleteBinLine} onPress={onClearTerminal} className="size-6" />
            <IconAction label="Close terminal" icon={RiCloseLine} onPress={() => setTerminalOpen(false)} className="size-6" />
          </div>
          <pre className="min-h-0 flex-1 overflow-y-auto px-3 pb-2 font-mono text-caption-1-regular leading-5 text-text-secondary">
            {terminal.length ? terminal.join("\n") : "$ waiting for the agent…"}
          </pre>
        </section>
      )}

      <AlertDialog
        isOpen={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard all changes?"
        description={`${files.length} uncommitted ${files.length === 1 ? "file goes" : "files go"} back to the last commit on ${branch}.`}
        confirmLabel="Discard"
        onConfirm={onDiscardAll}
      />
    </aside>
  );
}
