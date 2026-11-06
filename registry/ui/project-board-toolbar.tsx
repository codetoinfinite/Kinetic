/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Project Board" (boardui.com/templates/project-board).
 * No BoardUI source was used.
 */
"use client";

import { useRef, useState } from "react";
import { RiArrowUpDownLine, RiCheckLine, RiEqualizer2Line, RiInbox2Line } from "@remixicon/react";

import { Popover, PopoverFooter, PopoverHeader, PopoverTrigger } from "@/registry/ui/popover";
import { Dropdown, DropdownItem, DropdownPopover, DropdownTrigger } from "@/registry/ui/dropdown";
import { Button } from "@/registry/ui/button";
import { Checkbox } from "@/registry/ui/checkbox";
import { PRIORITIES, PRIORITY_LABELS, type Priority } from "@/registry/ui/priority-badge";
import { cx } from "@/registry/lib/cx";
import { PROJECTS, type ProjectId } from "@/registry/ui/project-board-parts";

const TRIGGER_BASE =
  "relative flex size-9 shrink-0 items-center justify-center rounded-lg border border-border-button-default bg-background-primary-default text-foreground-icon-secondary shadow-xs outline-none transition-colors duration-150 ease-out hover:bg-background-primary-hover motion-reduce:transition-none";
/** RAC button (Dropdown): focus ring from its data attribute. */
const TRIGGER = `${TRIGGER_BASE} data-[focus-visible]:ring-2 data-[focus-visible]:ring-border-focus-ring`;
/** Native button (PopoverTrigger wraps it in Pressable). */
const TRIGGER_NATIVE = `${TRIGGER_BASE} focus-visible:ring-2 focus-visible:ring-border-focus-ring`;
const DOT = "pointer-events-none absolute -end-0.5 -top-0.5 size-2.5 rounded-full border-2 border-background-full bg-chart-5";

/* ------------------------------------------------------------------ inbox */

export interface ActivityEntry {
  id: string;
  text: string;
  time: string;
  unread: boolean;
}

export interface InboxPopoverProps {
  entries: ActivityEntry[];
  onEntriesChange: (entries: ActivityEntry[]) => void;
}

/** Board activity: every move, edit and comment lands here. Closing marks it read. */
export function InboxPopover({ entries, onEntriesChange }: InboxPopoverProps) {
  const unread = entries.filter((e) => e.unread).length;
  return (
    <PopoverTrigger
      onOpenChange={(open) => {
        if (!open && unread > 0) onEntriesChange(entries.map((e) => ({ ...e, unread: false })));
      }}
    >
      <button type="button" className={TRIGGER_NATIVE} aria-label={unread ? `Board activity, ${unread} new` : "Board activity"}>
        <RiInbox2Line className="size-5" aria-hidden />
        {unread > 0 ? <span aria-hidden className={DOT} /> : null}
      </button>
      <Popover placement="bottom end" className="w-[320px]" dialogClassName="flex flex-col gap-3 p-3">
        <PopoverHeader title="Board activity" description="Moves, edits and comments on this board." />
        {entries.length === 0 ? (
          <p className="py-6 text-center text-body-regular text-text-secondary">Nothing new on the board.</p>
        ) : (
          <ul className="-mx-1 flex max-h-[260px] flex-col overflow-y-auto overscroll-contain">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-start gap-2 rounded-lg px-1 py-1.5">
                <span
                  aria-hidden
                  className={cx("mt-1.5 size-1.5 shrink-0 rounded-full", entry.unread ? "bg-chart-5" : "bg-background-quaternary-default")}
                />
                <span className="min-w-0 flex-1 text-body-regular text-text-primary">{entry.text}</span>
                <span className="shrink-0 text-caption-1-regular text-text-tertiary">{entry.time}</span>
              </li>
            ))}
          </ul>
        )}
        <PopoverFooter>
          <Button
            variant="ghost"
            size="small"
            disabled={entries.length === 0}
            onClick={(event) => {
              // Keep focus inside the popover once the button disables itself.
              event.currentTarget.closest<HTMLElement>('[role="dialog"]')?.focus();
              onEntriesChange([]);
            }}
          >
            Clear activity
          </Button>
        </PopoverFooter>
      </Popover>
    </PopoverTrigger>
  );
}

/* ------------------------------------------------------------------- sort */

export type SortKey = "manual" | "priority" | "newest" | "title";

export const SORTS: { id: SortKey; label: string }[] = [
  { id: "manual", label: "Manual order" },
  { id: "priority", label: "Priority" },
  { id: "newest", label: "Newest first" },
  { id: "title", label: "Title A to Z" },
];

