/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Patients Table" (boardui.com/templates/medical-profile).
 * No BoardUI source was used.
 */
"use client";

import { useMemo, useState } from "react";
import {
  Button as AriaButton,
  type Key,
  type Selection,
  type SortDescriptor,
} from "react-aria-components";
import { DateFormatter, parseDate } from "@internationalized/date";
import {
  RiAlarmWarningLine,
  RiArchiveLine,
  RiCalendarScheduleLine,
  RiEdit2Line,
  RiFileTextLine,
  RiHomeHeartLine,
  RiHotelBedLine,
  RiMessage2Line,
  RiMore2Fill,
  RiSearchLine,
  RiWalkLine,
  type RemixiconComponentType,
} from "@remixicon/react";
import { cx } from "@/registry/lib/cx";
import { ChevronSortDown } from "@/registry/lib/chevrons";
import { Avatar, type AvatarProps } from "@/registry/ui/avatar";
import { Checkbox } from "@/registry/ui/checkbox";
import { Chip, type ChipColor } from "@/registry/ui/chip";
import {
  Dropdown,
  DropdownGroup,
  DropdownItem,
  DropdownPopover,
  DropdownTrigger,
} from "@/registry/ui/dropdown";
import { InputBase } from "@/registry/ui/input";
import { Pagination } from "@/registry/ui/pagination";
import { Select, SelectItem } from "@/registry/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@/registry/ui/table";
import { Tooltip, TooltipTrigger } from "@/registry/ui/tooltip";

/* ------------------------------------------------------------------- types */

export type PatientStatus = "stable" | "observation" | "critical" | "recovering" | "treatment";
export type Admission = "inpatient" | "outpatient" | "emergency" | "discharged";
export type PatientAction = "view" | "edit" | "book" | "message" | "archive";

export interface Patient {
  id: string;
  name: string;
  /** Defaults to the first letters of the first and last name. */
  initials?: string;
  avatarColor?: AvatarProps["color"];
  age?: number;
  admission: Admission;
  status: PatientStatus;
  conditions: string[];
  /** ISO calendar date, e.g. "2026-03-02". */
  lastVisit?: string;
  /** ISO calendar date, e.g. "2026-05-14". */
  nextAppointment?: string;
}

export interface PatientsTableProps {
  patients: Patient[];
  /** Rows per page; the footer pagination hides itself on a single page. */
  pageSize?: number;
  /** Controlled selection (patient ids). Survives filtering and paging. */
  selectedKeys?: Iterable<Key>;
  defaultSelectedKeys?: Iterable<Key>;
  onSelectionChange?: (keys: Set<Key>) => void;
  /** Called when a row's admission select changes. */
  onAdmissionChange?: (id: string, admission: Admission) => void;
  /** Row actions: chart, edit and the three items in the more menu. */
  onAction?: (action: PatientAction, patient: Patient) => void;
  /** Options for the condition filter; defaults to every condition in `patients`. */
  conditionOptions?: string[];
  /** Locale for the date columns. */
  locale?: string;
  className?: string;
  "aria-label"?: string;
}

/* ------------------------------------------------------------------ lookups */

export const PATIENT_STATUS: Record<PatientStatus, { label: string; color: ChipColor }> = {
  stable: { label: "Stable", color: "lime" },
  observation: { label: "Under observation", color: "yellow" },
  critical: { label: "Critical", color: "rose" },
  recovering: { label: "Recovering", color: "cyan" },
  treatment: { label: "In treatment", color: "blue" },
};

const ADMISSIONS: { id: Admission; label: string; icon: RemixiconComponentType }[] = [
  { id: "inpatient", label: "Inpatient", icon: RiHotelBedLine },
  { id: "outpatient", label: "Outpatient", icon: RiWalkLine },
  { id: "emergency", label: "Emergency", icon: RiAlarmWarningLine },
  { id: "discharged", label: "Discharged", icon: RiHomeHeartLine },
];

const MORE_ACTIONS: { id: PatientAction; label: string; icon: RemixiconComponentType }[] = [
  { id: "book", label: "Book appointment", icon: RiCalendarScheduleLine },
  { id: "message", label: "Send message", icon: RiMessage2Line },
  { id: "archive", label: "Archive patient", icon: RiArchiveLine },
];

