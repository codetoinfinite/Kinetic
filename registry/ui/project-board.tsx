/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Project Board" (boardui.com/templates/project-board).
 * No BoardUI source was used.
 */
"use client";

import { useMemo, useRef, useState, type MouseEvent } from "react";
import {
  RiAddLine,
  RiArrowLeftLine,
  RiChat3Line,
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiKanbanView2,
  RiLayoutRightLine,
  RiUserAddLine,
} from "@remixicon/react";

import { DASHBOARD_NAV, DashboardSidebar } from "@/registry/ui/dashboard-sidebar";
import { DashboardPageHeader } from "@/registry/ui/dashboard-page-header";
import { NotificationBellBadge, type BellNotification } from "@/registry/ui/notification-bell-badge";
import { Button } from "@/registry/ui/button";
import { IconButton } from "@/registry/ui/icon-button";
import { Toaster, toast } from "@/registry/ui/toast";
import { PRIORITY_RANK } from "@/registry/ui/priority-badge";
import { cx } from "@/registry/lib/cx";
import {
  BoardColumn,
  NewTicketDialog,
  STAGES,
  stageOf,
  type ColumnDrop,
  type NewTicketInput,
  type StageId,
  type Ticket,
} from "@/registry/ui/project-board-parts";
import {
  FilterPopover,
  InboxPopover,
  NO_FILTER,
  SortMenu,
  type ActivityEntry,
  type BoardFilter,
  type SortKey,
} from "@/registry/ui/project-board-toolbar";
import { BoardOverview, TicketPanel, type TicketPatch } from "@/registry/ui/project-board-panel";

/* -------------------------------------------------------------------- data */

const c = (id: string, author: string, body: string, time: string) => ({ id, author, body, time });

export const BOARD_TICKETS: Ticket[] = [
  { id: "DS-38", epic: "Agent handoff", title: "Explore approval cards for agent handoffs", priority: "low", project: "relay", assignees: ["ana", "jordan"], stage: "backlog", created: 14, tokens: [420, 610, 380, 0, 220, 0, 0], comments: [] },
  { id: "FE-86", epic: "Project board", title: "Add saved views for each project team", priority: "low", project: "atlas", assignees: ["sam"], stage: "backlog", created: 13, tokens: [0, 240, 310, 280, 0, 0, 0], comments: [] },
  { id: "BE-23", epic: "Activity API", title: "Record an audit trail for agent actions", priority: "medium", project: "relay", assignees: ["priya", "leo"], stage: "backlog", created: 12, tokens: [880, 1240, 960, 1100, 720, 140, 0], comments: [c("c1", "priya", "Storing these per workspace keeps the query cheap.", "2d ago")] },
  { id: "DS-34", epic: "Foundations", title: "Define semantic tokens for elevated surfaces", priority: "high", project: "kinetic", assignees: ["jordan"], stage: "todo", created: 12, tokens: [1320, 1880, 2140, 1610, 1290, 0, 0], comments: [c("c2", "ana", "Can we keep the dark ramp in the same file?", "1d ago")] },
  { id: "FE-82", epic: "Composer", title: "Add keyboard navigation to model picker", priority: "low", project: "atlas", assignees: ["leo"], stage: "todo", created: 11, tokens: [300, 520, 460, 0, 380, 0, 0], comments: [] },
  { id: "BE-19", epic: "Usage API", title: "Return rolling limits with reset timestamps", priority: "low", project: "relay", assignees: ["priya"], stage: "todo", created: 10, tokens: [640, 0, 720, 810, 560, 0, 0], comments: [] },
  { id: "FE-79", epic: "Agent progress", title: "Animate nested task groups as they stream", priority: "medium", project: "atlas", assignees: ["sam", "jordan", "leo"], stage: "progress", created: 9, tokens: [2210, 2680, 3120, 2790, 2440, 610, 0], comments: [c("c3", "sam", "Height animation is in. Stagger next.", "5h ago"), c("c4", "jordan", "Keep it under 250ms per group.", "4h ago")] },
  { id: "DS-31", epic: "Dark mode", title: "Tune chart contrast on dark dashboard cards", priority: "urgent", project: "kinetic", assignees: ["ana"], stage: "progress", created: 8, tokens: [1720, 2010, 2460, 2890, 3240, 900, 120], comments: [c("c5", "ana", "Chart 5 fails on the inner surface. Fixing first.", "1h ago")] },
  { id: "FE-76", epic: "Questionnaire", title: "Polish the transition between plan questions", priority: "low", project: "relay", assignees: ["leo", "ana"], stage: "review", created: 7, tokens: [940, 1180, 860, 1020, 640, 0, 0], comments: [] },
  { id: "DS-27", epic: "Avatars", title: "Ship overlapping avatar groups for cards", priority: "low", project: "kinetic", assignees: ["jordan"], stage: "done", created: 2, completed: 6, tokens: [520, 380, 0, 0, 0, 0, 0], comments: [] },
  { id: "FE-71", epic: "Studio canvas", title: "Keep generated screens aligned while zooming", priority: "medium", project: "atlas", assignees: ["sam"], stage: "done", created: 1, completed: 5, tokens: [1440, 980, 0, 0, 0, 0, 0], comments: [] },
  { id: "BE-16", epic: "Registry", title: "Validate template dependencies during build", priority: "low", project: "kinetic", assignees: ["priya"], stage: "done", created: 1, completed: 4, tokens: [610, 0, 0, 0, 0, 0, 0], comments: [] },
  { id: "DS-25", epic: "Motion", title: "Document reduced-motion behavior for blocks", priority: "low", project: "kinetic", assignees: ["ana", "jordan"], stage: "done", created: 1, completed: 3, tokens: [260, 0, 0, 0, 0, 0, 0], comments: [] },
];

