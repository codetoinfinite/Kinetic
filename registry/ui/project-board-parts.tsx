/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Project Board" (boardui.com/templates/project-board).
 * No BoardUI source was used.
 */
"use client";

import { useState, type DragEvent, type KeyboardEvent } from "react";
import {
  RiAddLine,
  RiArrowRightSLine,
  RiChat3Line,
  RiFolder3Line,
  RiMoreFill,
  RiTicket2Line,
} from "@remixicon/react";

import { AvatarStack, type AvatarStackPerson } from "@/registry/ui/avatar-stack";
import { PRIORITIES, PRIORITY_LABELS, PriorityBadge, type Priority } from "@/registry/ui/priority-badge";
import { Dropdown, DropdownItem, DropdownPopover, DropdownTrigger } from "@/registry/ui/dropdown";
import { IconButton } from "@/registry/ui/icon-button";
import { Button } from "@/registry/ui/button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/registry/ui/modal";
import { Select, SelectItem } from "@/registry/ui/select";
import { Input } from "@/registry/ui/input";
import { cx } from "@/registry/lib/cx";

/* -------------------------------------------------------------- model */

export type StageId = "backlog" | "todo" | "progress" | "review" | "done";

export interface Stage {
  id: StageId;
  label: string;
  /** Work-in-progress limit shown as "count/limit". */
  limit: number;
}

export const STAGES: Stage[] = [
  { id: "backlog", label: "Backlog", limit: 8 },
  { id: "todo", label: "To do", limit: 5 },
  { id: "progress", label: "In progress", limit: 4 },
  { id: "review", label: "Review", limit: 3 },
  { id: "done", label: "Done", limit: 6 },
];

export type ProjectId = "kinetic" | "atlas" | "relay";

export const PROJECTS: { id: ProjectId; label: string }[] = [
  { id: "kinetic", label: "Kinetic" },
  { id: "atlas", label: "Atlas" },
  { id: "relay", label: "Relay" },
];

export interface Member {
  id: string;
  name: string;
  role: string;
  color: "blue" | "lime" | "pink" | "neutral";
}

export const MEMBERS: Member[] = [
  { id: "jordan", name: "Jordan Lee", role: "Design lead", color: "blue" },
  { id: "ana", name: "Ana de Wit", role: "Product designer", color: "pink" },
  { id: "sam", name: "Sam Okafor", role: "Frontend", color: "lime" },
  { id: "priya", name: "Priya Nair", role: "Backend", color: "neutral" },
  { id: "leo", name: "Leo Park", role: "Frontend", color: "blue" },
];

export interface TicketComment {
  id: string;
  author: string;
  body: string;
  time: string;
}

export interface Ticket {
  /** Ticket key, e.g. "DS-38". */
  id: string;
  epic: string;
  title: string;
  priority: Priority;
  project: ProjectId;
  /** Member ids. */
  assignees: string[];
  stage: StageId;
  /** Day of the month the ticket was opened (September). */
  created: number;
  /** Day it reached Done. */
  completed?: number;
  /** Agent tokens spent per weekday, Monday first. */
  tokens: number[];
  comments: TicketComment[];
}

export const MONTH = "Sep";

export function stageOf(id: StageId): Stage {
  return STAGES.find((s) => s.id === id) ?? (STAGES[0] as Stage);
}

export function projectLabel(id: ProjectId) {
  return PROJECTS.find((p) => p.id === id)?.label ?? id;
}

export function memberOf(id: string) {
  return MEMBERS.find((m) => m.id === id);
}

export function peopleOf(ids: readonly string[]): AvatarStackPerson[] {
  return ids.flatMap((id) => {
    const m = memberOf(id);
    // One letter fits the 24px disc; the full name stays the accessible label.
    return m ? [{ id: m.id, name: m.name, initials: m.name.charAt(0), color: m.color, description: m.role }] : [];
  });
}

/* ------------------------------------------------------------ project tag */

export function ProjectTag({ project, className }: { project: ProjectId; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex h-[22px] items-center gap-1 rounded-md border border-border-button-default px-1.5 text-caption-1-medium whitespace-nowrap text-text-secondary",
        className,
      )}
    >
      <RiFolder3Line className="size-3.5 shrink-0 text-foreground-icon-tertiary" aria-hidden />
      {projectLabel(project)}
    </span>
  );
}

