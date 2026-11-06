/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Props Table" (boardui.com/components/line-chart-card).
 * No BoardUI source was used.
 */
"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import { cx } from "@/registry/lib/cx";

export interface PropsTableRow {
  /** Prop name, rendered as an inline code chip. */
  name: string;
  /** TypeScript type. A string is split on its top-level `|` so long unions can collapse. */
  type: string | ReactNode;
  /** Default value, shown as code. Omit for "no default". */
  default?: string | ReactNode;
  description?: ReactNode;
  required?: boolean;
  deprecated?: boolean;
}

export interface PropsTableLabels {
  name?: string;
  type?: string;
  default?: string;
  description?: string;
  required?: string;
  deprecated?: string;
  none?: string;
}

export interface PropsTableProps {
  rows: PropsTableRow[];
  /** Accessible table caption (visually hidden). */
  caption?: string;
  /** Unions with more members than this collapse behind a "+N more" toggle. 0 disables collapsing. */
  maxUnionMembers?: number;
  labels?: PropsTableLabels;
  /** Prefix for row ids, so `#<idPrefix>-<name>` deep-links to a prop. */
  idPrefix?: string;
  className?: string;
}

const DEFAULT_LABELS: Required<PropsTableLabels> = {
  name: "Prop",
  type: "Type",
  default: "Default",
  description: "Description",
  required: "required",
  deprecated: "deprecated",
  none: "None",
};

// #region critical
/**
 * Splits a type string on `|` at nesting depth 0, so
 * `"a" | Array<"b" | "c"> | (() => void)` yields three members.
 */
export function splitUnion(type: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < type.length; i++) {
    const ch = type[i];
    if (quote) {
      if (ch === quote && type[i - 1] !== "\\") quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "(" || ch === "[" || ch === "{" || ch === "<") depth++;
    else if (ch === ")" || ch === "]" || ch === "}" || (ch === ">" && type[i - 1] !== "=")) depth = Math.max(0, depth - 1);
    else if (ch === "|" && depth === 0) {
      parts.push(type.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(type.slice(start).trim());
  return parts.filter(Boolean);
}

function TypeCell({
  type,
  max,
  expanded,
  onToggle,
  controlsId,
}: {
  type: PropsTableRow["type"];
  max: number;
  expanded: boolean;
  onToggle: () => void;
  controlsId: string;
}) {
  if (typeof type !== "string") return <>{type}</>;
  const members = splitUnion(type);
  const collapsible = max > 0 && members.length > max;
  const shown = collapsible && !expanded ? members.slice(0, max) : members;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1 gap-y-0.5">
      <code id={controlsId} className="font-mono text-caption-1-regular break-words text-docs-command-accent">
        {shown.map((member, i) => (
          <span key={`${member}-${i}`}>
            {i > 0 ? <span className="text-text-tertiary"> | </span> : null}
            {member}
          </span>
        ))}
      </code>
      {collapsible ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={controlsId}
          onClick={onToggle}
          className={cx(
            "cursor-pointer rounded-md px-1 text-caption-1-medium text-text-tertiary outline-none",
            "transition-colors duration-150 ease-out hover:bg-background-secondary-hover hover:text-text-primary motion-reduce:transition-none",
            "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
          )}
        >
          {expanded ? "Show less" : `+${members.length - max} more`}
        </button>
      ) : null}
    </span>
  );
}

const CELL_LABEL = "w-20 shrink-0 text-caption-1-medium text-text-tertiary @2xl:hidden";

