/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Multi Agent Chat" (boardui.com/components/multi-agent-chat).
 * No BoardUI source was used.
 */
"use client";

import { useState } from "react";
import { RiArrowDownSLine, RiCloseLine, RiPulseLine, RiQuestionAnswerLine, RiUserAddLine } from "@remixicon/react";
import { Tab, TabList, Tabs } from "react-aria-components";

import { cx } from "@/registry/lib/cx";
import { AgentCreator, type AgentDraft } from "@/registry/ui/agent-creator";
import { PaperAvatar } from "@/registry/ui/agent-creator-avatar";
import { AgentDetailPanel, type AgentRunAction, type AgentRunStatus, type AgentStep } from "@/registry/ui/agent-detail-panel";
import { Button } from "@/registry/ui/button";
import { DiffCounts } from "@/registry/ui/changes-diff-panel";
import { Dropdown, DropdownDivider, DropdownItem, DropdownPopover, DropdownTrigger } from "@/registry/ui/dropdown";
import { RepoTreeNav, summarizeChanges, type RepoTreeNode } from "@/registry/ui/repo-tree-nav";
import {
  AvatarCluster,
  MAC_FILE_OWNERS,
  MAC_TREE,
  MacIconAction,
  hexOf,
  type MacAgent,
} from "@/registry/ui/multi-agent-chat-data";

export type MacSideTab = "agent" | "files" | "activity";

/** The latest run of the open conversation, shaped for the Activity tab. */
export interface MacActivity {
  title: string;
  prompt: string;
  queue: string[];
  /** Replies finished so far. */
  done: number;
  status: AgentRunStatus;
  startedAt: string;
}

export interface MacSidePanelProps {
  tab: MacSideTab;
  onTabChange: (tab: MacSideTab) => void;
  onClose: () => void;
  agents: MacAgent[];
  /** Agent id being edited, or "new" for the create form. */
  editId: string;
  onEditChange: (id: string) => void;
  onUpdateAgent: (id: string, draft: AgentDraft) => void;
  onCreateAgent: (draft: AgentDraft) => void;
  notice: string | null;
  activity: MacActivity | null;
  onRunAction: (action: AgentRunAction) => void;
  onAskAboutFile: (path: string) => void;
  canAsk: boolean;
}

const TABS: { id: MacSideTab; label: string }[] = [
  { id: "agent", label: "Agent" },
  { id: "files", label: "Files" },
  { id: "activity", label: "Activity" },
];

const findNode = (nodes: RepoTreeNode[], id: string): RepoTreeNode | undefined => {
  for (const n of nodes) {
    if (n.id === id) return n;
    const hit = n.children && findNode(n.children, id);
    if (hit) return hit;
  }
  return undefined;
};

export function MacSidePanel(props: MacSidePanelProps) {
  const { tab, onTabChange, onClose } = props;
  return (
    <aside aria-label="Conversation panel" className="flex w-[356px] shrink-0 flex-col gap-2">
      <div className="flex h-10 shrink-0 items-center gap-2 ps-1">
        <Tabs selectedKey={tab} onSelectionChange={(k) => onTabChange(k as MacSideTab)} className="min-w-0 flex-1">
          <TabList aria-label="Panel" className="flex w-fit gap-0.5 rounded-xl bg-background-tertiary-default p-0.5">
            {TABS.map((t) => (
              <Tab
                key={t.id}
                id={t.id}
                className={cx(
                  "cursor-pointer rounded-[10px] px-3 py-1 text-body-2-medium text-text-secondary outline-none",
                  "transition-colors duration-150 ease-out motion-reduce:transition-none",
                  "data-[hovered]:text-text-primary data-[focus-visible]:ring-2 data-[focus-visible]:ring-border-focus-ring",
                  "data-[selected]:bg-background-primary-default data-[selected]:text-text-primary data-[selected]:shadow-card",
                )}
              >
                {t.label}
              </Tab>
            ))}
          </TabList>
        </Tabs>
        <MacIconAction label="Close panel" icon={RiCloseLine} onPress={onClose} />
      </div>
      {tab === "agent" && <AgentTab {...props} />}
      {tab === "files" && <FilesTab {...props} />}
      {tab === "activity" && <ActivityTab {...props} />}
    </aside>
  );
}