export const BOARD_NOTIFICATIONS: BellNotification[] = [
  { id: "n1", title: "DS-31 is urgent", description: "Ana raised the priority of the dark chart contrast ticket.", time: "12m ago", icon: RiErrorWarningLine, tone: "error" },
  { id: "n2", title: "New comment on FE-79", description: "Jordan: Keep it under 250ms per group.", time: "4h ago", icon: RiChat3Line, tone: "information" },
  { id: "n3", title: "You were assigned DS-34", description: "Define semantic tokens for elevated surfaces.", time: "1d ago", icon: RiUserAddLine },
  { id: "n4", title: "BE-16 shipped", description: "Template dependencies are validated on every build.", time: "2d ago", icon: RiCheckboxCircleLine, tone: "success" },
  { id: "n5", title: "Review is at its limit", description: "Three tickets is the review limit for this board.", time: "3d ago", icon: RiKanbanView2 },
];

const SEED_ACTIVITY: ActivityEntry[] = [
  { id: "s1", text: "Ana raised DS-31 to Urgent", time: "12m", unread: true },
  { id: "s2", text: "Sam moved FE-79 to In progress", time: "3h", unread: true },
  { id: "s3", text: "Priya completed BE-16", time: "2d", unread: false },
];

const HOME_VIEW = "project-board";
/** Board's "today": the day tickets moved to Done are stamped with. */
const TODAY = 15;
const ME = "jordan";

function sortColumn(list: Ticket[], sort: SortKey) {
  if (sort === "manual") return list;
  const next = [...list];
  if (sort === "priority") next.sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]);
  else if (sort === "newest") next.sort((a, b) => b.created - a.created);
  else next.sort((a, b) => a.title.localeCompare(b.title));
  return next;
}

function matches(ticket: Ticket, filter: BoardFilter) {
  if (filter.priorities.size > 0 && !filter.priorities.has(ticket.priority)) return false;
  if (filter.projects.size > 0 && !filter.projects.has(ticket.project)) return false;
  if (filter.mine && !ticket.assignees.includes(ME)) return false;
  return true;
}

function withStage(ticket: Ticket, stage: StageId): Ticket {
  const { completed, ...rest } = ticket;
  if (stage !== "done") return { ...rest, stage };
  return { ...rest, stage, completed: completed ?? TODAY };
}

/* --------------------------------------------------------------- component */

