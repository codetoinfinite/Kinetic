/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Workspace Switcher" (boardui.com/components/multi-agent-chat).
 * No BoardUI source was used.
 */
"use client";

import { useRef, useState } from "react";
import type { Key, Selection } from "react-aria-components";
import {
  Button as AriaButton,
  Header as AriaHeader,
  Menu as AriaMenu,
  MenuItem as AriaMenuItem,
  MenuSection as AriaMenuSection,
  MenuTrigger as AriaMenuTrigger,
  Popover as AriaPopover,
  Separator as AriaSeparator,
} from "react-aria-components";
import { RiAddLine, RiCheckLine } from "@remixicon/react";
import { Avatar } from "@/registry/ui/avatar";
import { ChevronUpDownSmall } from "@/registry/lib/chevrons";
import { MENU_POPOVER_SURFACE } from "@/registry/lib/menu-styles";
import { cx } from "@/registry/lib/cx";
import { useDismissOnOutsidePress, useTriggerToggle } from "@/registry/hooks/use-dismiss-on-outside-press";

/** Avatar tint for a workspace mark. Matches the kit Avatar palette. */
export type WorkspaceTone = "neutral" | "blue" | "lime" | "pink";

export interface Workspace {
  /** Stable id, used as the menu key and the selection value. */
  id: string;
  name: string;
  /** Short plan line shown under the name, e.g. "Pro plan". */
  plan: string;
  /** Optional trailing detail after the plan in the menu, e.g. "8 members". */
  detail?: string;
  /** One or two letters for the mark. Defaults to the first letter of `name`. */
  initials?: string;
  tone?: WorkspaceTone;
}

export interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  /** Controlled selected workspace id. */
  value?: string;
  /** Initial selected id when uncontrolled. Defaults to the first workspace. */
  defaultValue?: string;
  onChange?: (id: string) => void;
  /** Renders a "Create workspace" row; called when it is chosen. */
  onCreateWorkspace?: () => void;
  createLabel?: string;
  /** Heading above the workspace list inside the menu. */
  sectionLabel?: string;
  /** Controlled open state of the menu. */
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  /** Accessible name of the trigger. The current workspace name is appended. */
  "aria-label"?: string;
  className?: string;
}

const initialsOf = (workspace: Workspace) =>
  (workspace.initials ?? workspace.name.trim().charAt(0)).toUpperCase();

const ROW = [
  "flex w-full cursor-pointer items-center gap-2.5 rounded-2lg p-2 text-start outline-none",
  "transition-colors duration-150 ease-out motion-reduce:transition-none",
  "data-[hovered]:bg-dropdown-item-hover-background data-[focused]:bg-dropdown-item-hover-background",
].join(" ");

/**
 * Workspace switcher for the top of a sidebar. The trigger shows the current
 * workspace (mark, name, plan); the menu lists every workspace with a check on
 * the current one and an optional "Create workspace" action underneath.
 *
 * Built on React Aria's Menu: the workspace list is a single-selection
 * MenuSection (menuitemradio semantics, arrow keys, typeahead, Escape), the
 * create row is a plain action in its own section so it can never become the
 * selection.
 */
