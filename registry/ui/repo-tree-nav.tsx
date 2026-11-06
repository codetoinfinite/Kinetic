/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Repo Tree Nav" (boardui.com/components/multi-agent-chat).
 * No BoardUI source was used.
 */
"use client";

import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import type { Key, Selection } from "react-aria-components";
import {
  RiBracesLine,
  RiCss3Line,
  RiFileCodeLine,
  RiFileLine,
  RiFileTextLine,
  RiImageLine,
  RiMarkdownLine,
  RiReactjsLine,
} from "@remixicon/react";
import { TreeView, TreeViewItem } from "@/registry/ui/tree-view";
import { cx } from "@/registry/lib/cx";

export type RepoFileStatus = "added" | "modified" | "deleted" | "renamed";

export interface RepoTreeNode {
  /** Stable, unique id (a path works well). */
  id: string;
  name: string;
  /** Present on folders, even when empty. Files leave it undefined. */
  children?: RepoTreeNode[];
  /** Lines added in this file. */
  additions?: number;
  /** Lines removed from this file. */
  deletions?: number;
  status?: RepoFileStatus;
}

export interface RepoChangeSummary {
  /** Files with a status or a non-zero change count. */
  files: number;
  additions: number;
  deletions: number;
}

export interface RepoTreeNavProps {
  nodes: RepoTreeNode[];
  /** Controlled selected file id. */
  selectedId?: string | null;
  /** Initial selected file id when uncontrolled. */
  defaultSelectedId?: string | null;
  onSelect?: (id: string, node: RepoTreeNode) => void;
  /** Controlled expanded folder ids. */
  expandedIds?: Iterable<string>;
  /** Initially expanded folder ids when uncontrolled. */
  defaultExpandedIds?: Iterable<string>;
  onExpandedChange?: (ids: Set<string>) => void;
  /** Row density, passed to the kit TreeView: sm rows are 32px, md 36px. */
  size?: "sm" | "md";
  showGuides?: boolean;
  "aria-label"?: string;
  className?: string;
}

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

const EXTENSION_ICONS: Record<string, IconComponent> = {
  tsx: RiReactjsLine,
  jsx: RiReactjsLine,
  ts: RiFileCodeLine,
  js: RiFileCodeLine,
  mjs: RiFileCodeLine,
  cjs: RiFileCodeLine,
  css: RiCss3Line,
  scss: RiCss3Line,
  md: RiMarkdownLine,
  mdx: RiMarkdownLine,
  json: RiBracesLine,
  png: RiImageLine,
  jpg: RiImageLine,
  svg: RiImageLine,
  webp: RiImageLine,
  txt: RiFileTextLine,
  yml: RiFileTextLine,
  yaml: RiFileTextLine,
  lock: RiFileTextLine,
};

/** Icon for a file name by extension, falling back to a plain page. */
export function fileIconFor(name: string): IconComponent {
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
  return EXTENSION_ICONS[ext] ?? RiFileLine;
}

const STATUS: Record<RepoFileStatus, { letter: string; label: string; className: string }> = {
  added: { letter: "A", label: "added", className: "bg-status-lime-background text-status-lime-text" },
  modified: { letter: "M", label: "modified", className: "bg-status-orange-background text-status-orange-text" },
  deleted: { letter: "D", label: "deleted", className: "bg-status-rose-background text-status-rose-text" },
  renamed: { letter: "R", label: "renamed", className: "bg-status-blue-background text-status-blue-text" },
};

const isFolder = (node: RepoTreeNode) => node.children !== undefined;

/** Totals for every changed file under `nodes`, recursively. */
export function summarizeChanges(nodes: RepoTreeNode[]): RepoChangeSummary {
  const total: RepoChangeSummary = { files: 0, additions: 0, deletions: 0 };
  const walk = (list: RepoTreeNode[]) => {
    for (const node of list) {
      if (node.children) {
        walk(node.children);
        continue;
      }
      const additions = node.additions ?? 0;
      const deletions = node.deletions ?? 0;
      if (node.status || additions || deletions) total.files += 1;
      total.additions += additions;
      total.deletions += deletions;
    }
  };
  walk(nodes);
  return total;
}

function ChangeCounts({ additions, deletions, files }: { additions: number; deletions: number; files?: number }) {
  if (!additions && !deletions) return null;
  const spoken = [
    files != null && `${files} changed ${files === 1 ? "file" : "files"}`,
    `${additions} ${additions === 1 ? "addition" : "additions"}`,
    `${deletions} ${deletions === 1 ? "deletion" : "deletions"}`,
  ].filter(Boolean).join(", ");
  return (
    <span className="flex items-center gap-1 text-caption-1-medium tabular-nums">
      {additions > 0 && <span aria-hidden className="text-status-lime-text">+{additions}</span>}
      {deletions > 0 && <span aria-hidden className="text-status-rose-text">&minus;{deletions}</span>}
      <span className="sr-only">{spoken}</span>
    </span>
  );
}

