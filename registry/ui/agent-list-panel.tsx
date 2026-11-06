/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Agent List Panel" (boardui.com/components/multi-agent-chat).
 * No BoardUI source was used.
 */
"use client";

import { useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Key, Selection } from "react-aria-components";
import { ListBox, ListBoxItem, ToggleButton, ToggleButtonGroup } from "react-aria-components";
import { RiAddLine, RiCloseLine, RiSearchLine } from "@remixicon/react";
import { hashSeed } from "@/registry/lib/prng";
import { cx } from "@/registry/lib/cx";

export type AgentStatus = "running" | "waiting" | "done" | "error" | "idle";
export type AgentFilter = "all" | "running" | "done";

export interface AgentListItem {
  id: string;
  name: string;
  /** Last message or activity line, truncated to one line. */
  lastMessage?: string;
  /** Pre-formatted relative time ("2m", "1h", "Mon"). */
  time?: string;
  status?: AgentStatus;
  /** Custom avatar node (32px). Defaults to a seeded monogram tile. */
  avatar?: ReactNode;
  /** Unread message count shown as a pill under the time. */
  unread?: number;
}

export interface AgentListPanelProps {
  agents: AgentListItem[];
  selectedId?: string | null;
  defaultSelectedId?: string | null;
  onSelect?: (id: string, agent: AgentListItem) => void;
  filter?: AgentFilter;
  defaultFilter?: AgentFilter;
  onFilterChange?: (filter: AgentFilter) => void;
  /** Shows the "+" button in the toolbar when given. */
  onCreate?: () => void;
  createLabel?: string;
  /** Extra toolbar buttons rendered between search and "+". */
  toolbar?: ReactNode;
  /** Show the search toggle in the toolbar. */
  searchable?: boolean;
  /** Pinned under the list (support links, account card). */
  footer?: ReactNode;
  emptyLabel?: string;
  "aria-label"?: string;
  className?: string;
}

export const AGENT_STATUS_META: Record<AgentStatus, { label: string; dot: string }> = {
  running: { label: "Running", dot: "bg-green-500" },
  waiting: { label: "Needs input", dot: "bg-yellow-500" },
  done: { label: "Done", dot: "bg-blue-500" },
  error: { label: "Failed", dot: "bg-red-500" },
  idle: { label: "Idle", dot: "bg-neutral-400" },
};

const FILTERS: { id: AgentFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "running", label: "Running" },
  { id: "done", label: "Done" },
];

/** Running covers agents still working or waiting on you; Done covers finished ones. */
export function matchesAgentFilter(status: AgentStatus | undefined, filter: AgentFilter): boolean {
  if (filter === "all") return true;
  if (filter === "running") return status === "running" || status === "waiting";
  return status === "done";
}

const TONES = [
  "bg-calendar-event-lime-background text-calendar-event-lime-title",
  "bg-calendar-event-blue-background text-calendar-event-blue-title",
  "bg-calendar-event-pink-background text-calendar-event-pink-title",
  "bg-calendar-event-purple-background text-calendar-event-purple-title",
  "bg-calendar-event-emerald-background text-calendar-event-emerald-title",
] as const;

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "?";
  const second = words[1]?.[0] ?? "";
  return (first + second).toUpperCase();
}

