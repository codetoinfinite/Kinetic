/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Changes Diff Panel" (boardui.com/).
 * No BoardUI source was used.
 */
"use client";

import { useMemo, useState } from "react";
import type { Key } from "react-aria-components";
import {
  Button as AriaButton,
  Disclosure,
  DisclosureGroup,
  DisclosurePanel,
  Heading,
} from "react-aria-components";
import {
  RiArrowGoBackLine,
  RiArrowRightSLine,
  RiCheckLine,
  RiCloseLine,
  RiFileAddLine,
  RiFileCodeLine,
  RiFileReduceLine,
} from "@remixicon/react";

import { Button } from "@/registry/ui/button";
import { cx } from "@/registry/lib/cx";

export type ChangeStatus = "added" | "modified" | "deleted";
export type ChangeDecision = "accepted" | "rejected";
export type ChangeDecisions = Record<string, ChangeDecision>;

export interface ChangedFile {
  /** Repo-relative path; also the key for decisions and expansion. */
  path: string;
  /** Unified diff body: optional "@@ -a,b +c,d @@" hunk headers, then lines starting with " ", "+" or "-". */
  patch: string;
  status?: ChangeStatus;
}

export type DiffRow =
  | { kind: "hunk"; text: string }
  | { kind: "add" | "del" | "ctx"; text: string; oldNo: number | null; newNo: number | null };

export interface ParsedPatch {
  rows: DiffRow[];
  added: number;
  removed: number;
}

export interface ChangesDiffPanelProps {
  files: ChangedFile[];
  /** Controlled decisions, keyed by path. Files without an entry are pending. */
  decisions?: ChangeDecisions;
  defaultDecisions?: ChangeDecisions;
  onDecisionsChange?: (next: ChangeDecisions, change: { paths: string[]; decision: ChangeDecision | null }) => void;
  /** Paths whose diff starts open. */
  defaultExpanded?: string[];
  /** Fold a file's diff once it is accepted or rejected. */
  collapseOnDecide?: boolean;
  /** Accessible name of the panel. */
  title?: string;
  className?: string;
}

// #region critical
const HUNK_HEADER = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

/** Turns a unified diff body into rows with old and new line numbers, and counts its additions and removals. */
export function parsePatch(patch: string): ParsedPatch {
  const rows: DiffRow[] = [];
  let oldNo = 1;
  let newNo = 1;
  let added = 0;
  let removed = 0;
  for (const raw of patch.replace(/\n+$/, "").split("\n")) {
    const hunk = HUNK_HEADER.exec(raw);
    if (hunk) {
      oldNo = Math.max(1, Number(hunk[1]));
      newNo = Math.max(1, Number(hunk[2]));
      rows.push({ kind: "hunk", text: raw });
      continue;
    }
    if (raw.startsWith("\\")) continue;
    const sign = raw.charAt(0);
    if (sign === "+") {
      rows.push({ kind: "add", text: raw.slice(1), oldNo: null, newNo: newNo++ });
      added += 1;
    } else if (sign === "-") {
      rows.push({ kind: "del", text: raw.slice(1), oldNo: oldNo++, newNo: null });
      removed += 1;
    } else {
      rows.push({ kind: "ctx", text: sign === " " ? raw.slice(1) : raw, oldNo: oldNo++, newNo: newNo++ });
    }
  }
  return { rows, added, removed };
}

/** Applies one decision (or null to undo) to several paths and returns a new map. */
function applyDecision(prev: ChangeDecisions, paths: string[], decision: ChangeDecision | null): ChangeDecisions {
  const next = { ...prev };
  for (const path of paths) {
    if (decision) next[path] = decision;
    else delete next[path];
  }
  return next;
}
// #endregion

const ROW_TONE = {
  add: "bg-notification-success-background dark:bg-status-lime-background",
  del: "bg-notification-error-background dark:bg-status-rose-background",
  ctx: "",
} as const;

const SIGN = { add: "+", del: "−", ctx: " " } as const;

const STATUS_ICON = {
  added: { icon: RiFileAddLine, tone: "text-notification-success-foreground", badge: "New" },
  deleted: { icon: RiFileReduceLine, tone: "text-notification-error-foreground", badge: "Deleted" },
  modified: { icon: RiFileCodeLine, tone: "text-foreground-icon-secondary", badge: null },
} as const;