/* ------------------------------------------------------------ ticket card */

export interface TicketCardProps {
  ticket: Ticket;
  selected: boolean;
  dragging: boolean;
  /** Draw the insertion line above this card. */
  dropBefore: boolean;
  onOpen: () => void;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  /** Pointer is over this card; `before` is true in its upper half. */
  onDragOverCard: (before: boolean) => void;
  /** Alt + ArrowLeft/ArrowRight moves the ticket one stage. */
  onStep: (delta: -1 | 1) => void;
}

export function TicketCard({
  ticket,
  selected,
  dragging,
  dropBefore,
  onOpen,
  onDragStart,
  onDragEnd,
  onDragOverCard,
  onStep,
}: TicketCardProps) {
  const dateLabel = ticket.completed ? `Completed ${ticket.completed} ${MONTH}` : `Since ${ticket.created} ${MONTH}`;

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!event.altKey || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
    event.preventDefault();
    onStep(event.key === "ArrowLeft" ? -1 : 1);
  };

  return (
    <li
      className="relative"
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const box = event.currentTarget.getBoundingClientRect();
        onDragOverCard(event.clientY < box.top + box.height / 2);
      }}
    >
      {dropBefore ? (
        <span aria-hidden className="absolute inset-x-1 -top-[5px] h-0.5 rounded-full bg-border-focus-ring" />
      ) : null}
      <article
        draggable
        data-ticket={ticket.id}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className={cx(
          "group relative flex cursor-grab flex-col gap-2.5 rounded-2lg border bg-background-primary-default p-2.5 shadow-xs",
          "transition-[opacity,translate,border-color] duration-200 ease-out starting:translate-y-1 starting:opacity-0 motion-reduce:transition-none",
          selected ? "border-border-focus-ring" : "border-transparent hover:border-border-button-default",
          dragging && "opacity-40",
        )}
      >
        <div className="flex items-center gap-1.5">
          <span className="flex min-w-0 flex-1 items-center gap-0.5 text-body-medium text-text-secondary">
            <span className="whitespace-nowrap">{ticket.id}</span>
            <RiArrowRightSLine className="size-4 shrink-0 text-foreground-icon-tertiary" aria-hidden />
            <span className="truncate">{ticket.epic}</span>
          </span>
          {ticket.assignees.length > 0 ? (
            <AvatarStack people={peopleOf(ticket.assignees)} size="sm" max={3} tooltips={false} className="shrink-0" />
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <PriorityBadge priority={ticket.priority} showIcon={false} />
          <ProjectTag project={ticket.project} />
        </div>
        <h3 className="text-body-medium text-text-primary">
          <button
            type="button"
            onClick={onOpen}
            onKeyDown={onKeyDown}
            aria-label={`${ticket.id}: ${ticket.title}. ${PRIORITY_LABELS[ticket.priority]} priority, ${stageOf(ticket.stage).label}`}
            aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight"
            className="text-start outline-none after:absolute after:inset-0 after:rounded-2lg focus-visible:after:ring-2 focus-visible:after:ring-border-focus-ring"
          >
            {ticket.title}
          </button>
        </h3>
        <div className="flex items-center justify-between gap-2 text-caption-1-regular text-text-secondary">
          <span>{dateLabel}</span>
          {ticket.comments.length > 0 ? (
            <span className="inline-flex items-center gap-1" aria-label={`${ticket.comments.length} comments`}>
              <RiChat3Line className="size-3.5" aria-hidden />
              {ticket.comments.length}
            </span>
          ) : null}
        </div>
      </article>
    </li>
  );
}

/* ----------------------------------------------------------------- column */

export interface ColumnDrop {
  stage: StageId;
  /** Insert before this ticket; null appends to the column. */
  beforeId: string | null;
}

