/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Multi Agent Chat" (boardui.com/components/multi-agent-chat).
 * No BoardUI source was used.
 */
"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { RiCheckLine, RiCustomerService2Line, RiFileCopyLine, RiSettings3Line, RiStore2Line } from "@remixicon/react";
import { Button as AriaButton } from "react-aria-components";

import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";
import { cx } from "@/registry/lib/cx";
import type { AgentDraft } from "@/registry/ui/agent-creator";
import { PaperAvatar } from "@/registry/ui/agent-creator-avatar";
import type { AgentRunAction } from "@/registry/ui/agent-detail-panel";
import { AgentListPanel, type AgentListItem } from "@/registry/ui/agent-list-panel";
import { Button } from "@/registry/ui/button";
import { useCopyToClipboard } from "@/registry/ui/code-block-copy";
import type { ComposerPanelMessage } from "@/registry/ui/composer-panel";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/registry/ui/modal";
import { SettingsModal } from "@/registry/ui/settings-modal";
import { Switch } from "@/registry/ui/switch";
import { WorkspaceSwitcher, type Workspace } from "@/registry/ui/workspace-switcher";
import { MacConversationView, type MacLiveReply } from "@/registry/ui/multi-agent-chat-conversation";
import { MacSidePanel, type MacActivity, type MacSideTab } from "@/registry/ui/multi-agent-chat-side";
import {
  AvatarCluster,
  MAC_AGENTS,
  MAC_CONVERSATIONS,
  MAC_MARKET_BOTS,
  MAC_PLUGINS,
  MAC_WORKSPACES,
  MacIconAction,
  replyFor,
  type MacAgent,
  type MacConversation,
  type MacMessage,
} from "@/registry/ui/multi-agent-chat-data";

export interface MultiAgentChatProps {
  agents?: MacAgent[];
  conversations?: MacConversation[];
  workspaces?: Workspace[];
  defaultWorkspaceId?: string;
  defaultConversationId?: string;
  className?: string;
}

/** One round of replies: every agent in the queue answers the prompt in turn. */
interface MacRun {
  id: number;
  convId: string;
  prompt: string;
  queue: string[];
  index: number;
  phase: "thinking" | "streaming";
  full: string;
  shown: number;
  paused: boolean;
  plan: boolean;
  /** Multiplier on thinking time from the composer's model. */
  pace: number;
  startedAt: string;
}

/** Thinking time before an agent starts writing, by the agent's own model. */
const THINK_MS: Record<string, number> = { swift: 500, balanced: 900, deep: 1600 };
/** Composer model ids scale every agent's thinking time. */
const MODEL_PACE: Record<string, number> = { "swift-2-mini": 0.5, "swift-2": 1, "deep-1": 1.6 };
const TICK_MS = 24;
/** Characters per tick at speed 1; an agent's playback speed scales it. */
const CHUNK = 3;
/** Pause on a finished reply before the next agent takes its turn. */
const HAND_OFF_MS = 380;
const SUPPORT_EMAIL = "support@kinetic.local";