function IconAction({
  label,
  icon: Icon,
  tone,
  disabled = false,
  onPress,
}: {
  label: string;
  icon: typeof RiCheckLine;
  tone?: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onPress}
      className={cx(
        "grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg text-foreground-icon-secondary outline-none transition-colors duration-150 ease-out hover:bg-background-tertiary-default focus-visible:ring-2 focus-visible:ring-border-focus-ring disabled:cursor-default disabled:text-foreground-icon-disabled disabled:hover:bg-transparent motion-reduce:transition-none",
        tone,
      )}
    >
      <Icon aria-hidden className="size-4" />
    </button>
  );
}

function splitPath(path: string) {
  const cut = path.lastIndexOf("/") + 1;
  return { dir: path.slice(0, cut), base: path.slice(cut) };
}

export function DiffCounts({
  added,
  removed,
  hideZero = false,
  className,
}: {
  added: number;
  removed: number;
  hideZero?: boolean;
  className?: string;
}) {
  return (
    <span className={cx("inline-flex items-center gap-1 font-mono text-caption-1-medium tabular-nums", className)}>
      <span className="sr-only">
        {added} added, {removed} removed
      </span>
      {(!hideZero || added > 0) && (
        <span aria-hidden className="text-notification-success-foreground">
          +{added}
        </span>
      )}
      {(!hideZero || removed > 0) && (
        <span aria-hidden className="text-notification-error-foreground">
          −{removed}
        </span>
      )}
    </span>
  );
}