export function PropsTable({
  rows,
  caption,
  maxUnionMembers = 4,
  labels: labelsProp,
  idPrefix,
  className,
}: PropsTableProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const baseId = useId();
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const toggle = (name: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  // Explicit ARIA roles keep table semantics while the narrow layout sets
  // every element to block/flex (display overrides strip implicit roles in
  // some engines). The layout switch is a container query, so it follows the
  // width of the slot the table sits in, not the viewport.
  return (
    <div className={cx("@container w-full", className)}>
      <div className="@2xl:overflow-hidden @2xl:rounded-2xl @2xl:border @2xl:border-border-component-detail-container @2xl:bg-background-primary-default">
        <table role="table" className="block w-full border-collapse text-start @2xl:table">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead role="rowgroup" className="sr-only @2xl:not-sr-only @2xl:table-header-group">
            <tr role="row" className="@2xl:bg-background-secondary-default">
              {[
                [labels.name, "w-[22%]"],
                [labels.type, "w-[30%]"],
                [labels.default, "w-[14%]"],
                [labels.description, ""],
              ].map(([label, width]) => (
                <th
                  key={label}
                  role="columnheader"
                  scope="col"
                  className={cx("px-4 py-2.5 text-start align-middle text-caption-1-medium text-text-tertiary", width)}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody role="rowgroup" className="flex flex-col gap-2 @2xl:table-row-group">
            {rows.map((row) => {
              const typeId = `${baseId}-${row.name}-type`;
              return (
                <tr
                  key={row.name}
                  role="row"
                  id={idPrefix ? `${idPrefix}-${row.name}` : undefined}
                  className={cx(
                    "flex scroll-mt-20 flex-col gap-2 rounded-2xl border border-border-component-detail-container bg-background-primary-default p-4",
                    "@2xl:table-row @2xl:rounded-none @2xl:border-0 @2xl:border-t @2xl:border-border-table @2xl:bg-transparent @2xl:p-0",
                    "@2xl:target:bg-background-secondary-default",
                  )}
                >
                  <th role="rowheader" scope="row" className="block text-start font-normal @2xl:table-cell @2xl:px-4 @2xl:py-3 @2xl:align-top">
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      <code
                        className={cx(
                          "rounded-md bg-background-secondary-default px-1.5 py-0.5 font-mono text-caption-1-medium text-text-primary",
                          row.deprecated && "text-text-tertiary line-through",
                        )}
                      >
                        {row.name}
                      </code>
                      {row.required ? (
                        <span className="rounded-sm bg-status-rose-background px-1 text-caption-2-medium text-status-rose-text">
                          {labels.required}
                        </span>
                      ) : null}
                      {row.deprecated ? (
                        <span className="rounded-sm bg-status-yellow-background px-1 text-caption-2-medium text-status-yellow-text">
                          {labels.deprecated}
                        </span>
                      ) : null}
                    </span>
                  </th>
                  <td role="cell" className="flex gap-3 @2xl:table-cell @2xl:px-4 @2xl:py-3 @2xl:align-top">
                    <span aria-hidden className={CELL_LABEL}>
                      {labels.type}
                    </span>
                    <TypeCell
                      type={row.type}
                      max={maxUnionMembers}
                      expanded={expanded.has(row.name)}
                      onToggle={() => toggle(row.name)}
                      controlsId={typeId}
                    />
                  </td>
                  <td role="cell" className="flex gap-3 @2xl:table-cell @2xl:px-4 @2xl:py-3 @2xl:align-top">
                    <span aria-hidden className={CELL_LABEL}>
                      {labels.default}
                    </span>
                    {row.default === undefined ? (
                      <span className="text-caption-1-regular text-text-tertiary">
                        <span aria-hidden>—</span>
                        <span className="sr-only">{labels.none}</span>
                      </span>
                    ) : typeof row.default === "string" ? (
                      <code className="font-mono text-caption-1-regular break-words text-text-secondary">{row.default}</code>
                    ) : (
                      row.default
                    )}
                  </td>
                  <td
                    role="cell"
                    className={cx(
                      "block text-body-regular text-text-secondary @2xl:table-cell @2xl:border-0 @2xl:px-4 @2xl:py-3 @2xl:align-top",
                      row.description ? "border-t border-border-table pt-3" : "hidden",
                    )}
                  >
                    {row.description}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
// #endregion