/** Seeded 32px monogram tile: the same name always gets the same tint. */
export function AgentMonogram({ name, className }: { name: string; className?: string }) {
  const tone = TONES[hashSeed(name) % TONES.length] ?? TONES[0];
  return (
    <span
      aria-hidden
      className={cx(
        "flex size-8 shrink-0 select-none items-center justify-center rounded-[10px] text-caption-1-semibold",
        tone,
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}

export function AgentStatusDot({
  status,
  className,
}: {
  status: AgentStatus;
  className?: string;
}) {
  const meta = AGENT_STATUS_META[status];
  return (
    <span aria-hidden className={cx("relative flex size-2.5 shrink-0 rounded-full", meta.dot, className)}>
      {status === "running" && (
        <span className="absolute inset-0 animate-ping rounded-full bg-green-500 opacity-60 motion-reduce:hidden" />
      )}
    </span>
  );
}

export function AgentListPanel({
  agents,
  selectedId,
  defaultSelectedId = null,
  onSelect,
  filter,
  defaultFilter = "all",
  onFilterChange,
  onCreate,
  createLabel = "New agent",
  toolbar,
  searchable = true,
  footer,
  emptyLabel = "No agents here yet.",
  "aria-label": ariaLabel = "Agents",
  className,
}: AgentListPanelProps) {
  const [innerSelected, setInnerSelected] = useState<string | null>(defaultSelectedId);
  const [innerFilter, setInnerFilter] = useState<AgentFilter>(defaultFilter);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchId = useId();

  const activeId = selectedId !== undefined ? selectedId : innerSelected;
  const activeFilter = filter ?? innerFilter;

  // #region critical
  const counts = useMemo(() => {
    const out: Record<AgentFilter, number> = { all: 0, running: 0, done: 0 };
    for (const a of agents) {
      out.all += 1;
      if (matchesAgentFilter(a.status, "running")) out.running += 1;
      if (matchesAgentFilter(a.status, "done")) out.done += 1;
    }
    return out;
  }, [agents]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return agents.filter(
      (a) =>
        matchesAgentFilter(a.status, activeFilter) &&
        (!q || a.name.toLowerCase().includes(q) || (a.lastMessage ?? "").toLowerCase().includes(q)),
    );
  }, [agents, activeFilter, query]);

  const setFilter = (next: AgentFilter) => {
    if (filter === undefined) setInnerFilter(next);
    onFilterChange?.(next);
  };

  const handleSelection = (keys: Selection) => {
    if (keys === "all") return;
    const [first] = keys as Set<Key>;
    if (first === undefined) return;
    const id = String(first);
    const agent = agents.find((a) => a.id === id);
    if (!agent || id === activeId) return;
    if (selectedId === undefined) setInnerSelected(id);
    onSelect?.(id, agent);
  };

  const closeSearch = () => {
    setQuery("");
    setSearchOpen(false);
  };
  // #endregion

  const pill =
    "flex h-8 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-full outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-border-focus-ring motion-reduce:transition-none";

  return (
    <div
      className={cx(
        "flex min-h-0 flex-col gap-2 rounded-3xl border border-border-button-default bg-background-secondary-default p-2",
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        {searchable && (
          <button
            type="button"
            aria-label={searchOpen ? "Close search" : "Search agents"}
            aria-expanded={searchOpen}
            aria-controls={searchOpen ? searchId : undefined}
            onClick={() => {
              if (searchOpen) closeSearch();
              else setSearchOpen(true);
            }}
            className={cx(
              pill,
              searchOpen
                ? "bg-background-primary-default text-foreground-icon-primary shadow-xs dark:bg-background-quaternary-default"
                : "bg-background-tertiary-default text-foreground-icon-secondary hover:bg-background-tertiary-hover",
            )}
          >
            {searchOpen ? <RiCloseLine aria-hidden className="size-[18px]" /> : <RiSearchLine aria-hidden className="size-[18px]" />}
          </button>
        )}
        {toolbar}
        {onCreate && (
          <button
            type="button"
            aria-label={createLabel}
            onClick={onCreate}
            className={cx(pill, "bg-button-primary text-text-white shadow-xs")}
          >
            <RiAddLine aria-hidden className="size-5" />
          </button>
        )}
      </div>

      {searchOpen && (
        <label className="flex h-9 items-center gap-2 rounded-xl border border-border-button-default bg-background-primary-default px-3 transition-[opacity,translate] duration-150 ease-out starting:-translate-y-1 starting:opacity-0 focus-within:ring-2 focus-within:ring-border-focus-ring motion-reduce:transition-none">
          <RiSearchLine aria-hidden className="size-4 shrink-0 text-foreground-icon-tertiary" />
          <span className="sr-only">Search agents</span>
          <input
            id={searchId}
            autoFocus
            type="search"
            value={query}
            placeholder="Search agents"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                closeSearch();
              }
            }}
            className="min-w-0 flex-1 bg-transparent text-body-2-regular text-text-primary outline-none placeholder:text-text-placeholder [&::-webkit-search-cancel-button]:hidden"
          />
        </label>
      )}

      <ToggleButtonGroup
        aria-label="Filter agents"
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[activeFilter]}
        onSelectionChange={(keys) => {
          const [k] = keys;
          if (k !== undefined) setFilter(String(k) as AgentFilter);
        }}
        className="grid grid-cols-3 gap-0.5 rounded-xl bg-background-tertiary-default p-0.5"
      >
        {FILTERS.map((f) => (
          <ToggleButton
            key={f.id}
            id={f.id}
            className={({ isSelected, isFocusVisible }) =>
              cx(
                "flex h-7 cursor-pointer items-center justify-center gap-1 rounded-[10px] px-2 text-caption-1-medium outline-none transition-colors duration-150 ease-out motion-reduce:transition-none",
                isSelected
                  ? "bg-background-primary-default text-text-primary shadow-2xs dark:bg-background-quaternary-default"
                  : "text-text-secondary hover:text-text-primary",
                isFocusVisible && "ring-2 ring-border-focus-ring",
              )
            }
          >
            {f.label}
            <span className="tabular-nums text-text-tertiary">{counts[f.id]}</span>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <ListBox
        aria-label={ariaLabel}
        items={visible}
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={activeId ? [activeId] : []}
        onSelectionChange={handleSelection}
        renderEmptyState={() => (
          <p className="px-3 py-8 text-center text-body-2-regular text-text-tertiary">
            {query ? `No agents match “${query}”.` : emptyLabel}
          </p>
        )}
        className="-mx-0.5 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-0.5 outline-none"
      >
        {(agent) => {
          const status = agent.status;
          const meta = status ? AGENT_STATUS_META[status] : undefined;
          return (
            <ListBoxItem
              id={agent.id}
              textValue={agent.name}
              className={({ isSelected, isFocusVisible }) =>
                cx(
                  "group flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 outline-none transition-colors duration-150 ease-out motion-reduce:transition-none",
                  isSelected ? "bg-background-tertiary-default" : "hover:bg-background-secondary-hover",
                  isFocusVisible && "ring-2 ring-inset ring-border-focus-ring",
                )
              }
            >
              <span className="relative shrink-0">
                {agent.avatar ?? <AgentMonogram name={agent.name} />}
                {status && (
                  <AgentStatusDot
                    status={status}
                    className="absolute -end-0.5 -bottom-0.5 ring-2 ring-background-secondary-default"
                  />
                )}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate text-body-2-medium text-text-primary">{agent.name}</span>
                  {agent.time && (
                    <span className="shrink-0 text-caption-2-regular tabular-nums text-text-tertiary">{agent.time}</span>
                  )}
                </span>
                <span className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-caption-1-regular text-text-tertiary">
                    {agent.lastMessage ?? meta?.label ?? ""}
                  </span>
                  {agent.unread ? (
                    <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-button-primary px-1 text-caption-2-semibold tabular-nums text-text-white">
                      {agent.unread}
                      <span className="sr-only"> unread</span>
                    </span>
                  ) : null}
                </span>
                {meta && <span className="sr-only">, {meta.label}</span>}
              </span>
            </ListBoxItem>
          );
        }}
      </ListBox>

      {footer && <div className="shrink-0 border-t border-border-button-default pt-2">{footer}</div>}
    </div>
  );
}
