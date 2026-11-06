/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "AI Image Generation" (boardui.com/templates/ai-image-generation).
 * No BoardUI source was used.
 */
"use client";

import { useState } from "react";
import type { RemixiconComponentType } from "@remixicon/react";
import {
  RiAddLine,
  RiArrowDownSLine,
  RiCustomerServiceLine,
  RiEqualizer2Line,
  RiFolderLine,
  RiFolderOpenLine,
  RiRobot2Line,
  RiSearchLine,
  RiSettings4Line,
  RiSideBarLine,
} from "@remixicon/react";
import { cx } from "@/registry/lib/cx";
import { Avatar } from "@/registry/ui/avatar";
import { Button } from "@/registry/ui/button";
import { Dropdown, DropdownDivider, DropdownItem, DropdownPopover, DropdownTrigger } from "@/registry/ui/dropdown";
import { Kbd } from "@/registry/ui/kbd";
import { ThemeToggle } from "@/registry/ui/theme-toggle";
import { Tooltip, TooltipTrigger } from "@/registry/ui/tooltip";
import type { ImageRepo, ImageView } from "@/registry/ui/ai-image-generation-data";

export const SIDEBAR_ACCOUNTS = [
  { id: "mara", name: "Mara Ellison", initials: "M", color: "neutral" as const },
  { id: "studio", name: "Harbor Studio", initials: "H", color: "lime" as const },
];

const focusRing = "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring";

const navRow = cx(
  "flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-body-medium text-text-primary",
  "transition-colors duration-150 ease-out hover:bg-background-secondary-hover motion-reduce:transition-none",
  focusRing,
);

export interface ImageSidebarProps {
  repos: ImageRepo[];
  sessionId: string;
  view: ImageView;
  onSelectSession: (id: string) => void;
  onNewAgent: () => void;
  onView: (view: ImageView) => void;
  onSearch: () => void;
  onSettings: () => void;
  onSupport: () => void;
  onUpgrade: () => void;
  onAccountChange?: (name: string) => void;
  /** Hides the sidebar (inline) or closes the drawer (small screens). */
  onCollapse: () => void;
  className?: string;
}

function NavButton({
  icon: Icon,
  label,
  active,
  onPress,
}: {
  icon: RemixiconComponentType;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-current={active ? "page" : undefined}
      className={cx(navRow, active && "bg-background-tertiary-default")}
    >
      <Icon className="size-4 shrink-0 text-foreground-icon-secondary" aria-hidden />
      {label}
    </button>
  );
}