function DiffRows({ rows, dimmed }: { rows: DiffRow[]; dimmed: boolean }) {
  return (
    <div
      className={cx(
        "max-h-72 overflow-auto rounded-xl border border-border-button-default bg-background-inner-default py-1 font-mono text-caption-1-regular transition-opacity duration-200 ease-out motion-reduce:transition-none",
        dimmed && "opacity-60",
      )}
    >
      <table className="min-w-full border-collapse">
        <tbody>
          {rows.map((row, i) =>
            row.kind === "hunk" ? (
              <tr key={i} className="bg-background-tertiary-default">
                <td colSpan={3} className="whitespace-pre px-3 py-0.5 text-text-tertiary">
                  {row.text}
                </td>
              </tr>
            ) : (
              <tr key={i} data-kind={row.kind} className={ROW_TONE[row.kind]}>
                <td className="w-0 select-none py-px pr-2 pl-3 text-right text-text-tertiary tabular-nums">
                  {row.kind === "del" ? row.oldNo : row.newNo}
                </td>
                <td
                  aria-hidden
                  className={cx(
                    "w-0 select-none pr-2",
                    row.kind === "add" && "text-notification-success-foreground",
                    row.kind === "del" && "text-notification-error-foreground",
                  )}
                >
                  {SIGN[row.kind]}
                </td>
                <td className="whitespace-pre pr-4 text-text-primary">{row.text || " "}</td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

export function ChangesDiffPanel({
  files,
  decisions,
  defaultDecisions,
  onDecisionsChange,
  defaultExpanded = [],
  collapseOnDecide = true,
  title = "Changes",
  className,
}: ChangesDiffPanelProps) {
  const [ownDecisions, setOwnDecisions] = useState<ChangeDecisions>(defaultDecisions ?? {});
  const [expanded, setExpanded] = useState<Set<Key>>(() => new Set(defaultExpanded));
  const value = decisions ?? ownDecisions;

  const parsed = useMemo(() => files.map((file) => ({ file, ...parsePatch(file.patch) })), [files]);

  // #region critical
  const pending = parsed.filter(({ file }) => !value[file.path]);
  const pendingAdded = pending.reduce((sum, p) => sum + p.added, 0);
  const pendingRemoved = pending.reduce((sum, p) => sum + p.removed, 0);
  const acceptedCount = parsed.filter(({ file }) => value[file.path] === "accepted").length;
  const rejectedCount = parsed.filter(({ file }) => value[file.path] === "rejected").length;

  const decide = (paths: string[], decision: ChangeDecision | null) => {
    if (paths.length === 0) return;
    const next = applyDecision(value, paths, decision);
    if (decisions === undefined) setOwnDecisions(next);
    onDecisionsChange?.(next, { paths, decision });
    if (decision && collapseOnDecide) {
      setExpanded((prev) => {
        const keep = new Set(prev);
        for (const path of paths) keep.delete(path);
        return keep;
      });
    }
  };
  // #endregion

  const decidedPaths = parsed.filter(({ file }) => value[file.path]).map(({ file }) => file.path);

  return (
    <section
      aria-label={title}
      className={cx(
        "@container flex min-h-0 flex-col overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default",
        className,
      )}
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border-button-default px-4 py-3">
        <div className="min-w-[12rem] flex-1" aria-live="polite">
          <p className="flex flex-wrap items-baseline gap-x-2 text-body-2-medium text-text-primary">
            {pending.length > 0 ? (
              <>
                <span data-testid="pending-count">
                  {pending.length} uncommitted {pending.length === 1 ? "change" : "changes"}
                </span>
                <DiffCounts added={pendingAdded} removed={pendingRemoved} />
              </>
            ) : (
              <span data-testid="pending-count">All changes reviewed</span>
            )}
          </p>
          <p className="text-caption-1-regular text-text-tertiary">
            {acceptedCount} accepted · {rejectedCount} rejected · {files.length} files
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <IconAction
            label="Undo all decisions"
            icon={RiArrowGoBackLine}
            disabled={decidedPaths.length === 0}
            onPress={() => decide(decidedPaths, null)}
          />
          <Button
            size="xs"
            variant="secondary"
            leadingIcon={RiCloseLine}
            disabled={pending.length === 0}
            onClick={() => decide(pending.map((p) => p.file.path), "rejected")}
          >
            Reject all
          </Button>
          <Button
            size="xs"
            variant="primary"
            leadingIcon={RiCheckLine}
            disabled={pending.length === 0}
            onClick={() => decide(pending.map((p) => p.file.path), "accepted")}
          >
            Accept all
          </Button>
        </div>
      </header>

      <DisclosureGroup
        allowsMultipleExpanded
        expandedKeys={expanded}
        onExpandedChange={setExpanded}
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2"
      >
        {parsed.map(({ file, rows, added, removed }) => {
          const decision = value[file.path];
          const status = STATUS_ICON[file.status ?? "modified"];
          const { dir, base } = splitPath(file.path);
          const Icon = status.icon;
          return (
            <Disclosure
              key={file.path}
              id={file.path}
              data-decision={decision ?? "pending"}
              className="group/file rounded-2xl"
            >
              <div className="flex items-center gap-1 rounded-xl pr-1 transition-colors duration-150 ease-out hover:bg-background-secondary-default motion-reduce:transition-none">
                <Heading className="min-w-0 flex-1">
                  <AriaButton
                    slot="trigger"
                    className="flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                  >
                    <RiArrowRightSLine
                      aria-hidden
                      className="size-4 shrink-0 text-foreground-icon-tertiary transition-transform duration-150 ease-out group-data-[expanded]/file:rotate-90 motion-reduce:transition-none rtl:-scale-x-100"
                    />
                    <Icon aria-hidden className={cx("size-4 shrink-0", status.tone)} />
                    <span
                      className={cx(
                        "min-w-0 truncate text-body-2-regular",
                        decision === "rejected" && "line-through decoration-text-tertiary",
                      )}
                    >
                      <span className="text-text-tertiary @max-[28rem]:sr-only">{dir}</span>
                      <span className="text-text-primary">{base}</span>
                    </span>
                    <DiffCounts added={added} removed={removed} hideZero className="shrink-0" />
                    {status.badge && (
                      <span className="shrink-0 rounded-md bg-background-tertiary-default px-1.5 py-px text-caption-2-medium text-text-secondary @max-[28rem]:hidden">
                        {status.badge}
                      </span>
                    )}
                  </AriaButton>
                </Heading>
                {decision ? (
                  <div key="decided" className="flex shrink-0 items-center gap-1">
                    <span
                      className={cx(
                        "rounded-md px-1.5 py-px text-caption-2-semibold",
                        decision === "accepted"
                          ? "bg-notification-success-background text-notification-success-foreground"
                          : "bg-notification-error-background text-notification-error-foreground",
                      )}
                    >
                      {decision === "accepted" ? "Accepted" : "Rejected"}
                    </span>
                    <IconAction label={`Undo ${file.path}`} icon={RiArrowGoBackLine} onPress={() => decide([file.path], null)} />
                  </div>
                ) : (
                  <div key="pending" className="flex shrink-0 items-center gap-0.5">
                    <IconAction
                      label={`Reject ${file.path}`}
                      icon={RiCloseLine}
                      tone="hover:text-notification-error-foreground"
                      onPress={() => decide([file.path], "rejected")}
                    />
                    <IconAction
                      label={`Accept ${file.path}`}
                      icon={RiCheckLine}
                      tone="hover:text-notification-success-foreground"
                      onPress={() => decide([file.path], "accepted")}
                    />
                  </div>
                )}
              </div>
              <DisclosurePanel className="px-2 pt-1 pb-2">
                <DiffRows rows={rows} dimmed={decision === "rejected"} />
              </DisclosurePanel>
            </Disclosure>
          );
        })}
      </DisclosureGroup>
    </section>
  );
}