export function WorkspaceSwitcher({
  workspaces,
  value,
  defaultValue,
  onChange,
  onCreateWorkspace,
  createLabel = "Create workspace",
  sectionLabel = "Workspaces",
  isOpen: controlledOpen,
  onOpenChange,
  "aria-label": ariaLabel = "Switch workspace",
  className,
}: WorkspaceSwitcherProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLElement>(null);
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? workspaces[0]?.id ?? "");
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

  const selectedId = value ?? uncontrolledValue;
  const current = workspaces.find((workspace) => workspace.id === selectedId) ?? workspaces[0];
  const isOpen = controlledOpen ?? uncontrolledOpen;

  const setOpen = (next: boolean) => {
    setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  // #region critical
  // The popover is non-modal (no scroll lock on <html>), which also turns off
  // React Aria's outside-press dismissal: restore it, and make a press on the
  // trigger while open close the menu instead of reopening it.
  useDismissOnOutsidePress(isOpen, () => setOpen(false), [triggerRef, popoverRef]);
  const allowOpenChange = useTriggerToggle(isOpen, triggerRef);

  const select = (keys: Selection) => {
    if (keys === "all") return;
    const [next] = Array.from(keys as Set<Key>);
    if (next == null || String(next) === selectedId) return;
    setUncontrolledValue(String(next));
    onChange?.(String(next));
  };
  // #endregion

  if (!current) return null;

  return (
    <AriaMenuTrigger isOpen={isOpen} onOpenChange={(next) => allowOpenChange(next) && setOpen(next)}>
      <AriaButton
        ref={triggerRef}
        aria-label={`${ariaLabel}: ${current.name}`}
        className={cx(
          "group/workspace flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-xl p-1.5 pe-2 text-start outline-none",
          "transition-colors duration-150 ease-out motion-reduce:transition-none",
          "data-[hovered]:bg-background-secondary-hover data-[pressed]:bg-background-secondary-hover",
          "data-[focus-visible]:ring-2 data-[focus-visible]:ring-border-focus-ring",
          isOpen && "bg-background-secondary-hover",
          className,
        )}
      >
        {/* Keyed by id so the mark and labels remount on a switch and replay
            their @starting-style entrance. */}
        <Avatar
          key={`mark-${current.id}`}
          size="md"
          color={current.tone ?? "neutral"}
          initials={initialsOf(current)}
          aria-hidden
          className="transition-[opacity,scale] duration-200 ease-out starting:scale-75 starting:opacity-0 motion-reduce:transition-none"
        />
        <span
          key={`label-${current.id}`}
          className="flex min-w-0 flex-1 flex-col transition-[opacity,translate] duration-200 ease-out starting:translate-y-1 starting:opacity-0 motion-reduce:transition-none"
        >
          <span className="truncate text-body-medium text-text-primary">{current.name}</span>
          <span className="truncate text-caption-1-regular text-text-tertiary">{current.plan}</span>
        </span>
        <ChevronUpDownSmall aria-hidden className="size-4 shrink-0 text-foreground-icon-secondary" />
      </AriaButton>

      <AriaPopover
        ref={popoverRef}
        isNonModal
        placement="bottom start"
        offset={6}
        className={cx(MENU_POPOVER_SURFACE, "w-[280px]")}
      >
        <AriaMenu aria-label={sectionLabel} className="flex flex-col gap-1 outline-none">
          <AriaMenuSection
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={[current.id]}
            onSelectionChange={select}
            className="flex flex-col gap-1"
          >
            <AriaHeader className="px-2 pt-1 pb-0.5 text-body-2-medium text-text-tertiary">{sectionLabel}</AriaHeader>
            {workspaces.map((workspace) => (
              <AriaMenuItem
                key={workspace.id}
                id={workspace.id}
                textValue={workspace.name}
                className={ROW}
              >
                {({ isSelected }) => (
                  <>
                    <Avatar size="md" color={workspace.tone ?? "neutral"} initials={initialsOf(workspace)} aria-hidden />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-body-medium text-text-primary">{workspace.name}</span>
                      <span className="truncate text-caption-1-regular text-text-tertiary">
                        {workspace.detail ? `${workspace.plan} · ${workspace.detail}` : workspace.plan}
                      </span>
                    </span>
                    <RiCheckLine
                      aria-hidden
                      className={cx(
                        "size-4 shrink-0 text-foreground-icon-primary transition-opacity duration-150 motion-reduce:transition-none",
                        isSelected ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </>
                )}
              </AriaMenuItem>
            ))}
          </AriaMenuSection>

          {onCreateWorkspace && (
            <>
              <AriaSeparator className="-mx-2.5 my-1 h-px shrink-0 border-0 bg-border-button-default" />
              <AriaMenuSection className="flex flex-col">
                <AriaMenuItem id="__create-workspace" textValue={createLabel} onAction={onCreateWorkspace} className={ROW}>
                  <span
                    aria-hidden
                    className="flex size-8 shrink-0 items-center justify-center rounded-full border border-dashed border-border-button-hover text-foreground-icon-secondary"
                  >
                    <RiAddLine className="size-4" />
                  </span>
                  <span className="truncate text-body-medium text-text-secondary">{createLabel}</span>
                </AriaMenuItem>
              </AriaMenuSection>
            </>
          )}
        </AriaMenu>
      </AriaPopover>
    </AriaMenuTrigger>
  );
}
