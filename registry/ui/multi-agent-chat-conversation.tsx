/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Multi Agent Chat" (boardui.com/components/multi-agent-chat).
 * No BoardUI source was used.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import {
  RiCheckLine,
  RiDeleteBinLine,
  RiEditLine,
  RiEraserLine,
  RiLayoutRightLine,
  RiMoreLine,
  RiPushpinLine,
  RiShareLine,
  RiStopFill,
  RiUnpinLine,
} from "@remixicon/react";
import { Button as AriaButton } from "react-aria-components";

import { cx } from "@/registry/lib/cx";
import { FaceDisc, PaperAvatar } from "@/registry/ui/agent-creator-avatar";
import { AgentThinking } from "@/registry/ui/agent-thinking";
import { Button } from "@/registry/ui/button";
import { ChatMessageBubble } from "@/registry/ui/chat-message-bubble";
import { useCopyToClipboard } from "@/registry/ui/code-block-copy";
import { ComposerPanel, type ComposerPanelMessage } from "@/registry/ui/composer-panel";
import { Dropdown, DropdownDivider, DropdownItem, DropdownPopover, DropdownTrigger } from "@/registry/ui/dropdown";
import { AlertDialog } from "@/registry/ui/modal";
import { Tooltip, TooltipTrigger } from "@/registry/ui/tooltip";
import { AvatarCluster, MacIconAction, type MacAgent, type MacConversation } from "@/registry/ui/multi-agent-chat-data";

/** What the open conversation needs to know about a run in progress. */
export interface MacLiveReply {
  agentId: string;
  phase: "thinking" | "streaming";
  text: string;
  paused: boolean;
  /** Agents still waiting for their turn after this one. */
  waiting: string[];
}

export interface MacConversationViewProps {
  conversation: MacConversation;
  agents: MacAgent[];
  live: MacLiveReply | null;
  /** Another conversation is replying; this composer waits. */
  busyElsewhere: boolean;
  panelOpen: boolean;
  reduced: boolean;
  onTogglePanel: () => void;
  onSend: (message: ComposerPanelMessage) => void;
  onStop: () => void;
  onToggleParticipant: (agentId: string) => void;
  onEditAgent: (agentId: string) => void;
  onRename: (title: string) => void;
  onTogglePin: () => void;
  onClear: () => void;
  onDelete: () => void;
}

const listNames = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