/* -------------------------------------------------------------- agent tab */

function AgentTab({ agents, editId, onEditChange, onUpdateAgent, onCreateAgent, notice }: MacSidePanelProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [rev, setRev] = useState(0);
  const editing = agents.find((a) => a.id === editId);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 items-center gap-2">
        <Dropdown isOpen={pickerOpen} onOpenChange={setPickerOpen}>
          <DropdownTrigger
            aria-label="Choose agent to edit"
            className="flex h-8 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-xl border border-border-button-default bg-background-primary-default px-2 text-start outline-none hover:bg-background-secondary-default data-[focus-visible]:ring-2 data-[focus-visible]:ring-border-focus-ring"
          >
            {editing && <PaperAvatar shape={editing.shape} face={editing.face} color={editing.color} size={20} grain={false} />}
            <span className="min-w-0 flex-1 truncate text-body-2-medium text-text-primary">
              {editing ? editing.name || "Unnamed agent" : "New agent"}
            </span>
            <RiArrowDownSLine aria-hidden className="size-4 shrink-0 text-foreground-icon-secondary" />
          </DropdownTrigger>
          <DropdownPopover aria-label="Agents" placement="bottom start" className="w-[260px]">
            {agents.map((a) => (
              <DropdownItem
                key={a.id}
                selected={a.id === editId}
                className="px-2 py-1.5"
                onSelect={() => {
                  setPickerOpen(false);
                  onEditChange(a.id);
                }}
              >
                <PaperAvatar shape={a.shape} face={a.face} color={a.color} size={22} grain={false} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-body-2-medium text-text-primary">{a.name}</span>
                  <span className="truncate text-caption-1-regular text-text-tertiary">{a.label}</span>
                </span>
              </DropdownItem>
            ))}
            <DropdownDivider />
            <DropdownItem
              className="px-2 py-1.5"
              onSelect={() => {
                setPickerOpen(false);
                onEditChange("new");
              }}
            >
              <RiUserAddLine aria-hidden className="size-4 text-foreground-icon-secondary" />
              <span className="text-body-2-medium text-text-primary">New agent</span>
            </DropdownItem>
          </DropdownPopover>
        </Dropdown>
        <Button size="xs" variant="secondary" leadingIcon={RiUserAddLine} onClick={() => onEditChange("new")} aria-pressed={!editing}>
          New
        </Button>
      </div>
      {notice && (
        <p role="status" className="shrink-0 rounded-xl bg-status-lime-background px-3 py-1.5 text-caption-1-medium text-status-lime-text">
          {notice}
        </p>
      )}
      {editing ? (
        <AgentEditor
          key={`${editing.id}-${rev}`}
          agent={editing}
          onChange={(d) => onUpdateAgent(editing.id, d)}
          onSave={() => setRev((r) => r + 1)}
        />
      ) : (
        <AgentCreator
          key={`new-${rev}`}
          className="min-h-0 max-w-none flex-1 shadow-none"
          defaultValue={{ color: hexOf("pink"), face: "cheerful", shape: "cloud" }}
          submitLabel="Create agent"
          onCreate={(draft) => {
            onCreateAgent(draft);
            setRev((r) => r + 1);
          }}
        />
      )}
    </div>
  );
}

/** Edits apply live; Reset returns to the agent as it was when the editor opened or was last saved. */
function AgentEditor({ agent, onChange, onSave }: { agent: MacAgent; onChange: (d: AgentDraft) => void; onSave: () => void }) {
  const [snapshot] = useState<AgentDraft>(agent);
  return (
    <AgentCreator
      className="min-h-0 max-w-none flex-1 shadow-none"
      value={agent}
      defaultValue={snapshot}
      onChange={onChange}
      onCreate={onSave}
      submitLabel="Save agent"
    />
  );
}

/* -------------------------------------------------------------- files tab */