export interface ProjectBoardProps {
  /** Tickets in board order; a column is this list filtered by stage. */
  tickets?: Ticket[];
  defaultNotifications?: BellNotification[];
  /** Sidebar key shown first. "project-board" is the board. */
  defaultView?: string;
  /** Show the side panel on first render. */
  defaultPanelOpen?: boolean;
  className?: string;
}

export function ProjectBoard({
  tickets: initialTickets = BOARD_TICKETS,
  defaultNotifications = BOARD_NOTIFICATIONS,
  defaultView = HOME_VIEW,
  defaultPanelOpen = false,
  className,
}: ProjectBoardProps) {
  const [view, setView] = useState(defaultView);
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(defaultPanelOpen);
  const [sort, setSort] = useState<SortKey>("manual");
  const [filter, setFilter] = useState<BoardFilter>(NO_FILTER);
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<ColumnDrop | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>(SEED_ACTIVITY);
  const [notifications, setNotifications] = useState<BellNotification[]>(defaultNotifications);
  const [newOpen, setNewOpen] = useState(false);
  const [newStage, setNewStage] = useState<StageId>("backlog");
  const [announcement, setAnnouncement] = useState("");
  const counter = useRef(0);

  const navItem = DASHBOARD_NAV.find((item) => item.key === view);
  const selected = tickets.find((t) => t.id === selectedId) ?? null;
  const columns = useMemo(
    () =>
      STAGES.map((stage) => ({
        stage,
        all: tickets.filter((t) => t.stage === stage.id),
        shown: sortColumn(
          tickets.filter((t) => t.stage === stage.id && matches(t, filter)),
          sort,
        ),
      })),
    [tickets, filter, sort],
  );

  const log = (text: string) => {
    counter.current += 1;
    const id = `a${counter.current}`;
    setActivity((list) => [{ id, text, time: "now", unread: true }, ...list].slice(0, 30));
  };

  // #region critical
  // The sidebar rows are `href="#"` links: one capture listener turns any of
  // them into a local view switch so the host URL never changes.
  const onNavClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest('a[href="#"]');
    if (!link) return;
    event.preventDefault();
    const item = DASHBOARD_NAV.find((entry) => entry.label === link.getAttribute("aria-label"));
    if (item) setView(item.key);
  };

  // One ordered array holds every ticket. Moving = remove it, restamp its
  // stage (Done gets a completion day), then splice it back in front of
  // `beforeId`, or after the last ticket already in the target stage.
  const moveTicket = (id: string, stage: StageId, beforeId: string | null) => {
    const ticket = tickets.find((t) => t.id === id);
    if (!ticket) return;
    if (beforeId === id) {
      if (ticket.stage === stage) return;
      beforeId = null;
    }
    setTickets((list) => {
      const current = list.find((t) => t.id === id);
      if (!current) return list;
      const rest = list.filter((t) => t.id !== id);
      let at = beforeId ? rest.findIndex((t) => t.id === beforeId) : -1;
      if (at < 0) {
        at = rest.length;
        for (let i = rest.length - 1; i >= 0; i--) {
          if (rest[i]?.stage === stage) {
            at = i + 1;
            break;
          }
        }
      }
      return [...rest.slice(0, at), withStage(current, stage), ...rest.slice(at)];
    });
    const label = stageOf(stage).label;
    const message = ticket.stage === stage ? `Reordered ${id} in ${label}` : `${id} moved to ${label}`;
    if (ticket.stage !== stage) log(`Jordan moved ${id} to ${label}`);
    setAnnouncement(message);
  };

  const onDropTicket = (id: string) => {
    const target = drop;
    setDragId(null);
    setDrop(null);
    if (target) moveTicket(id, target.stage, target.beforeId);
  };
  // #endregion

  const stepTicket = (id: string, delta: -1 | 1) => {
    const ticket = tickets.find((t) => t.id === id);
    if (!ticket) return;
    const next = STAGES[STAGES.findIndex((s) => s.id === ticket.stage) + delta];
    if (next) moveTicket(id, next.id, null);
  };

  const sortStageByPriority = (stage: StageId) => {
    setTickets((list) => {
      const inStage = list.filter((t) => t.stage === stage);
      const ordered = sortColumn(inStage, "priority");
      let i = 0;
      return list.map((t) => (t.stage === stage ? (ordered[i++] ?? t) : t));
    });
    setAnnouncement(`${stageOf(stage).label} sorted by priority`);
  };

  const moveAll = (from: StageId, to: StageId) => {
    const ids = tickets.filter((t) => t.stage === from).map((t) => t.id);
    if (ids.length === 0) {
      toast(`${stageOf(from).label} is empty`);
      return;
    }
    const before = tickets;
    setTickets((list) => [...list.filter((t) => t.stage !== from), ...list.filter((t) => t.stage === from).map((t) => withStage(t, to))]);
    log(`Jordan moved ${ids.length} tickets to ${stageOf(to).label}`);
    toast(`${ids.length} tickets moved to ${stageOf(to).label}`, {
      actions: [{ label: "Undo", onClick: () => setTickets(before) }],
    });
  };

  const openNew = (stage: StageId) => {
    setNewStage(stage);
    setNewOpen(true);
  };

  const createTicket = (input: NewTicketInput) => {
    const top = tickets.reduce((max, t) => Math.max(max, Number(t.id.split("-")[1]) || 0), 0);
    const id = `KT-${top + 1}`;
    const ticket: Ticket = {
      id,
      epic: input.epic,
      title: input.title,
      priority: input.priority,
      project: input.project,
      assignees: [input.assignee],
      stage: input.stage,
      created: TODAY,
      ...(input.stage === "done" ? { completed: TODAY } : {}),
      tokens: [0, 0, 0, 0, 0, 0, 0],
      comments: [],
    };
    setTickets((list) => {
      const at = list.findIndex((t) => t.stage === input.stage);
      return at < 0 ? [...list, ticket] : [...list.slice(0, at), ticket, ...list.slice(at)];
    });
    setNewOpen(false);
    log(`Jordan created ${id} in ${stageOf(input.stage).label}`);
    toast.success(`${id} created`, {
      description: input.title,
      actions: [
        {
          label: "Open",
          onClick: () => {
            setSelectedId(id);
            setPanelOpen(true);
          },
        },
      ],
    });
  };

  const updateTicket = (id: string, patch: TicketPatch, note: string) => {
    setTickets((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    log(`Jordan ${note}`);
  };

  const addComment = (id: string, body: string) => {
    counter.current += 1;
    const comment = { id: `cm${counter.current}`, author: ME, body, time: "Just now" };
    setTickets((list) => list.map((t) => (t.id === id ? { ...t, comments: [...t.comments, comment] } : t)));
    log(`Jordan commented on ${id}`);
  };

  const deleteTicket = (id: string) => {
    const index = tickets.findIndex((t) => t.id === id);
    const ticket = tickets[index];
    if (!ticket) return;
    setTickets((list) => list.filter((t) => t.id !== id));
    setSelectedId(null);
    log(`Jordan deleted ${id}`);
    toast(`${id} deleted`, {
      actions: [
        {
          label: "Undo",
          onClick: () =>
            setTickets((list) => {
              if (list.some((t) => t.id === id)) return list;
              const next = [...list];
              next.splice(Math.min(index, next.length), 0, ticket);
              return next;
            }),
        },
      ],
    });
  };

  const openTicket = (id: string) => {
    setSelectedId(id);
    setPanelOpen(true);
  };

  const isHome = view === HOME_VIEW;
  const hiddenByFilter = tickets.length - columns.reduce((n, col) => n + col.shown.length, 0);

  return (
    <div
      className={cx("relative flex h-full w-full gap-3 overflow-hidden bg-background-full p-3", className)}
      onClickCapture={onNavClickCapture}
    >
      <DashboardSidebar selected={view} showThemeToggle={false} />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden px-1 pt-1.5">
        <DashboardPageHeader
          title={isHome ? "Kinetic Design Tasks" : (navItem?.label ?? "Project board")}
          breadcrumbs={[
            { label: "Acme team", initials: "A", tone: "blue", onPress: () => setView("home") },
            { label: "Jordan", initials: "J", onPress: () => setView("profile") },
            { label: navItem?.label ?? "Project board", icon: navItem?.icon ?? RiKanbanView2 },
          ]}
          notifications={
            <NotificationBellBadge notifications={notifications} onNotificationsChange={(next) => setNotifications([...next])} />
          }
          actions={
            isHome ? (
              <>
                <InboxPopover entries={activity} onEntriesChange={setActivity} />
                <SortMenu sort={sort} onSortChange={setSort} />
                <FilterPopover filter={filter} onFilterChange={setFilter} meName="Jordan" />
                <IconButton
                  icon={RiLayoutRightLine}
                  aria-label="Side panel"
                  aria-pressed={panelOpen}
                  onClick={() => setPanelOpen((open) => !open)}
                  className={cx(panelOpen && "bg-background-tertiary-default")}
                />
                <Button leadingIcon={RiAddLine} onClick={() => openNew("backlog")}>
                  New ticket
                </Button>
              </>
            ) : null
          }
        />

        {isHome ? (
          <div className="flex min-h-0 flex-1 gap-3 pb-3">
            <div
              role="region"
              aria-label="Board"
              className="flex min-h-0 min-w-0 flex-1 gap-3 overflow-x-auto overscroll-x-contain pb-1"
            >
              {columns.map(({ stage, all, shown }, i) => {
                const target = stage.id === "done" ? STAGES[i - 1] : STAGES[i + 1];
                return (
                  <BoardColumn
                    key={stage.id}
                    stage={stage}
                    count={all.length}
                    tickets={shown}
                    selectedId={panelOpen ? selectedId : null}
                    draggingId={dragId}
                    drop={drop}
                    moveAllTo={target?.label ?? stage.label}
                    onOpen={openTicket}
                    onAdd={() => openNew(stage.id)}
                    onSortByPriority={() => sortStageByPriority(stage.id)}
                    onMoveAll={() => target && moveAll(stage.id, target.id)}
                    onDragStart={setDragId}
                    onDragEnd={() => {
                      setDragId(null);
                      setDrop(null);
                    }}
                    onDropChange={setDrop}
                    onDropTicket={onDropTicket}
                    onStep={stepTicket}
                  />
                );
              })}
            </div>
            {panelOpen ? (
              selected ? (
                <TicketPanel
                  key={selected.id}
                  ticket={selected}
                  onClose={() => setSelectedId(null)}
                  onUpdate={(patch, note) => updateTicket(selected.id, patch, note)}
                  onMove={(stage) => moveTicket(selected.id, stage, null)}
                  onComment={(body) => addComment(selected.id, body)}
                  onDelete={() => deleteTicket(selected.id)}
                />
              ) : (
                <BoardOverview tickets={tickets} onClose={() => setPanelOpen(false)} />
              )
            ) : null}
            <p className="sr-only" aria-live="polite">
              {announcement}
              {hiddenByFilter > 0 ? ` ${hiddenByFilter} tickets hidden by filters.` : ""}
            </p>
          </div>
        ) : (
          <section
            aria-label={navItem?.label ?? view}
            className="mb-3 flex min-h-0 flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border-button-default bg-background-secondary-default p-10 text-center"
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-background-primary-default text-foreground-icon-secondary shadow-xs">
              {navItem ? <navItem.icon className="size-6" aria-hidden /> : <RiKanbanView2 className="size-6" aria-hidden />}
            </span>
            <div className="flex max-w-sm flex-col gap-1">
              <h2 className="text-title-3-medium text-text-primary">{navItem?.label ?? view}</h2>
              <p className="text-body-regular text-text-secondary">
                {navItem?.label ?? "This view"} is a template of its own. This page is the project board, so there is nothing to show here yet.
              </p>
            </div>
            <Button variant="secondary" leadingIcon={RiArrowLeftLine} onClick={() => setView(HOME_VIEW)}>
              Back to Project board
            </Button>
          </section>
        )}
      </main>
      <NewTicketDialog isOpen={newOpen} onOpenChange={setNewOpen} stage={newStage} onCreate={createTicket} />
      <Toaster position="bottom-end" />
    </div>
  );
}
