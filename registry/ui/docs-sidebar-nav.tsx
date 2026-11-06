/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Docs Sidebar Nav" (boardui.com/components/typography).
 * No BoardUI source was used.
 */
"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ComponentType, KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { RiArrowDownSLine, RiCloseCircleFill, RiSearchLine } from "@remixicon/react";
import { cx } from "@/registry/lib/cx";
import { Kbd } from "@/registry/ui/kbd";

export type DocsNavIcon = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
export type DocsNavBadge = "new" | "pro";

export interface DocsNavItem {
  /** Unique across the whole nav. Doubles as the selection value. */
  id: string;
  label: string;
  icon?: DocsNavIcon;
  badge?: DocsNavBadge;
  /** Renders an `<a>` instead of a `<button>`. */
  href?: string;
  disabled?: boolean;
  /** Extra words the filter matches on (not shown). */
  keywords?: string[];
}

export interface DocsNavGroup {
  id: string;
  label: string;
  items: DocsNavItem[];
}

export interface DocsSidebarNavProps {
  groups: DocsNavGroup[];
  /** Active page id (controlled). */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (id: string, item: DocsNavItem) => void;
  /** Ids of collapsed groups (controlled). */
  collapsedGroups?: string[];
  defaultCollapsedGroups?: string[];
  onCollapsedGroupsChange?: (ids: string[]) => void;
  /** Filter text (controlled). */
  query?: string;
  defaultQuery?: string;
  onQueryChange?: (query: string) => void;
  showFilter?: boolean;
  filterPlaceholder?: string;
  /** Accessible name of the filter input. */
  filterLabel?: string;
  /** Focus the filter on ⌘K / Ctrl+K anywhere on the page. */
  hotkey?: boolean;
  hotkeyLabel?: string;
  /** Brand row above the filter. */
  header?: ReactNode;
  /** Pinned below the scrolling list. */
  footer?: ReactNode;
  emptyMessage?: (query: string) => ReactNode;
  "aria-label"?: string;
  className?: string;
}

function useControllable<T>(controlled: T | undefined, fallback: T, onChange?: (next: T) => void) {
  const [inner, setInner] = useState(fallback);
  const isControlled = controlled !== undefined;
  const value = isControlled ? controlled : inner;
  const set = useCallback(
    (next: T) => {
      if (!isControlled) setInner(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );
  return [value, set] as const;
}

const badgeStyles: Record<DocsNavBadge, { label: string; className: string }> = {
  new: { label: "New", className: "bg-badge-new-background text-badge-new-text" },
  pro: { label: "Pro", className: "bg-docs-file-chip-background text-docs-file-chip-foreground" },
};

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const start = text.toLowerCase().indexOf(query);
  if (start < 0) return <>{text}</>;
  const end = start + query.length;
  return (
    <>
      {text.slice(0, start)}
      <mark className="rounded-[3px] bg-badge-new-background text-badge-new-text">{text.slice(start, end)}</mark>
      {text.slice(end)}
    </>
  );
}

// #region critical
/** Keeps groups whose label matches whole; otherwise keeps only matching items. Empty groups drop out. */
export function filterDocsNav(groups: DocsNavGroup[], rawQuery: string): DocsNavGroup[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return groups;
  const out: DocsNavGroup[] = [];
  for (const group of groups) {
    if (group.label.toLowerCase().includes(query)) {
      out.push(group);
      continue;
    }
    const items = group.items.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        (item.keywords ?? []).some((word) => word.toLowerCase().includes(query)),
    );
    if (items.length > 0) out.push({ ...group, items });
  }
  return out;
}

interface GroupSectionProps {
  group: DocsNavGroup;
  open: boolean;
  filtering: boolean;
  query: string;
  activeId: string | null;
  onToggle: (id: string) => void;
  onSelect: (item: DocsNavItem) => void;
}