export function SortMenu({ sort, onSortChange }: { sort: SortKey; onSortChange: (sort: SortKey) => void }) {
  const [open, setOpen] = useState(false);
  const current = SORTS.find((s) => s.id === sort)?.label ?? "Manual order";
  return (
    <Dropdown isOpen={open} onOpenChange={setOpen}>
      <DropdownTrigger aria-label={`Sort tickets: ${current}`} className={TRIGGER}>
        <RiArrowUpDownLine className="size-5" aria-hidden />
        {sort !== "manual" ? (
          <span aria-hidden className={DOT} />
        ) : null}
      </DropdownTrigger>
      <DropdownPopover aria-label="Sort tickets" placement="bottom end" className="w-[220px] p-2">
        {SORTS.map((option) => (
          <DropdownItem
            key={option.id}
            selected={option.id === sort}
            onSelect={() => {
              onSortChange(option.id);
              setOpen(false);
            }}
          >
            <span className="flex-1 text-start">{option.label}</span>
            {option.id === sort ? <RiCheckLine className="size-4 text-foreground-icon-secondary" aria-hidden /> : null}
          </DropdownItem>
        ))}
      </DropdownPopover>
    </Dropdown>
  );
}

/* ----------------------------------------------------------------- filter */

export interface BoardFilter {
  /** Empty means every priority. */
  priorities: ReadonlySet<Priority>;
  /** Empty means every project. */
  projects: ReadonlySet<ProjectId>;
  /** Only tickets assigned to the signed-in member. */
  mine: boolean;
}

export const NO_FILTER: BoardFilter = { priorities: new Set(), projects: new Set(), mine: false };

export function filterCount(filter: BoardFilter) {
  return filter.priorities.size + filter.projects.size + (filter.mine ? 1 : 0);
}

function toggled<T>(set: ReadonlySet<T>, value: T, on: boolean) {
  const next = new Set(set);
  if (on) next.add(value);
  else next.delete(value);
  return next;
}

export interface FilterPopoverProps {
  filter: BoardFilter;
  onFilterChange: (filter: BoardFilter) => void;
  /** Name shown on the "only mine" checkbox. */
  meName: string;
}

export function FilterPopover({ filter, onFilterChange, meName }: FilterPopoverProps) {
  const active = filterCount(filter);
  const bodyRef = useRef<HTMLFieldSetElement>(null);
  return (
    <PopoverTrigger>
      <button type="button" className={TRIGGER_NATIVE} aria-label={active ? `Filter tickets, ${active} active` : "Filter tickets"}>
        <RiEqualizer2Line className="size-5" aria-hidden />
        {active > 0 ? (
          <span
            aria-hidden
            className="pointer-events-none absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-chart-5 px-1 text-[10px] leading-none font-semibold text-text-white tabular-nums"
          >
            {active}
          </span>
        ) : null}
      </button>
      <Popover placement="bottom end" className="w-[300px]" dialogClassName="flex flex-col gap-3 p-3">
        <PopoverHeader title="Filter tickets" description="Columns keep their counts for every ticket." />
        <fieldset ref={bodyRef} className="flex flex-col gap-2">
          <legend className="mb-2 text-caption-1-medium text-text-tertiary">Priority</legend>
          <div className="grid grid-cols-2 gap-2">
            {PRIORITIES.map((p) => (
              <Checkbox
                key={p}
                isSelected={filter.priorities.has(p)}
                onChange={(on) => onFilterChange({ ...filter, priorities: toggled(filter.priorities, p, on) })}
              >
                {PRIORITY_LABELS[p]}
              </Checkbox>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-caption-1-medium text-text-tertiary">Project</legend>
          <div className="grid grid-cols-2 gap-2">
            {PROJECTS.map((p) => (
              <Checkbox
                key={p.id}
                isSelected={filter.projects.has(p.id)}
                onChange={(on) => onFilterChange({ ...filter, projects: toggled(filter.projects, p.id, on) })}
              >
                {p.label}
              </Checkbox>
            ))}
          </div>
        </fieldset>
        <Checkbox isSelected={filter.mine} onChange={(on) => onFilterChange({ ...filter, mine: on })}>
          Only {meName}&apos;s tickets
        </Checkbox>
        <PopoverFooter>
          <Button
            variant="ghost"
            size="small"
            disabled={active === 0}
            onClick={() => {
              // The button disables itself; hand focus to the first box so Escape still closes the popover.
              bodyRef.current?.querySelector("input")?.focus();
              onFilterChange(NO_FILTER);
            }}
          >
            Reset filters
          </Button>
        </PopoverFooter>
      </Popover>
    </PopoverTrigger>
  );
}