const clock = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export function MultiAgentChat({
  agents: seedAgents = MAC_AGENTS,
  conversations: seedConversations = MAC_CONVERSATIONS,
  workspaces: seedWorkspaces = MAC_WORKSPACES,
  defaultWorkspaceId = "board",
  defaultConversationId = "group",
  className,
}: MultiAgentChatProps) {
  const reduced = useReducedMotion();
  const [agents, setAgents] = useState(seedAgents);
  const [conversations, setConversations] = useState(seedConversations);
  const [workspaces, setWorkspaces] = useState(seedWorkspaces);
  const [workspaceId, setWorkspaceId] = useState(defaultWorkspaceId);
  const [openId, setOpenId] = useState(defaultConversationId);
  const [run, setRun] = useState<MacRun | null>(null);
  const [lastRuns, setLastRuns] = useState<Record<string, MacActivity>>({});
  const [panelOpen, setPanelOpen] = useState(true);
  const [tab, setTab] = useState<MacSideTab>("agent");
  const [editId, setEditId] = useState(seedAgents[0]?.id ?? "new");
  const [notice, setNotice] = useState<string | null>(null);
  const [modal, setModal] = useState<"market" | "support" | "settings" | null>(null);
  const [marketTab, setMarketTab] = useState<"bots" | "plugins">("bots");
  const [plugins, setPlugins] = useState(MAC_PLUGINS);
  const { copied, copy } = useCopyToClipboard(1600);
  const seq = useRef(100);
  const openRef = useRef(openId);
  useEffect(() => {
    openRef.current = openId;
  }, [openId]);

  const open = conversations.find((c) => c.id === openId) ?? conversations.find((c) => c.workspaceId === workspaceId);
  const nextId = (prefix: string) => `${prefix}-${++seq.current}`;

  const patchConv = (id: string, patch: (c: MacConversation) => MacConversation) =>
    setConversations((cs) => cs.map((c) => (c.id === id ? patch(c) : c)));

  const record = (r: MacRun, done: number, status: MacActivity["status"]) => {
    const title = conversations.find((c) => c.id === r.convId)?.title ?? "Conversation";
    setLastRuns((all) => ({ ...all, [r.convId]: { title, prompt: r.prompt, queue: r.queue, done, status, startedAt: r.startedAt } }));
  };

  const commit = (r: MacRun, text: string) => {
    const agentId = r.queue[r.index];
    if (!agentId) return;
    const msg: MacMessage = { id: `m${r.id}-${r.index}`, from: agentId, text, time: clock() };
    patchConv(r.convId, (c) => ({
      ...c,
      messages: [...c.messages, msg],
      time: "now",
      unread: c.id === openRef.current ? c.unread : (c.unread ?? 0) + 1,
    }));
  };

  // #region critical
  // One timeout at a time drives the run. Thinking waits on the agent's model,
  // streaming appends a chunk per tick, and a finished reply is committed to
  // the conversation before the next agent in the queue starts thinking.
  // Every change to the run re-arms the effect, so cleanup always clears the
  // only pending timer: Stop, Pause, deleting the chat or unmounting is safe.
  useEffect(() => {
    if (!run || run.paused) return;
    const agent = agents.find((a) => a.id === run.queue[run.index]);
    const advance = () => {
      const index = run.index + 1;
      if (index < run.queue.length) {
        record(run, index, "running");
        setRun({ ...run, index, phase: "thinking", full: "", shown: 0 });
      } else {
        record(run, run.queue.length, "done");
        setRun(null);
      }
    };
    let timer: ReturnType<typeof setTimeout>;
    if (!agent) {
      timer = setTimeout(advance, 0);
    } else if (run.phase === "thinking") {
      timer = setTimeout(() => {
        const full = replyFor(agent, run.prompt, run.id + run.index, run.plan);
        setRun({ ...run, phase: "streaming", full, shown: reduced ? full.length : 0 });
      }, (THINK_MS[agent.model] ?? 900) * run.pace);
    } else if (run.shown < run.full.length) {
      const step = Math.max(1, Math.round(CHUNK * Number(agent.speed || 1)));
      timer = setTimeout(() => setRun({ ...run, shown: Math.min(run.full.length, run.shown + step) }), TICK_MS);
    } else {
      timer = setTimeout(() => {
        commit(run, run.full);
        advance();
      }, HAND_OFF_MS);
    }
    return () => clearTimeout(timer);
    // record and commit only read state through setters and refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, agents, reduced]);
  // #endregion

  const startRun = (convId: string, prompt: string, queue: string[], plan: boolean, pace: number) => {
    const r: MacRun = {
      id: ++seq.current,
      convId,
      prompt,
      queue,
      index: 0,
      phase: "thinking",
      full: "",
      shown: 0,
      paused: false,
      plan,
      pace,
      startedAt: clock(),
    };
    setRun(r);
    record(r, 0, "running");
  };

  const ask = (text: string, plan = false, pace = 1) => {
    if (run || !open) return;
    const queue = open.agentIds.filter((id) => agents.some((a) => a.id === id));
    if (!queue.length || !text.trim()) return;
    const msg: MacMessage = { id: nextId("u"), from: "user", text: text.trim(), time: clock() };
    patchConv(open.id, (c) => ({ ...c, messages: [...c.messages, msg], time: "now" }));
    startRun(open.id, text.trim(), queue, plan, pace);
  };

  const send = (m: ComposerPanelMessage) => {
    const files = m.attachments.length ? `\n\n(${m.attachments.length === 1 ? "1 file" : `${m.attachments.length} files`} attached)` : "";
    ask(`${m.text}${files}`, m.permission === "plan", MODEL_PACE[m.model.id] ?? 1);
  };

  const stop = (keepPartial = true) => {
    if (!run) return;
    const partial = run.phase === "streaming" && run.shown > 0;
    if (keepPartial && partial) commit(run, `${run.full.slice(0, run.shown).trimEnd()}…`);
    record(run, run.index + (keepPartial && partial ? 1 : 0), "stopped");
    setRun(null);
  };

  const runAction = (action: AgentRunAction) => {
    if (action === "pause") setRun((r) => r && { ...r, paused: true });
    else if (action === "resume") setRun((r) => r && { ...r, paused: false });
    else if (action === "stop") stop();
    else {
      const last = open ? lastRuns[open.id] : undefined;
      if (!run && last && open) startRun(open.id, last.prompt, last.queue, false, 1);
    }
  };

  const selectConversation = (id: string) => {
    setOpenId(id);
    patchConv(id, (c) => ({ ...c, unread: 0 }));
  };

  const createConversation = (ws = workspaceId, agentIds = ["designer", "marketing", "planner"]) => {
    const conv: MacConversation = {
      id: nextId("conv"),
      workspaceId: ws,
      title: "New conversation",
      agentIds: agentIds.filter((id) => agents.some((a) => a.id === id)),
      messages: [],
      time: "now",
    };
    if (!conv.agentIds.length && agents[0]) conv.agentIds = [agents[0].id];
    setConversations((cs) => [conv, ...cs]);
    setOpenId(conv.id);
    return conv;
  };

  const deleteConversation = (id: string) => {
    if (run?.convId === id) setRun(null);
    const rest = conversations.filter((c) => c.id !== id);
    setConversations(rest);
    const next = rest.find((c) => c.workspaceId === workspaceId);
    if (next) setOpenId(next.id);
    else createConversation();
  };

  const switchWorkspace = (id: string) => {
    setWorkspaceId(id);
    const first = conversations.find((c) => c.workspaceId === id);
    if (first) selectConversation(first.id);
    else createConversation(id);
  };

  const createWorkspace = () => {
    const n = workspaces.length + 1;
    const ws: Workspace = { id: nextId("ws"), name: `Workspace ${n}`, plan: "Free plan", detail: "Only you", tone: "pink" };
    setWorkspaces((all) => [...all, ws]);
    setWorkspaceId(ws.id);
    createConversation(ws.id);
  };

  const toggleParticipant = (agentId: string) => {
    if (!open) return;
    patchConv(open.id, (c) => {
      const on = c.agentIds.includes(agentId);
      const next = on ? c.agentIds.filter((id) => id !== agentId) : [...c.agentIds, agentId];
      return { ...c, agentIds: agents.map((a) => a.id).filter((id) => next.includes(id)) };
    });
  };

  const editAgent = (id: string) => {
    setEditId(id);
    setNotice(null);
    setTab("agent");
    setPanelOpen(true);
  };

  const addAgent = (draft: AgentDraft | MacAgent, id = nextId("agent")) => {
    const added: MacAgent = { ...draft, id };
    setAgents((all) => [...all, added]);
    if (open) patchConv(open.id, (c) => ({ ...c, agentIds: [...c.agentIds, id] }));
    setEditId(id);
    setTab("agent");
    setPanelOpen(true);
    setNotice(`${added.name} joined ${open?.title ?? "the conversation"}.`);
  };

  const updateAgent = (id: string, draft: AgentDraft) => setAgents((all) => all.map((a) => (a.id === id ? { ...draft, id } : a)));

  const byId = new Map(agents.map((a) => [a.id, a]));
  const items: AgentListItem[] = conversations
    .filter((c) => c.workspaceId === workspaceId)
    .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)))
    .map((c) => {
      const members = c.agentIds.flatMap((id) => byId.get(id) ?? []);
      const live = run?.convId === c.id;
      const last = c.messages[c.messages.length - 1];
      const speaker = live ? byId.get(run.queue[run.index] ?? "") : undefined;
      return {
        id: c.id,
        name: c.pinned ? `${c.title} · pinned` : c.title,
        lastMessage: live ? `${speaker?.name ?? "An agent"} is replying…` : (last?.text ?? "Start a conversation"),
        time: c.time,
        status: live ? (run.paused ? "waiting" : "running") : c.messages.length ? "done" : "idle",
        unread: c.unread || undefined,
        avatar: <AvatarCluster agents={members} size={32} />,
      };
    });

  const liveRun = run && open && run.convId === open.id ? run : null;
  const live: MacLiveReply | null = liveRun
    ? {
        agentId: liveRun.queue[liveRun.index] ?? "",
        phase: liveRun.phase,
        text: liveRun.full.slice(0, liveRun.shown),
        paused: liveRun.paused,
        waiting: liveRun.queue.slice(liveRun.index + 1),
      }
    : null;
  const activity: MacActivity | null =
    liveRun && open
      ? {
          title: open.title,
          prompt: liveRun.prompt,
          queue: liveRun.queue,
          done: liveRun.index,
          status: liveRun.paused ? "paused" : "running",
          startedAt: liveRun.startedAt,
        }
      : open
        ? (lastRuns[open.id] ?? null)
        : null;

  return (
    <div className={cx("flex h-full w-full gap-2 overflow-hidden bg-background-primary-default p-2 text-text-primary", className)}>
      <AgentListPanel
        className="w-[272px] shrink-0"
        aria-label="Conversations"
        agents={items}
        selectedId={open?.id ?? null}
        onSelect={(id) => selectConversation(id)}
        onCreate={() => createConversation()}
        createLabel="New conversation"
        emptyLabel="No conversations match."
        toolbar={<MacIconAction label="Marketplace" icon={RiStore2Line} onPress={() => setModal("market")} />}
        footer={
          <div className="flex flex-col gap-0.5">
            <FooterRow icon={RiCustomerService2Line} label="Support" onPress={() => setModal("support")} />
            <FooterRow icon={RiSettings3Line} label="Settings" onPress={() => setModal("settings")} />
            <WorkspaceSwitcher
              workspaces={workspaces}
              value={workspaceId}
              onChange={switchWorkspace}
              onCreateWorkspace={createWorkspace}
              createLabel="New workspace"
            />
          </div>
        }
      />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {open && (
          <MacConversationView
            key={open.id}
            conversation={open}
            agents={agents}
            live={live}
            busyElsewhere={Boolean(run && run.convId !== open.id)}
            panelOpen={panelOpen}
            reduced={reduced}
            onTogglePanel={() => setPanelOpen((p) => !p)}
            onSend={send}
            onStop={() => stop()}
            onToggleParticipant={toggleParticipant}
            onEditAgent={editAgent}
            onRename={(title) => patchConv(open.id, (c) => ({ ...c, title }))}
            onTogglePin={() => patchConv(open.id, (c) => ({ ...c, pinned: !c.pinned }))}
            onClear={() => {
              if (run?.convId === open.id) setRun(null);
              patchConv(open.id, (c) => ({ ...c, messages: [] }));
              setLastRuns(({ [open.id]: _gone, ...rest }) => rest);
            }}
            onDelete={() => deleteConversation(open.id)}
          />
        )}
      </main>

      {panelOpen && (
        <MacSidePanel
          tab={tab}
          onTabChange={setTab}
          onClose={() => setPanelOpen(false)}
          agents={agents}
          editId={agents.some((a) => a.id === editId) ? editId : "new"}
          onEditChange={(id) => {
            setEditId(id);
            setNotice(null);
          }}
          onUpdateAgent={updateAgent}
          onCreateAgent={(draft) => addAgent(draft)}
          notice={notice}
          activity={activity}
          onRunAction={runAction}
          onAskAboutFile={(path) => ask(`Walk me through the changes in ${path}.`)}
          canAsk={!run && Boolean(open?.agentIds.length)}
        />
      )}

      <Modal isOpen={modal === "market"} onOpenChange={(o) => !o && setModal(null)} size="md">
        <ModalHeader title="Marketplace" description="Add ready-made agents to the team, or turn plugins on for every agent.">
          <div role="group" aria-label="Marketplace section" className="mt-3 flex w-fit gap-0.5 rounded-xl bg-background-tertiary-default p-0.5">
            {(["bots", "plugins"] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={marketTab === t}
                onClick={() => setMarketTab(t)}
                className={cx(
                  "cursor-pointer rounded-[10px] px-3 py-1 text-body-2-medium outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                  marketTab === t ? "bg-background-primary-default text-text-primary shadow-card" : "text-text-secondary hover:text-text-primary",
                )}
              >
                {t === "bots" ? "Bots" : "Plugins"}
              </button>
            ))}
          </div>
        </ModalHeader>
        <ModalBody className="flex flex-col gap-2 pb-2">
          {marketTab === "bots"
            ? MAC_MARKET_BOTS.map((bot) => {
                const added = agents.some((a) => a.id === bot.id);
                return (
                  <div key={bot.id} className="flex items-center gap-3 rounded-2xl border border-border-button-default p-3">
                    <PaperAvatar shape={bot.shape} face={bot.face} color={bot.color} size={40} grain={false} />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-body-2-semibold text-text-primary">{bot.name}</span>
                      <span className="text-caption-1-regular text-text-tertiary">{bot.description}</span>
                    </div>
                    <Button
                      size="xs"
                      variant={added ? "secondary" : "primary"}
                      aria-label={added ? `Edit ${bot.name}` : `Add ${bot.name}`}
                      onClick={() => {
                        setModal(null);
                        if (added) editAgent(bot.id);
                        else addAgent(bot, bot.id);
                      }}
                    >
                      {added ? "Edit" : "Add"}
                    </Button>
                  </div>
                );
              })
            : plugins.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-border-button-default p-3">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-body-2-semibold text-text-primary">{p.name}</span>
                    <span className="text-caption-1-regular text-text-tertiary">{p.description}</span>
                  </div>
                  <Switch
                    aria-label={p.name}
                    isSelected={p.installed}
                    onChange={(on) => setPlugins((all) => all.map((x) => (x.id === p.id ? { ...x, installed: on } : x)))}
                  />
                </div>
              ))}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setModal(null)}>
            Done
          </Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={modal === "support"} onOpenChange={(o) => !o && setModal(null)} size="sm">
        <ModalHeader title="Support" description="Tell us which conversation went wrong and we reply within one working day." />
        <ModalBody className="pb-2">
          <div className="flex items-center gap-2 rounded-xl bg-background-secondary-default p-3">
            <span className="flex-1 font-mono text-body-2-regular text-text-primary">{SUPPORT_EMAIL}</span>
            <Button size="xs" variant="secondary" leadingIcon={copied ? RiCheckLine : RiFileCopyLine} onClick={() => void copy(SUPPORT_EMAIL)}>
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

      <SettingsModal isOpen={modal === "settings"} onClose={() => setModal(null)} />
    </div>
  );
}

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

function FooterRow({ icon: Icon, label, onPress }: { icon: IconComponent; label: string; onPress: () => void }) {
  return (
    <AriaButton
      onPress={onPress}
      className="flex h-8 cursor-pointer items-center gap-2 rounded-xl px-2 text-body-2-medium text-text-secondary outline-none transition-colors duration-150 ease-out hover:bg-background-secondary-hover hover:text-text-primary data-[focus-visible]:ring-2 data-[focus-visible]:ring-border-focus-ring motion-reduce:transition-none"
    >
      <Icon aria-hidden className="size-4 text-foreground-icon-secondary" />
      {label}
    </AriaButton>
  );
}