function FilesTab({ agents, onAskAboutFile, canAsk, onEditChange, onTabChange }: MacSidePanelProps) {
  const [selected, setSelected] = useState<string | null>("components/hero.tsx");
  const summary = summarizeChanges(MAC_TREE);
  const node = selected ? findNode(MAC_TREE, selected) : undefined;
  const owner = selected ? agents.find((a) => a.id === MAC_FILE_OWNERS[selected]) : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default">
      <div className="flex shrink-0 items-center gap-2 border-b border-border-button-default px-4 py-3">
        <span className="flex-1 text-body-2-semibold text-text-primary">Workspace files</span>
        <span className="text-caption-1-regular text-text-tertiary">{summary.files} changed</span>
        <DiffCounts added={summary.additions} removed={summary.deletions} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <RepoTreeNav
          nodes={MAC_TREE}
          selectedId={selected}
          onSelect={(id) => setSelected(id)}
          defaultExpandedIds={["app", "components", "content"]}
          aria-label="Workspace files"
        />
      </div>
      {node && selected && (
        <div data-testid="file-detail" className="flex shrink-0 flex-col gap-2.5 border-t border-border-button-default p-4">
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate font-mono text-caption-1-medium text-text-primary">{selected}</span>
            {Boolean(node.additions || node.deletions) && <DiffCounts added={node.additions ?? 0} removed={node.deletions ?? 0} />}
          </div>
          {owner ? (
            <button
              type="button"
              onClick={() => {
                onEditChange(owner.id);
                onTabChange("agent");
              }}
              className="flex cursor-pointer items-center gap-2 rounded-xl bg-background-secondary-default p-2 text-start outline-none hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring"
            >
              <PaperAvatar shape={owner.shape} face={owner.face} color={owner.color} size={24} grain={false} />
              <span className="text-caption-1-regular text-text-secondary">
                Last edited by <span className="font-semibold text-text-primary">{owner.name}</span>
              </span>
            </button>
          ) : (
            <p className="text-caption-1-regular text-text-tertiary">No agent has touched this file.</p>
          )}
          <Button size="small" variant="secondary" leadingIcon={RiQuestionAnswerLine} disabled={!canAsk} onClick={() => onAskAboutFile(selected)}>
            Ask the chat about this file
          </Button>
          {!canAsk && <p className="text-caption-1-regular text-text-tertiary">Available when the current replies finish.</p>}
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------- activity tab */

function ActivityTab({ agents, activity, onRunAction }: MacSidePanelProps) {
  if (!activity) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-3xl border border-border-button-default bg-background-primary-default px-8 text-center">
        <RiPulseLine aria-hidden className="size-6 text-foreground-icon-tertiary" />
        <p className="text-body-2-semibold text-text-primary">No replies yet</p>
        <p className="text-caption-1-regular text-text-tertiary">Send a message and each agent&apos;s turn shows up here as it runs.</p>
      </div>
    );
  }
  const byId = new Map(agents.map((a) => [a.id, a]));
  const stopped = activity.status === "stopped";
  const steps: AgentStep[] = activity.queue.map((id, i) => {
    const a = byId.get(id);
    const state: AgentStep["state"] =
      i < activity.done ? "done" : i === activity.done && !stopped && activity.status !== "done" ? "active" : "pending";
    return {
      id: `${id}-${i}`,
      title: `${a?.name ?? "Removed agent"} replies`,
      detail: a ? `${a.label} · ${a.model === "deep" ? "Deep reasoning" : a.model === "swift" ? "Swift mini" : "Balanced"}` : undefined,
      state,
    };
  });
  const agentsIn = activity.queue.flatMap((id) => byId.get(id) ?? []);
  return (
    <AgentDetailPanel
      className="min-h-0 flex-1"
      name={activity.title}
      subtitle={`Started ${activity.startedAt}`}
      avatar={<AvatarCluster agents={agentsIn} size={40} />}
      task={activity.prompt}
      steps={steps}
      stats={[
        { label: "Replies", value: `${activity.done} of ${activity.queue.length}` },
        { label: "Agents", value: activity.queue.length },
      ]}
      status={activity.status}
      onStatusChange={(_status, action) => action !== "restart" && onRunAction(action)}
      onRestart={() => onRunAction("restart")}
    />
  );
}
