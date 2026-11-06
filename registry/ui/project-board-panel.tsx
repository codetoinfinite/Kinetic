/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Project Board" (boardui.com/templates/project-board).
 * No BoardUI source was used.
 */
"use client";

import { useState } from "react";
import { RiArrowRightSLine, RiCloseLine, RiDeleteBinLine, RiSparkling2Line } from "@remixicon/react";

import { Avatar } from "@/registry/ui/avatar";
import { initialsOf } from "@/registry/ui/avatar-stack";
import { Button } from "@/registry/ui/button";
import { IconButton } from "@/registry/ui/icon-button";
import { Input } from "@/registry/ui/input";
import { Select, SelectItem } from "@/registry/ui/select";
import { Textarea } from "@/registry/ui/textarea";
import { PRIORITIES, PRIORITY_LABELS, type Priority } from "@/registry/ui/priority-badge";
import { cx } from "@/registry/lib/cx";
import {
  MEMBERS,
  MONTH,
  PROJECTS,
  STAGES,
  memberOf,
  type ProjectId,
  type StageId,
  type Ticket,
} from "@/registry/ui/project-board-parts";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function formatTokens(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

/* ------------------------------------------------------------ token chart */

/** Seven purple bars, one per weekday. Each bar carries its value for screen readers and on hover. */
export function TokenBars({ values, label }: { values: readonly number[]; label: string }) {
  const max = Math.max(1, ...values);
  const total = values.reduce((a, b) => a + b, 0);
  return (
    <figure className="flex flex-col gap-3 rounded-2lg bg-background-primary-default p-3 shadow-xs">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="text-body-medium text-text-primary">{label}</span>
        <span className="text-caption-1-regular text-text-secondary tabular-nums">{formatTokens(total)} this week</span>
      </figcaption>
      <ul className="flex h-[96px] items-end gap-2" aria-label={`${label} by day`}>
        {values.map((value, i) => (
          <li key={WEEKDAYS[i] ?? i} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <span className="relative flex w-full flex-1 items-end">
              <span
                className="w-full rounded-md bg-chart-5 transition-[height,background-color] duration-300 ease-out group-hover:bg-chart-5-active motion-reduce:transition-none"
                style={{ height: `${Math.max(4, (value / max) * 100)}%` }}
              />
              <span className="pointer-events-none absolute inset-x-0 -top-5 text-center text-caption-1-medium text-text-primary opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100 motion-reduce:transition-none">
                {formatTokens(value)}
              </span>
            </span>
            <span className="text-caption-1-regular text-text-tertiary">
              {WEEKDAYS[i]}
              <span className="sr-only">: {value} tokens</span>
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

/* ----------------------------------------------------------- detail panel */

export type TicketPatch = Partial<Pick<Ticket, "title" | "priority" | "project" | "assignees">>;

export interface TicketPanelProps {
  ticket: Ticket;
  onClose: () => void;
  onUpdate: (patch: TicketPatch, note: string) => void;
  onMove: (stage: StageId) => void;
  onComment: (body: string) => void;
  onDelete: () => void;
}

const FIELD_LABEL = "text-caption-1-medium text-text-tertiary";

/** Right-hand side panel for one ticket. Key it by ticket id so the title draft resets. */
export function TicketPanel({ ticket, onClose, onUpdate, onMove, onComment, onDelete }: TicketPanelProps) {
  const [title, setTitle] = useState(ticket.title);
  const [draft, setDraft] = useState("");

  const commitTitle = () => {
    const next = title.trim();
    if (!next) setTitle(ticket.title);
    else if (next !== ticket.title) onUpdate({ title: next }, `renamed ${ticket.id}`);
  };

  const toggleAssignee = (id: string) => {
    const on = ticket.assignees.includes(id);
    const assignees = on ? ticket.assignees.filter((a) => a !== id) : [...ticket.assignees, id];
    const name = memberOf(id)?.name ?? id;
    onUpdate({ assignees }, on ? `unassigned ${name} from ${ticket.id}` : `assigned ${name} to ${ticket.id}`);
  };

  return (
    <aside
      aria-label={`${ticket.id} details`}
      className="flex h-full w-[332px] shrink-0 flex-col overflow-hidden rounded-2xl bg-background-secondary-default"
    >
      <header className="flex items-center gap-2 border-b border-border-table px-3 py-2.5">
        <span className="flex min-w-0 flex-1 items-center gap-0.5 text-body-medium text-text-secondary">
          <span className="whitespace-nowrap">{ticket.id}</span>
          <RiArrowRightSLine className="size-4 shrink-0 text-foreground-icon-tertiary" aria-hidden />
          <span className="truncate">{ticket.epic}</span>
        </span>
        <IconButton icon={RiCloseLine} size="small" aria-label="Close details" onClick={onClose} />
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-3">
        <Input
          label="Title"
          value={title}
          onChange={setTitle}
          onBlur={commitTitle}
          onKeyDown={(event) => {
            if (event.key === "Enter") commitTitle();
          }}
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Status"
            size="sm"
            selectedKey={ticket.stage}
            onSelectionChange={(key) => key !== null && key !== ticket.stage && onMove(key as StageId)}
            className="col-span-2"
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
            size="sm"
            selectedKey={ticket.priority}
            onSelectionChange={(key) =>
              key !== null &&
              key !== ticket.priority &&
              onUpdate({ priority: key as Priority }, `set ${ticket.id} to ${PRIORITY_LABELS[key as Priority]}`)
            }
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
            size="sm"
            selectedKey={ticket.project}
            onSelectionChange={(key) =>
              key !== null &&
              key !== ticket.project &&
              onUpdate({ project: key as ProjectId }, `moved ${ticket.id} to ${PROJECTS.find((p) => p.id === key)?.label}`)
            }
            triggerClassName="w-full"
          >
            {PROJECTS.map((p) => (
              <SelectItem key={p.id} id={p.id} textValue={p.label}>
                {p.label}
              </SelectItem>
            ))}
          </Select>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className={cx(FIELD_LABEL, "mb-2")}>Assignees</legend>
          <div className="flex flex-wrap gap-1.5">
            {MEMBERS.map((m) => {
              const on = ticket.assignees.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={on}
                  aria-label={`${m.name}, ${on ? "assigned" : "not assigned"}`}
                  onClick={() => toggleAssignee(m.id)}
                  className={cx(
                    "inline-flex h-7 items-center gap-1.5 rounded-full border ps-0.5 pe-2.5 text-caption-1-medium outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-border-focus-ring motion-reduce:transition-none",
                    on
                      ? "border-border-focus-ring bg-background-primary-default text-text-primary"
                      : "border-border-button-default bg-transparent text-text-secondary hover:bg-background-primary-default",
                  )}
                >
                  <Avatar size="sm" color={m.color} initials={initialsOf(m.name)} />
                  {m.name.split(" ")[0]}
                </button>
              );
            })}
          </div>
        </fieldset>

        <dl className="grid grid-cols-2 gap-3 rounded-2lg bg-background-inner-default p-2.5">
          <div className="flex flex-col gap-0.5">
            <dt className={FIELD_LABEL}>Created</dt>
            <dd className="text-body-medium text-text-primary">
              {ticket.created} {MONTH}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className={FIELD_LABEL}>Completed</dt>
            <dd className="text-body-medium text-text-primary">{ticket.completed ? `${ticket.completed} ${MONTH}` : "Not yet"}</dd>
          </div>
        </dl>

        <TokenBars values={ticket.tokens} label="Agent tokens" />

        <section aria-label="Comments" className="flex flex-col gap-2.5">
          <h3 className={FIELD_LABEL}>Comments ({ticket.comments.length})</h3>
          {ticket.comments.length === 0 ? (
            <p className="text-body-regular text-text-secondary">No comments yet.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {ticket.comments.map((c) => {
                const author = memberOf(c.author);
                return (
                  <li key={c.id} className="flex gap-2">
                    <Avatar size="sm" color={author?.color ?? "neutral"} initials={initialsOf(author?.name ?? c.author)} />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <p className="flex items-baseline gap-1.5">
                        <span className="text-body-medium text-text-primary">{author?.name ?? c.author}</span>
                        <span className="text-caption-1-regular text-text-tertiary">{c.time}</span>
                      </p>
                      <p className="text-body-regular break-words text-text-secondary">{c.body}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const body = draft.trim();
              if (!body) return;
              onComment(body);
              setDraft("");
              // Submit disables itself on the empty draft; keep focus in the composer.
              event.currentTarget.querySelector("textarea")?.focus();
            }}
          >
            <Textarea label="Add a comment" placeholder="Write an update" rows={2} maxLength={240} value={draft} onChange={setDraft} />
            <div className="flex justify-end">
              <Button type="submit" size="small" disabled={draft.trim().length === 0}>
                Comment
              </Button>
            </div>
          </form>
        </section>

        <Button variant="danger" size="small" leadingIcon={RiDeleteBinLine} onClick={onDelete} className="self-start">
          Delete ticket
        </Button>
      </div>
    </aside>
  );
}

/* --------------------------------------------------------- board overview */

export interface BoardOverviewProps {
  tickets: Ticket[];
  onClose: () => void;
}

/** What the panel shows with no ticket open: load per column and the board's token spend. */
export function BoardOverview({ tickets, onClose }: BoardOverviewProps) {
  const weekly = [0, 1, 2, 3, 4, 5, 6].map((d) => tickets.reduce((sum, t) => sum + (t.tokens[d] ?? 0), 0));
  return (
    <aside
      aria-label="Board overview"
      className="flex h-full w-[332px] shrink-0 flex-col overflow-hidden rounded-2xl bg-background-secondary-default"
    >
      <header className="flex items-center gap-2 border-b border-border-table px-3 py-2.5">
        <h2 className="flex-1 text-body-semibold text-text-primary">Board overview</h2>
        <IconButton icon={RiCloseLine} size="small" aria-label="Close panel" onClick={onClose} />
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-3">
        <section aria-label="Column load" className="flex flex-col gap-2.5 rounded-2lg bg-background-primary-default p-3 shadow-xs">
          <h3 className="text-body-medium text-text-primary">Column load</h3>
          {STAGES.map((stage) => {
            const count = tickets.filter((t) => t.stage === stage.id).length;
            const over = count > stage.limit;
            return (
              <div key={stage.id} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-caption-1-regular">
                  <span className="text-text-secondary">{stage.label}</span>
                  <span className={cx("tabular-nums", over ? "text-text-destructive" : "text-text-primary")}>
                    {count}/{stage.limit}
                  </span>
                </div>
                <div
                  role="meter"
                  aria-label={`${stage.label} load`}
                  aria-valuemin={0}
                  aria-valuemax={stage.limit}
                  aria-valuenow={Math.min(count, stage.limit)}
                  className="h-1.5 overflow-hidden rounded-full bg-background-tertiary-default"
                >
                  <div
                    className={cx(
                      "h-full rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none",
                      over ? "bg-status-rose-text" : "bg-chart-5",
                    )}
                    style={{ width: `${Math.min(100, (count / stage.limit) * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </section>
        <TokenBars values={weekly} label="Board tokens" />
        <p className="flex items-start gap-2 rounded-2lg border border-dashed border-border-button-default p-3 text-body-regular text-text-secondary">
          <RiSparkling2Line className="mt-0.5 size-4 shrink-0 text-foreground-icon-tertiary" aria-hidden />
          Open a ticket to edit it. Drag cards between columns, or focus one and press Alt with an arrow key.
        </p>
      </div>
    </aside>
  );
}