/**
 * A repository file tree for agent and review sidebars. Folders expand and
 * collapse with the pointer, Enter, or the arrow keys; files are the only
 * selectable rows and carry +/− line counts and an A/M/D/R status letter.
 * A collapsed folder rolls up the counts of everything inside it.
 *
 * Built on the kit TreeView (React Aria Tree): treegrid semantics, typeahead,
 * Home/End and animated expansion come from there.
 */
export function RepoTreeNav({
  nodes,
  selectedId,
  defaultSelectedId = null,
  onSelect,
  expandedIds,
  defaultExpandedIds,
  onExpandedChange,
  size = "sm",
  showGuides = true,
  "aria-label": ariaLabel = "Files",
  className,
}: RepoTreeNavProps) {
  const [uncontrolledSelected, setUncontrolledSelected] = useState<string | null>(defaultSelectedId);
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(() => new Set(defaultExpandedIds ?? []));
  const selected = selectedId !== undefined ? selectedId : uncontrolledSelected;
  const expanded = useMemo(
    () => (expandedIds !== undefined ? new Set(expandedIds) : uncontrolledExpanded),
    [expandedIds, uncontrolledExpanded],
  );

  // #region critical
  // One pass over the tree: folder ids (never selectable, so a press on a
  // folder row runs its toggle action instead of selecting it), a lookup for
  // onSelect, and rolled-up counts shown on folders while they are collapsed.
  const { folderIds, byId, totals } = useMemo(() => {
    const folderIds: string[] = [];
    const byId = new Map<string, RepoTreeNode>();
    const totals = new Map<string, RepoChangeSummary>();
    const visit = (node: RepoTreeNode) => {
      byId.set(node.id, node);
      if (!node.children) return;
      folderIds.push(node.id);
      node.children.forEach(visit);
      totals.set(node.id, summarizeChanges(node.children));
    };
    nodes.forEach(visit);
    return { folderIds, byId, totals };
  }, [nodes]);

  const setExpanded = (next: Set<string>) => {
    setUncontrolledExpanded(next);
    onExpandedChange?.(next);
  };

  const toggleFolder = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  const select = (keys: Selection) => {
    if (keys === "all") return;
    const [key] = Array.from(keys as Set<Key>);
    const node = key == null ? undefined : byId.get(String(key));
    if (!node || isFolder(node) || node.id === selected) return;
    setUncontrolledSelected(node.id);
    onSelect?.(node.id, node);
  };
  // #endregion

  const renderNode = (node: RepoTreeNode) => {
    if (node.children) {
      const total = totals.get(node.id);
      const open = expanded.has(node.id);
      return (
        <TreeViewItem
          key={node.id}
          id={node.id}
          label={node.name}
          hasChildItems={node.children.length > 0}
          onAction={() => toggleFolder(node.id)}
          trailingContent={
            !open && total ? <ChangeCounts additions={total.additions} deletions={total.deletions} files={total.files} /> : undefined
          }
        >
          {node.children.map(renderNode)}
        </TreeViewItem>
      );
    }

    const status = node.status ? STATUS[node.status] : undefined;
    return (
      <TreeViewItem
        key={node.id}
        id={node.id}
        label={node.name}
        icon={fileIconFor(node.name)}
        className={({ isSelected }) =>
          cx(isSelected && "font-medium", node.status === "deleted" && !isSelected && "text-text-tertiary")
        }
        trailingContent={
          node.additions || node.deletions || status ? (
            <span className="flex items-center gap-1.5">
              <ChangeCounts additions={node.additions ?? 0} deletions={node.deletions ?? 0} />
              {status && (
                <span
                  className={cx(
                    "inline-flex size-4 items-center justify-center rounded-sm text-caption-2-semibold",
                    status.className,
                  )}
                >
                  <span aria-hidden>{status.letter}</span>
                  <span className="sr-only">{status.label}</span>
                </span>
              )}
            </span>
          ) : undefined
        }
      />
    );
  };

  return (
    <TreeView
      aria-label={ariaLabel}
      size={size}
      showGuides={showGuides}
      selectionMode="single"
      disallowEmptySelection={selected != null}
      selectedKeys={selected != null ? [selected] : []}
      onSelectionChange={select}
      disabledKeys={folderIds}
      disabledBehavior="selection"
      expandedKeys={expanded}
      onExpandedChange={(keys) => setExpanded(new Set(Array.from(keys, String)))}
      className={className}
    >
      {nodes.map(renderNode)}
    </TreeView>
  );
}