export interface BoardColumnProps {
  stage: Stage;
  /** Tickets in this stage before filters; drives "count/limit". */
  count: number;
  /** Tickets shown, after filters and sorting. */
  tickets: Ticket[];
  selectedId: string | null;
  draggingId: string | null;
  drop: ColumnDrop | null;
  /** Label of the stage "Move all" sends tickets to. */
  moveAllTo: string;
  onOpen: (id: string) => void;
  onAdd: () => void;
  onSortByPriority: () => void;
  onMoveAll: () => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDropChange: (drop: ColumnDrop | null) => void;
  onDropTicket: (id: string) => void;
  onStep: (id: string, delta: -1 | 1) => void;
}

export function BoardColumn({
  stage,
  count,
  tickets,
  selectedId,
  draggingId,
  drop,
  moveAllTo,
  onOpen,
  onAdd,
  onSortByPriority,
  onMoveAll,
  onDragStart,
  onDragEnd,
  onDropChange,
  onDropTicket,
  onStep,
}: BoardColumnProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isTarget = drop?.stage === stage.id;
  const over = count > stage.limit;

  const menuAction = (run: () => void) => () => {
    setMenuOpen(false);
    run();
  };

  return (
    <section
      aria-label={stage.label}
      data-stage={stage.id}
      onDragOver={(event) => {
        if (!draggingId) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        if (!isTarget) onDropChange({ stage: stage.id, beforeId: null });
      }}
      onDragLeave={(event) => {
        if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
        if (isTarget) onDropChange(null);
      }}
      onDrop={(event) => {
        event.preventDefault();
        const id = event.dataTransfer.getData("text/plain") || draggingId;
        if (id) onDropTicket(id);
      }}
      className={cx(
        "flex h-full w-[268px] shrink-0 flex-col gap-1 rounded-2xl bg-background-secondary-default p-1.5 transition-shadow duration-150 ease-out motion-reduce:transition-none",
        isTarget && "ring-2 ring-border-focus-ring ring-inset",
      )}
    >
      <header className="flex items-center gap-1 ps-1.5 pt-0.5">
        <h2 className="text-body-semibold text-text-primary">{stage.label}</h2>
        <span
          className={cx("text-body-regular tabular-nums", over ? "text-text-destructive" : "text-text-secondary")}
          aria-label={`${count} of ${stage.limit}${over ? ", over the limit" : ""}`}
        >
          {count}/{stage.limit}
        </span>
        <span className="flex-1" />
        <Dropdown isOpen={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownTrigger
            aria-label={`${stage.label} options`}
            className="flex size-7 items-center justify-center rounded-lg text-foreground-icon-secondary hover:bg-background-tertiary-default"
          >
            <RiMoreFill className="size-4" aria-hidden />
          </DropdownTrigger>
          <DropdownPopover aria-label={`${stage.label} options`} placement="bottom end" className="w-[220px] p-2">
            <DropdownItem onSelect={menuAction(onAdd)}>Add ticket</DropdownItem>
            <DropdownItem onSelect={menuAction(onSortByPriority)}>Sort by priority</DropdownItem>
            <DropdownItem onSelect={menuAction(onMoveAll)}>Move all to {moveAllTo}</DropdownItem>
          </DropdownPopover>
        </Dropdown>
        <IconButton
          icon={RiAddLine}
          size="small"
          aria-label={`Add ticket to ${stage.label}`}
          onClick={onAdd}
          className="size-7 border-transparent bg-transparent shadow-none"
        />
      </header>
      <ol className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain p-0.5 pb-2">
        {tickets.map((ticket, index) => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            selected={ticket.id === selectedId}
            dragging={ticket.id === draggingId}
            dropBefore={isTarget && drop?.beforeId === ticket.id}
            onOpen={() => onOpen(ticket.id)}
            onDragStart={(event) => {
              event.dataTransfer.setData("text/plain", ticket.id);
              event.dataTransfer.effectAllowed = "move";
              onDragStart(ticket.id);
            }}
            onDragEnd={onDragEnd}
            onDragOverCard={(before) =>
              onDropChange({ stage: stage.id, beforeId: before ? ticket.id : (tickets[index + 1]?.id ?? null) })
            }
            onStep={(delta) => onStep(ticket.id, delta)}
          />
        ))}
        {isTarget && drop?.beforeId === null && tickets.length > 0 ? (
          <li aria-hidden className="mx-1 h-0.5 shrink-0 rounded-full bg-border-focus-ring" />
        ) : null}
        {tickets.length === 0 ? (
          <li className="flex flex-col items-center gap-2 rounded-2lg border border-dashed border-border-button-default px-3 py-6 text-center">
            <RiTicket2Line className="size-5 text-foreground-icon-tertiary" aria-hidden />
            <p className="text-caption-1-regular text-text-secondary">
              {count > 0 ? "Filters hide every ticket here." : "Nothing here. Drop a ticket or add one."}
            </p>
          </li>
        ) : null}
      </ol>
    </section>
  );
}