export function MacConversationView({
  conversation,
  agents,
  live,
  busyElsewhere,
  panelOpen,
  reduced,
  onTogglePanel,
  onSend,
  onStop,
  onToggleParticipant,
  onEditAgent,
  onRename,
  onTogglePin,
  onClear,
  onDelete,
}: MacConversationViewProps) {
  const byId = new Map(agents.map((a) => [a.id, a]));
  const participants = conversation.agentIds.flatMap((id) => byId.get(id) ?? []);
  const [renaming, setRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(conversation.title);
  const [moreOpen, setMoreOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { copied, copy } = useCopyToClipboard(1600);
  const scrollRef = useRef<HTMLDivElement>(null);

  const liveLength = live?.text.length ?? 0;
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [conversation.id, conversation.messages.length, liveLength, live?.phase]);

  const startRename = () => {
    setDraftTitle(conversation.title);
    setRenaming(true);
  };
  const commitRename = () => {
    const next = draftTitle.trim();
    if (next) onRename(next);
    setRenaming(false);
  };

  const liveAgent = live ? byId.get(live.agentId) : undefined;
  const sendBlocked = Boolean(live) || busyElsewhere || participants.length === 0;

  return (
    <section aria-label={conversation.title} className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border-button-default px-4">
        <AvatarCluster agents={participants} size={28} />
        {renaming ? (
          <input
            autoFocus
            aria-label="Conversation name"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setRenaming(false);
            }}
            className="h-8 min-w-0 flex-1 rounded-lg border border-border-button-default bg-background-primary-default px-2 text-body-semibold text-text-primary outline-none focus:ring-2 focus:ring-border-focus-ring"
          />
        ) : (
          <div className="flex min-w-0 flex-1 items-baseline gap-2">
            <h2 className="truncate text-body-semibold text-text-primary">{conversation.title}</h2>
            <span className="shrink-0 text-caption-1-regular text-text-tertiary">
              {participants.length === 1 ? "1 agent" : `${participants.length} agents`}
            </span>
          </div>
        )}

        {live && (
          <Button size="xs" variant="secondary" leadingIcon={RiStopFill} onClick={onStop}>
            Stop replies
          </Button>
        )}
        <MacIconAction
          label={copied ? "Link copied" : "Copy share link"}
          icon={copied ? RiCheckLine : RiShareLine}
          onPress={() => void copy(`https://kinetic.local/conversations/${conversation.id}`)}
        />
        <Dropdown isOpen={moreOpen} onOpenChange={setMoreOpen}>
          <DropdownTrigger
            aria-label="Conversation options"
            className="grid size-7 cursor-pointer place-items-center rounded-lg text-foreground-icon-secondary outline-none hover:bg-background-tertiary-default data-[focus-visible]:ring-2 data-[focus-visible]:ring-border-focus-ring"
          >
            <RiMoreLine aria-hidden className="size-4" />
          </DropdownTrigger>
          <DropdownPopover aria-label="Conversation options" placement="bottom end" className="w-[210px]">
            <DropdownItem
              className="px-2 py-1.5"
              onSelect={() => {
                setMoreOpen(false);
                startRename();
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
              {conversation.pinned ? (
                <RiUnpinLine aria-hidden className="size-4 text-foreground-icon-secondary" />
              ) : (
                <RiPushpinLine aria-hidden className="size-4 text-foreground-icon-secondary" />
              )}
              <span className="text-body-2-medium text-text-primary">{conversation.pinned ? "Unpin" : "Pin to top"}</span>
            </DropdownItem>
            <DropdownItem
              className="px-2 py-1.5"
              onSelect={() => {
                setMoreOpen(false);
                onClear();
              }}
            >
              <RiEraserLine aria-hidden className="size-4 text-foreground-icon-secondary" />
              <span className="text-body-2-medium text-text-primary">Clear messages</span>
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem
              className="px-2 py-1.5"
              onSelect={() => {
                setMoreOpen(false);
                setConfirmDelete(true);
              }}
            >
              <RiDeleteBinLine aria-hidden className="size-4 text-foreground-icon-error" />
              <span className="text-body-2-medium text-text-destructive">Delete conversation</span>
            </DropdownItem>
          </DropdownPopover>
        </Dropdown>
        <MacIconAction label={panelOpen ? "Hide panel" : "Show panel"} icon={RiLayoutRightLine} active={panelOpen} onPress={onTogglePanel} />
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5">
        {conversation.messages.length === 0 && !live ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
            {participants.length > 0 && <AvatarCluster agents={participants} size={participants.length > 1 ? 112 : 96} animated={!reduced} />}
            <h3 className="text-title-3-semibold text-text-primary">
              {participants.length > 1 ? "A few minds. One conversation." : participants.length === 1 ? "One mind, ready." : "No one is here yet."}
            </h3>
            <p className="max-w-[380px] text-body-2-regular text-text-secondary">
              {participants.length === 0
                ? "Add an agent from the row above the message box to start."
                : `${listNames(participants.map((a) => a.name))} ${participants.length > 1 ? "are" : "is"} here. Send a message to get ${participants.length > 1 ? "everyone's perspective" : "a first answer"}.`}
            </p>
          </div>
        ) : (
          <ol aria-label="Messages" data-testid="messages" className="mx-auto flex max-w-[640px] flex-col gap-4">
            {conversation.messages.map((msg) => {
              if (msg.from === "user") {
                return (
                  <li key={msg.id}>
                    <ChatMessageBubble from="user" name="You" text={msg.text} time={msg.time} />
                  </li>
                );
              }
              const a = byId.get(msg.from);
              return (
                <li key={msg.id} className="flex flex-col gap-1">
                  <AgentName agent={a} />
                  <ChatMessageBubble
                    from="assistant"
                    name={a?.name ?? "Removed agent"}
                    text={msg.text}
                    time={msg.time}
                    avatar={<AgentAvatarButton agent={a} onEdit={onEditAgent} />}
                  />
                </li>
              );
            })}
            {live && liveAgent && (
              <li className="flex flex-col gap-1" aria-live="polite">
                <AgentName agent={liveAgent} />
                {live.phase === "thinking" ? (
                  <div className="flex items-center gap-2.5">
                    <AgentAvatarButton agent={liveAgent} onEdit={onEditAgent} />
                    <AgentThinking
                      variant="wave"
                      tone="subtle"
                      label={live.paused ? "Paused" : `${liveAgent.name} is thinking`}
                      shimmer={!reduced && !live.paused}
                    />
                  </div>
                ) : (
                  <ChatMessageBubble
                    from="assistant"
                    name={liveAgent.name}
                    text={live.text || "…"}
                    avatar={<AgentAvatarButton agent={liveAgent} onEdit={onEditAgent} />}
                  />
                )}
                {live.waiting.length > 0 && (
                  <p className="ps-[38px] text-caption-1-regular text-text-tertiary">
                    Next: {listNames(live.waiting.flatMap((id) => byId.get(id)?.name ?? []))}
                  </p>
                )}
              </li>
            )}
          </ol>
        )}
      </div>

      <div className="shrink-0 px-4 pb-4">
        <ComposerPanel
          className="mx-auto max-w-[640px]"
          placeholder="Hi, what do you need today?"
          defaultPermission="bypass"
          disabled={sendBlocked}
          onSubmit={onSend}
          status={
            <ParticipantRow
              agents={agents}
              selected={conversation.agentIds}
              onToggle={onToggleParticipant}
              note={busyElsewhere ? "Another conversation is replying" : live ? "Replies in progress" : null}
            />
          }
        />
      </div>

      <AlertDialog
        isOpen={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete "${conversation.title}"?`}
        description="The messages in this conversation are removed for everyone in the workspace. The agents stay."
        confirmLabel="Delete"
        onConfirm={onDelete}
      />
    </section>
  );
}

function AgentName({ agent }: { agent: MacAgent | undefined }) {
  return (
    <p className="ps-[38px] text-caption-1-semibold text-text-secondary">
      {agent?.name ?? "Removed agent"}
      {agent?.label && <span className="font-normal text-text-tertiary"> · {agent.label}</span>}
    </p>
  );
}

function AgentAvatarButton({ agent, onEdit }: { agent: MacAgent | undefined; onEdit: (id: string) => void }) {
  if (!agent) return <span aria-hidden className="mt-1 size-7 shrink-0 rounded-full bg-background-tertiary-default" />;
  return (
    <AriaButton
      aria-label={`Edit ${agent.name}`}
      onPress={() => onEdit(agent.id)}
      className="mt-0.5 shrink-0 cursor-pointer rounded-full outline-none transition-transform duration-150 ease-out hover:scale-105 data-[focus-visible]:ring-2 data-[focus-visible]:ring-border-focus-ring motion-reduce:transition-none motion-reduce:hover:scale-100"
    >
      <PaperAvatar shape={agent.shape} face={agent.face} color={agent.color} size={28} grain={false} />
    </AriaButton>
  );
}

function ParticipantRow({
  agents,
  selected,
  onToggle,
  note,
}: {
  agents: MacAgent[];
  selected: string[];
  onToggle: (id: string) => void;
  note: string | null;
}) {
  return (
    <div role="group" aria-label="Agents in this conversation" className="flex items-center gap-1 px-2 pb-1.5">
      <span className="me-1 text-caption-1-medium text-text-tertiary">In this chat</span>
      <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
        {agents.map((a) => {
          const on = selected.includes(a.id);
          return (
            <TooltipTrigger key={a.id}>
              <AriaButton
                aria-label={a.name}
                aria-pressed={on}
                onPress={() => onToggle(a.id)}
                className={cx(
                  "grid size-8 shrink-0 cursor-pointer place-items-center rounded-full outline-none",
                  "transition-[opacity,filter,background-color] duration-150 ease-out motion-reduce:transition-none",
                  "data-[focus-visible]:ring-2 data-[focus-visible]:ring-border-focus-ring",
                  on ? "bg-background-tertiary-default" : "opacity-45 grayscale hover:opacity-80",
                )}
              >
                <FaceDisc face={a.face} color={a.color} size={24} />
              </AriaButton>
              <Tooltip placement="top">{on ? `Remove ${a.name}` : `Add ${a.name}`}</Tooltip>
            </TooltipTrigger>
          );
        })}
      </div>
      {note && <span className="shrink-0 text-caption-1-regular text-text-tertiary">{note}</span>}
    </div>
  );
}