const SORTABLE = new Set<Key>(["name", "nextAppointment"]);

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** Missing dates sort after real ones in either direction. */
function compareOptional(a: string | undefined, b: string | undefined, dir: 1 | -1) {
  if (a === b) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  return a < b ? -dir : dir;
}

/* -------------------------------------------------------------- component */

export function PatientsTable({
  patients,
  pageSize = 6,
  selectedKeys,
  defaultSelectedKeys,
  onSelectionChange,
  onAdmissionChange,
  onAction,
  conditionOptions,
  locale = "en-US",
  className,
  "aria-label": ariaLabel = "Patients",
}: PatientsTableProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PatientStatus | "all">("all");
  const [conditionFilter, setConditionFilter] = useState("all");
  const [sort, setSort] = useState<SortDescriptor | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [admissions, setAdmissions] = useState<Record<string, Admission>>({});
  const [ownSelection, setOwnSelection] = useState<Set<Key>>(
    () => new Set(defaultSelectedKeys ?? []),
  );

  const conditions = useMemo(
    () => conditionOptions ?? [...new Set(patients.flatMap((p) => p.conditions))].sort(),
    [conditionOptions, patients],
  );
  const dateFormatter = useMemo(
    () => new DateFormatter(locale, { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" }),
    [locale],
  );
  const formatDate = (iso: string | undefined) =>
    iso ? dateFormatter.format(parseDate(iso).toDate("UTC")) : "—";

  // #region critical
  // Filter → sort → page. Selection is kept as one Set of ids across every
  // page; React Aria only ever sees the ids that are on the visible page, and
  // its answers are merged back so off-page picks are never lost.
  const selected = useMemo(
    () => (selectedKeys !== undefined ? new Set(selectedKeys) : ownSelection),
    [selectedKeys, ownSelection],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = patients.filter(
      (p) =>
        (statusFilter === "all" || p.status === statusFilter) &&
        (conditionFilter === "all" || p.conditions.includes(conditionFilter)) &&
        (q === "" || p.name.toLowerCase().includes(q)),
    );
    if (!sort || !SORTABLE.has(sort.column)) return filtered;
    const dir = sort.direction === "ascending" ? 1 : -1;
    return [...filtered].sort((a, b) =>
      sort.column === "name"
        ? a.name.localeCompare(b.name, locale) * dir
        : compareOptional(a.nextAppointment, b.nextAppointment, dir),
    );
  }, [patients, query, statusFilter, conditionFilter, sort, locale]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageSelection = new Set<Key>(pageRows.filter((p) => selected.has(p.id)).map((p) => p.id));

  const commitSelection = (next: Set<Key>) => {
    if (selectedKeys === undefined) setOwnSelection(next);
    onSelectionChange?.(next);
  };

  const handleSelectionChange = (keys: Selection) => {
    const pageIds = pageRows.map((p) => p.id);
    const next = new Set(selected);
    for (const id of pageIds) next.delete(id);
    for (const id of keys === "all" ? pageIds : keys) next.add(id);
    commitSelection(next);
  };

  const resetPage = () => setPage(1);
  // #endregion

  const setAdmission = (id: string, value: Admission) => {
    setAdmissions((prev) => ({ ...prev, [id]: value }));
    onAdmissionChange?.(id, value);
  };

  return (
    <section
      className={cx(
        "flex w-full min-w-0 flex-col rounded-2xl border border-border-table pt-2",
        totalPages > 1 ? "pb-3" : "pb-0",
        className,
      )}
    >
      {/* Toolbar */}
      <div className="flex w-full flex-col items-start gap-3 px-3 py-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col justify-center">
          <p className="text-body-medium whitespace-nowrap text-text-tertiary">Total Results</p>
          <p className="text-body-medium whitespace-nowrap text-text-primary" aria-live="polite">
            {rows.length.toLocaleString(locale)} {rows.length === 1 ? "patient" : "patients"}
            {selected.size > 0 ? (
              <span className="text-text-tertiary"> · {selected.size} selected</span>
            ) : null}
          </p>
        </div>
        <div className="-mx-3 flex w-[calc(100%+1.5rem)] items-center gap-2.5 overflow-x-auto px-3 sm:mx-0 sm:w-auto sm:flex-wrap sm:justify-end sm:overflow-visible sm:px-0">
          <Select
            aria-label="Filter by status"
            className="shrink-0"
            popoverClassName="min-w-44"
            selectedKey={statusFilter}
            onSelectionChange={(k) => {
              const next = k === "all" ? "all" : (Object.keys(PATIENT_STATUS) as PatientStatus[]).find((s) => s === k);
              if (next) {
                setStatusFilter(next);
                resetPage();
              }
            }}
          >
            <SelectItem id="all" textValue="All statuses">
              All statuses
            </SelectItem>
            {(Object.keys(PATIENT_STATUS) as PatientStatus[]).map((s) => (
              <SelectItem key={s} id={s} textValue={PATIENT_STATUS[s].label}>
                {PATIENT_STATUS[s].label}
              </SelectItem>
            ))}
          </Select>
          <Select
            aria-label="Filter by condition"
            className="shrink-0"
            popoverClassName="min-w-44"
            selectedKey={conditionFilter}
            onSelectionChange={(k) => {
              if (k == null) return;
              setConditionFilter(String(k));
              resetPage();
            }}
          >
            <SelectItem id="all" textValue="All conditions">
              All conditions
            </SelectItem>
            {conditions.map((c) => (
              <SelectItem key={c} id={c} textValue={c}>
                {c}
              </SelectItem>
            ))}
          </Select>
          <InputBase
            aria-label="Search patients"
            placeholder="Search"
            leadingIcon={RiSearchLine}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              resetPage();
            }}
            fieldClassName="min-w-[153px] flex-1 rounded-full bg-background-secondary-default sm:w-[153px] sm:min-w-0 sm:flex-none"
            className="text-body-medium"
          />
        </div>
      </div>

      <div className="mt-2">
        <Table
          aria-label={ariaLabel}
          selectionMode="multiple"
          selectedKeys={pageSelection}
          onSelectionChange={handleSelectionChange}
          sortDescriptor={sort}
          onSortChange={(d) => {
            setSort(d);
            resetPage();
          }}
          className="min-w-[1060px]"
        >
          <TableHeader>
            <TableColumn id="name" isRowHeader allowsSorting className="w-[220px]">
              {({ sortDirection }) => (
                <div className="flex items-center gap-2">
                  <Checkbox slot="selection" />
                  <SortLabel direction={sortDirection}>Patient</SortLabel>
                </div>
              )}
            </TableColumn>
            <TableColumn id="admission" className="w-[180px]">
              Admission
            </TableColumn>
            <TableColumn id="status" className="w-[176px]">
              Status
            </TableColumn>
            <TableColumn id="conditions" className="w-[194px]">
              Condition
            </TableColumn>
            <TableColumn id="nextAppointment" allowsSorting className="w-[186px]">
              {({ sortDirection }) => <SortLabel direction={sortDirection}>Next appointment</SortLabel>}
            </TableColumn>
            <TableColumn id="actions" className="w-[140px]">
              Actions
            </TableColumn>
          </TableHeader>
          <TableBody
            items={pageRows}
            renderEmptyState={() => (
              <div className="flex h-40 items-center justify-center text-body-medium text-text-tertiary">
                No patients match these filters
              </div>
            )}
          >
            {(p) => {
              const admission = admissions[p.id] ?? p.admission;
              return (
                <TableRow id={p.id} className="cursor-default">
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-2">
                      <Checkbox slot="selection" />
                      <Avatar size="sm" color={p.avatarColor ?? "neutral"} initials={p.initials ?? initialsOf(p.name)} />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-body-medium text-text-primary">{p.name}</span>
                        {p.age !== undefined ? (
                          <span className="text-caption-1-regular text-text-tertiary">{p.age} yrs</span>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      aria-label={`Admission for ${p.name}`}
                      className="w-[150px]"
                      selectedKey={admission}
                      onSelectionChange={(k) => {
                        const next = ADMISSIONS.find((a) => a.id === k);
                        if (next) setAdmission(p.id, next.id);
                      }}
                    >
                      {ADMISSIONS.map(({ id, label, icon: Icon }) => (
                        <SelectItem key={id} id={id} textValue={label}>
                          <Icon className="size-4 shrink-0 text-foreground-icon-secondary" aria-hidden />
                          {label}
                        </SelectItem>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Chip variant="bold" color={PATIENT_STATUS[p.status].color}>
                      {PATIENT_STATUS[p.status].label}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      {p.conditions.map((c) => (
                        <Chip key={c} variant="bold" color="gray">
                          {c}
                        </Chip>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col whitespace-nowrap">
                      <span>{formatDate(p.nextAppointment)}</span>
                      {p.lastVisit ? (
                        <span className="text-caption-1-regular text-text-tertiary">
                          Last visit {formatDate(p.lastVisit)}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <RowActionButton
                        icon={RiFileTextLine}
                        label="Open chart"
                        name={p.name}
                        onPress={() => onAction?.("view", p)}
                      />
                      <RowActionButton
                        icon={RiEdit2Line}
                        label="Edit patient"
                        name={p.name}
                        onPress={() => onAction?.("edit", p)}
                      />
                      <RowMoreMenu name={p.name} onAction={(a) => onAction?.(a, p)} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            }}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 ? (
        <div className="border-t border-separator-border px-3 pt-3">
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onChange={setPage}
            aria-label="Patients pages"
          />
        </div>
      ) : null}
    </section>
  );
}

/* ---------------------------------------------------------------- pieces */

function SortLabel({
  direction,
  children,
}: {
  direction: SortDescriptor["direction"] | undefined;
  children: string;
}) {
  return (
    <span className="flex cursor-pointer items-center gap-0.5">
      {children}
      <ChevronSortDown
        aria-hidden
        className={cx(
          "size-6 shrink-0 transition-[transform,color] duration-150 ease-out motion-reduce:transition-none",
          direction === "ascending" && "rotate-180",
          direction ? "text-text-secondary" : "text-text-tertiary",
        )}
      />
    </span>
  );
}

const ROW_BUTTON = cx(
  "relative inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-2lg",
  "border border-border-button-default bg-background-primary-default text-foreground-icon-primary shadow-xs",
  "transition-[background-color,border-color,box-shadow,color] duration-150 ease-out motion-reduce:transition-none",
  "hover:border-border-button-hover hover:bg-background-primary-hover",
  "data-[pressed]:border-border-button-active data-[pressed]:bg-background-primary-active",
  "outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-border-focus-ring data-[focus-visible]:ring-offset-2",
);

/** A React Aria button (not IconButton's plain <button>), so a press stays
 *  on the button and never toggles the row's selection. */
function RowActionButton({
  icon: Icon,
  label,
  name,
  onPress,
}: {
  icon: RemixiconComponentType;
  label: string;
  name: string;
  onPress: () => void;
}) {
  return (
    <TooltipTrigger delay={200}>
      <AriaButton aria-label={`${label}: ${name}`} onPress={onPress} className={ROW_BUTTON}>
        <Icon className="size-4 shrink-0" aria-hidden />
      </AriaButton>
      <Tooltip size="md">{label}</Tooltip>
    </TooltipTrigger>
  );
}

function RowMoreMenu({ name, onAction }: { name: string; onAction: (action: PatientAction) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Dropdown isOpen={isOpen} onOpenChange={setIsOpen}>
      <DropdownTrigger
        aria-label={`More actions: ${name}`}
        className={cx(ROW_BUTTON, isOpen && "border-border-button-active bg-background-primary-active")}
      >
        <RiMore2Fill className="size-4 shrink-0" aria-hidden />
      </DropdownTrigger>
      <DropdownPopover aria-label={`More actions: ${name}`} placement="bottom end" className="w-[220px] p-2">
        <DropdownGroup>
          {MORE_ACTIONS.map(({ id, label, icon: Icon }) => (
            <DropdownItem
              key={id}
              className="px-2 py-1.5"
              onSelect={() => {
                setIsOpen(false);
                onAction(id);
              }}
            >
              <Icon className="size-[18px] shrink-0 text-foreground-icon-secondary" aria-hidden />
              <span className="truncate text-body-medium whitespace-nowrap text-text-primary">{label}</span>
            </DropdownItem>
          ))}
        </DropdownGroup>
      </DropdownPopover>
    </Dropdown>
  );
}