/* ------------------------------------------------------------- new ticket */

export interface NewTicketInput {
  title: string;
  epic: string;
  stage: StageId;
  priority: Priority;
  project: ProjectId;
  assignee: string;
}

export interface NewTicketDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Stage preselected when the dialog opens. */
  stage: StageId;
  onCreate: (input: NewTicketInput) => void;
}

/** Controlled create-ticket dialog: opened from the header button or a column's "+". */
export function NewTicketDialog({ isOpen, onOpenChange, stage, onCreate }: NewTicketDialogProps) {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="sm">
      {/* Keyed by stage so every opening starts from a clean form. */}
      {isOpen ? <NewTicketForm key={stage} stage={stage} onCreate={onCreate} onCancel={() => onOpenChange(false)} /> : null}
    </Modal>
  );
}

function NewTicketForm({
  stage: initialStage,
  onCreate,
  onCancel,
}: {
  stage: StageId;
  onCreate: (input: NewTicketInput) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [epic, setEpic] = useState("");
  const [stage, setStage] = useState<StageId>(initialStage);
  const [priority, setPriority] = useState<Priority>("medium");
  const [project, setProject] = useState<ProjectId>("kinetic");
  const [assignee, setAssignee] = useState("jordan");
  const ready = title.trim().length > 0;
  const formId = "project-board-new-ticket";

  return (
    <>
      <ModalHeader icon={RiTicket2Line} title="New ticket" description="It lands at the top of the column you pick." />
      <ModalBody>
        <form
          id={formId}
          className="grid grid-cols-2 gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!ready) return;
            onCreate({ title: title.trim(), epic: epic.trim() || "General", stage, priority, project, assignee });
          }}
        >
          <Input label="Title" placeholder="What needs doing?" value={title} onChange={setTitle} autoFocus className="col-span-2" />
          <Input label="Epic" placeholder="General" value={epic} onChange={setEpic} />
          <Select
            label="Status"
            selectedKey={stage}
            onSelectionChange={(key) => key !== null && setStage(key as StageId)}
            triggerClassName="w-full"
          >
            {STAGES.map((s) => (
              <SelectItem key={s.id} id={s.id} textValue={s.label}>
                {s.label}
              </SelectItem>
            ))}
          </Select>
          <Select
            label="Priority"
            selectedKey={priority}
            onSelectionChange={(key) => key !== null && setPriority(key as Priority)}
            triggerClassName="w-full"
          >
            {PRIORITIES.map((p) => (
              <SelectItem key={p} id={p} textValue={PRIORITY_LABELS[p]}>
                {PRIORITY_LABELS[p]}
              </SelectItem>
            ))}
          </Select>
          <Select
            label="Project"
            selectedKey={project}
            onSelectionChange={(key) => key !== null && setProject(key as ProjectId)}
            triggerClassName="w-full"
          >
            {PROJECTS.map((p) => (
              <SelectItem key={p.id} id={p.id} textValue={p.label}>
                {p.label}
              </SelectItem>
            ))}
          </Select>
          <Select
            label="Assignee"
            selectedKey={assignee}
            onSelectionChange={(key) => key !== null && setAssignee(String(key))}
            className="col-span-2"
            triggerClassName="w-full"
          >
            {MEMBERS.map((m) => (
              <SelectItem key={m.id} id={m.id} textValue={m.name}>
                {m.name}
              </SelectItem>
            ))}
          </Select>
        </form>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" form={formId} disabled={!ready}>
          Create ticket
        </Button>
      </ModalFooter>
    </>
  );
}