export function ImageSidebar({
  repos,
  sessionId,
  view,
  onSelectSession,
  onNewAgent,
  onView,
  onSearch,
  onSettings,
  onSupport,
  onUpgrade,
  onAccountChange,
  onCollapse,
  className,
}: ImageSidebarProps) {
  const [account, setAccount] = useState(SIDEBAR_ACCOUNTS[0]!);
  const [accountMenu, setAccountMenu] = useState(false);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());

  const toggleRepo = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <nav
      aria-label="Image workspace"
      className={cx(
        "flex h-full w-[240px] flex-col gap-3 rounded-3xl border border-border-button-white bg-background-secondary-default p-3 shadow-sidebar",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <Dropdown isOpen={accountMenu} onOpenChange={setAccountMenu}>
          <DropdownTrigger
            aria-label={`Account: ${account.name}`}
            className={cx("flex min-w-0 items-center gap-2 rounded-xl p-1 pr-2 hover:bg-background-secondary-hover", focusRing)}
          >
            <Avatar size="xs" color={account.color} initials={account.initials} />
            <span className="truncate text-body-medium text-text-primary">{account.name}</span>
            <RiArrowDownSLine className="size-4 shrink-0 text-foreground-icon-tertiary" aria-hidden />
          </DropdownTrigger>
          <DropdownPopover aria-label="Switch account" placement="bottom start" className="w-[220px]">
            {SIDEBAR_ACCOUNTS.map((option) => (
              <DropdownItem
                key={option.id}
                selected={option.id === account.id}
                onSelect={() => {
                  setAccount(option);
                  setAccountMenu(false);
                  onAccountChange?.(option.name);
                }}
              >
                <Avatar size="xs" color={option.color} initials={option.initials} />
                <span className="text-body-medium text-text-primary">{option.name}</span>
              </DropdownItem>
            ))}
            <DropdownDivider />
            <DropdownItem
              onSelect={() => {
                setAccountMenu(false);
                onSettings();
              }}
            >
              <RiSettings4Line className="size-4 text-foreground-icon-secondary" aria-hidden />
              <span className="text-body-medium text-text-primary">Account settings</span>
            </DropdownItem>
          </DropdownPopover>
        </Dropdown>
        <TooltipTrigger>
          <button
            type="button"
            aria-label="Hide sidebar"
            onClick={onCollapse}
            className={cx("flex size-8 shrink-0 items-center justify-center rounded-xl text-foreground-icon-secondary hover:bg-background-secondary-hover", focusRing)}
          >
            <RiSideBarLine className="size-4" aria-hidden />
          </button>
          <Tooltip>Hide sidebar</Tooltip>
        </TooltipTrigger>
      </div>

      <button
        type="button"
        onClick={onSearch}
        className={cx(
          "flex w-full items-center gap-2 rounded-xl border border-border-button-default bg-background-primary-default px-2.5 py-1.5 text-left shadow-2xs",
          "transition-colors duration-150 ease-out hover:bg-background-primary-hover motion-reduce:transition-none",
          focusRing,
        )}
      >
        <RiSearchLine className="size-4 text-foreground-icon-tertiary" aria-hidden />
        <span className="flex-1 text-body-regular text-text-placeholder">Quick Search</span>
        <Kbd>⌘L</Kbd>
      </button>

      <div className="flex flex-col gap-0.5">
        <NavButton icon={RiAddLine} label="New agent" onPress={onNewAgent} />
        <NavButton icon={RiRobot2Line} label="Automations" active={view === "automations"} onPress={() => onView("automations")} />
        <NavButton icon={RiEqualizer2Line} label="Customize" active={view === "customize"} onPress={() => onView("customize")} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1">
        <p className="px-2 text-caption-1-medium text-text-tertiary">Repositories</p>
        <ul className="-mx-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1 pb-1">
          {repos.map((repo) => {
            const open = !collapsed.has(repo.id);
            const FolderIcon = open ? RiFolderOpenLine : RiFolderLine;
            return (
              <li key={repo.id}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => toggleRepo(repo.id)}
                  className={cx(navRow, "text-body-2-medium")}
                >
                  <FolderIcon className="size-4 shrink-0 text-foreground-icon-secondary" aria-hidden />
                  <span className="truncate">{repo.name}</span>
                </button>
                {open && repo.sessions.length > 0 && (
                  <ul className="ml-[15px] flex flex-col gap-0.5 border-l border-border-table py-0.5 pl-2">
                    {repo.sessions.map((session) => {
                      const current = view === "thread" && session.id === sessionId;
                      return (
                        <li key={session.id}>
                          <button
                            type="button"
                            aria-current={current ? "page" : undefined}
                            onClick={() => onSelectSession(session.id)}
                            className={cx(
                              "flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-body-2-regular",
                              "transition-colors duration-150 ease-out motion-reduce:transition-none",
                              current
                                ? "bg-background-tertiary-default text-text-primary"
                                : "text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary",
                              focusRing,
                            )}
                          >
                            <span className="min-w-0 flex-1 truncate">{session.title}</span>
                            <span className="shrink-0 rounded-md bg-background-tertiary-default px-1.5 text-caption-2-medium text-text-tertiary">
                              {session.age}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <ThemeToggle appearance="sidebar-segmented" />
        <div className="flex flex-col gap-0.5">
          <NavButton icon={RiCustomerServiceLine} label="Support" onPress={onSupport} />
          <NavButton icon={RiSettings4Line} label="Settings" onPress={onSettings} />
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-border-button-default bg-background-primary-default p-2 shadow-2xs">
          <Avatar size="sm" color="blue" initials="B" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-2-medium text-text-primary">Board team</p>
            <p className="truncate text-caption-1-regular text-text-tertiary">Pro Plan</p>
          </div>
          <Button variant="secondary" size="xs" onClick={onUpgrade}>
            Upgrade
          </Button>
        </div>
      </div>
    </nav>
  );
}