function GroupSection({ group, open, filtering, query, activeId, onToggle, onSelect }: GroupSectionProps) {
  const panelId = useId();
  const headerClass = "flex h-7 w-full items-center justify-between rounded-lg pr-2.5 pl-2.5 text-caption-1-medium tracking-[0.04em] text-text-tertiary uppercase";

  return (
    <li className="flex flex-col">
      {filtering ? (
        <div className={headerClass}>{group.label}</div>
      ) : (
        <button
          type="button"
          data-docs-nav-focus=""
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => onToggle(group.id)}
          className={cx(
            headerClass,
            "cursor-pointer outline-none hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-inset",
          )}
        >
          <span>{group.label}</span>
          <RiArrowDownSLine
            aria-hidden
            className={cx(
              "size-4 transition-transform duration-200 ease-out motion-reduce:transition-none",
              !open && "-rotate-90 rtl:rotate-90",
            )}
          />
        </button>
      )}

      {/* 0fr -> 1fr animates to the content's real height without measuring it. */}
      <div
        id={panelId}
        inert={!open}
        className={cx(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <ul className="flex min-h-0 flex-col gap-0.5 overflow-hidden pt-1">
          {group.items.map((item, index) => {
            const last = index === group.items.length - 1;
            const active = item.id === activeId;
            const Icon = item.icon;
            const badge = item.badge ? badgeStyles[item.badge] : null;
            const rowClass = cx(
              "flex h-8 w-full items-center gap-2 rounded-lg pr-2.5 text-start text-body-medium outline-none",
              "transition-colors duration-150 ease-out motion-reduce:transition-none",
              "focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-inset",
              Icon ? "ps-[33px]" : "ps-8",
              item.disabled
                ? "cursor-not-allowed text-text-disabled"
                : active
                  ? "bg-background-tertiary-default text-text-primary"
                  : "cursor-pointer text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary",
            );
            const content = (
              <>
                {Icon ? (
                  <Icon
                    aria-hidden
                    className={cx("size-4 shrink-0", active ? "text-foreground-icon-primary" : "text-foreground-icon-secondary")}
                  />
                ) : null}
                <span className="min-w-0 flex-1 truncate">
                  <Highlight text={item.label} query={query} />
                </span>
                {badge ? (
                  <span
                    className={cx(
                      "rounded-[4px] px-1.5 py-px text-caption-2-semibold tracking-[0.02em] uppercase",
                      badge.className,
                    )}
                  >
                    {badge.label}
                  </span>
                ) : null}
              </>
            );

            return (
              <li key={item.id} className="relative">
                {item.href && !item.disabled ? (
                  <a
                    href={item.href}
                    data-docs-nav-focus=""
                    aria-current={active ? "page" : undefined}
                    onClick={() => onSelect(item)}
                    className={rowClass}
                  >
                    {content}
                  </a>
                ) : (
                  <button
                    type="button"
                    data-docs-nav-focus=""
                    disabled={item.disabled}
                    aria-current={active ? "page" : undefined}
                    onClick={() => onSelect(item)}
                    className={rowClass}
                  >
                    {content}
                  </button>
                )}
                {/* Tree rail: drawn after the row so it stays visible over the active fill. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute start-[13px] top-0 h-1/2 w-2 rounded-es-[6px] border-b border-s border-border-checkbox-default"
                />
                {last ? null : (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute start-[13px] top-1/2 -bottom-0.5 border-s border-border-checkbox-default"
                  />
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </li>
  );
}
// #endregion

export function DocsSidebarNav({
  groups,
  value: valueProp,
  defaultValue = null,
  onValueChange,
  collapsedGroups: collapsedProp,
  defaultCollapsedGroups = [],
  onCollapsedGroupsChange,
  query: queryProp,
  defaultQuery = "",
  onQueryChange,
  showFilter = true,
  filterPlaceholder = "Quick Search",
  filterLabel = "Filter pages",
  hotkey = false,
  hotkeyLabel = "⌘K",
  header,
  footer,
  emptyMessage = (q) => <>No pages match &ldquo;{q}&rdquo;</>,
  "aria-label": ariaLabel = "Documentation",
  className,
}: DocsSidebarNavProps) {
  const [activeId, setActiveId] = useControllable<string | null>(valueProp, defaultValue);
  const [collapsed, setCollapsed] = useControllable(collapsedProp, defaultCollapsedGroups, onCollapsedGroupsChange);
  const [query, setQuery] = useControllable(queryProp, defaultQuery, onQueryChange);
  const navRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const needle = query.trim().toLowerCase();
  const visible = useMemo(() => filterDocsNav(groups, needle), [groups, needle]);

  const select = (item: DocsNavItem) => {
    if (item.disabled) return;
    setActiveId(item.id);
    onValueChange?.(item.id, item);
  };

  const toggle = (id: string) => {
    setCollapsed(collapsed.includes(id) ? collapsed.filter((g) => g !== id) : [...collapsed, id]);
  };

  // Bring the active page into view inside the list (never scrolls the page itself).
  useEffect(() => {
    const scroller = scrollRef.current;
    const active = scroller?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!scroller || !active) return;
    const box = scroller.getBoundingClientRect();
    const row = active.getBoundingClientRect();
    if (row.top < box.top || row.bottom > box.bottom) {
      scroller.scrollTop += row.top - box.top - box.height / 2 + row.height / 2;
    }
    // Mount only: later selections are clicked, so they are already visible.
  }, []);

  useEffect(() => {
    if (!hotkey || !showFilter) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hotkey, showFilter]);

  const onNavKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    const keys = ["ArrowDown", "ArrowUp", "Home", "End"];
    if (!keys.includes(event.key)) return;
    const target = event.target as HTMLElement;
    if (target === inputRef.current && (event.key === "Home" || event.key === "End")) return;
    const nodes = Array.from(navRef.current?.querySelectorAll<HTMLElement>("[data-docs-nav-focus]") ?? []).filter(
      (node) => !node.closest("[inert]") && !(node as HTMLButtonElement).disabled,
    );
    if (nodes.length === 0) return;
    const index = nodes.indexOf(target);
    let next = 0;
    if (event.key === "End") next = nodes.length - 1;
    else if (event.key === "ArrowDown") next = index < 0 ? 0 : Math.min(index + 1, nodes.length - 1);
    else if (event.key === "ArrowUp") next = index < 0 ? 0 : Math.max(index - 1, 0);
    event.preventDefault();
    nodes[next]?.focus();
  };

  return (
    <nav
      ref={navRef}
      aria-label={ariaLabel}
      onKeyDown={onNavKeyDown}
      className={cx(
        "flex min-h-0 w-[260px] flex-col gap-3 rounded-3xl border border-border-button-white bg-background-secondary-default pt-4 shadow-sidebar",
        footer ? "pb-3" : "pb-0",
        className,
      )}
    >
      {header ? <div className="px-4">{header}</div> : null}

      {showFilter ? (
        <div className="px-3">
          <div className="flex h-9 items-center gap-2 rounded-full bg-background-tertiary-default ps-2 pe-1.5 focus-within:ring-2 focus-within:ring-border-focus-ring">
            <RiSearchLine aria-hidden className="size-5 shrink-0 text-foreground-icon-secondary" />
            <input
              ref={inputRef}
              type="search"
              data-docs-nav-focus=""
              value={query}
              aria-label={filterLabel}
              placeholder={filterPlaceholder}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape" && query) {
                  event.preventDefault();
                  setQuery("");
                }
              }}
              className="h-full min-w-0 flex-1 bg-transparent text-body-medium text-text-primary outline-none placeholder:text-text-secondary [&::-webkit-search-cancel-button]:appearance-none"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear filter"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="grid size-6 cursor-pointer place-items-center rounded-full text-foreground-icon-tertiary outline-none hover:text-foreground-icon-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring"
              >
                <RiCloseCircleFill aria-hidden className="size-4" />
              </button>
            ) : hotkey ? (
              <Kbd aria-hidden>{hotkeyLabel}</Kbd>
            ) : null}
          </div>
        </div>
      ) : null}

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-8 [scrollbar-width:none] mask-b-from-[calc(100%-32px)]"
      >
        {visible.length === 0 ? (
          <p role="status" className="px-2.5 py-6 text-center text-body-2-regular text-text-tertiary">
            {emptyMessage(query.trim())}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {visible.map((group) => (
              <GroupSection
                key={group.id}
                group={group}
                open={needle ? true : !collapsed.includes(group.id)}
                filtering={needle.length > 0}
                query={needle}
                activeId={activeId}
                onToggle={toggle}
                onSelect={select}
              />
            ))}
          </ul>
        )}
      </div>

      {footer ? <div className="px-3">{footer}</div> : null}
    </nav>
  );
}
