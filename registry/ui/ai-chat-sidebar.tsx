/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "AI Chat" (boardui.com/templates/ai-chat).
 * No BoardUI source was used.
 */
import { useState } from "react";
import {
  RiAddLine,
  RiChat3Line,
  RiCheckLine,
  RiCustomerService2Line,
  RiExpandUpDownLine,
  RiFolderLine,
  RiFolderOpenLine,
  RiMagicLine,
  RiPushpinLine,
  RiRobot2Line,
  RiSearchLine,
  RiSettings3Line,
  RiSidebarFoldLine,
  RiSidebarUnfoldLine,
} from "@remixicon/react";

import { cx } from "@/registry/lib/cx";
import { Button } from "@/registry/ui/button";
import { CommandPaletteItem, CommandPaletteSection } from "@/registry/ui/command-palette";
import { Dropdown, DropdownDivider, DropdownGroup, DropdownItem, DropdownPopover, DropdownTrigger } from "@/registry/ui/dropdown";
import { QuickSearchButton } from "@/registry/ui/quick-search-button";
import { ThemeToggle } from "@/registry/ui/theme-toggle";
import { IconAction, type AiChatFolder, type AiChatThread, type AiChatView } from "@/registry/ui/ai-chat-data";

const ACCOUNTS = [
  { id: "mira", name: "Mira Lindqvist", email: "mira@vibl.dev" },
  { id: "theo", name: "Theo Park", email: "theo@vibl.dev" },
];

export interface AiChatSidebarProps {
  folders: AiChatFolder[];
  threads: AiChatThread[];
  activeThreadId: string | null;
  view: AiChatView;
  /** Thread whose agent is working; its row shows a live dot instead of the age. */
  runningThreadId: string | null;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onSelectThread: (id: string) => void;
  onNewAgent: (folderId?: string) => void;
  onView: (view: AiChatView) => void;
  onOpenSettings: () => void;
  onOpenSupport: () => void;
  onUpgrade: () => void;
  planName: string;
}

const NAV_ROW = cx(
  "flex h-8 w-full cursor-pointer items-center gap-2 rounded-lg px-2 text-start text-body-2-medium text-text-secondary outline-none",
  "transition-colors duration-150 ease-out motion-reduce:transition-none",
  "hover:bg-background-tertiary-default hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring",
);

export function AiChatSidebar({
  folders,
  threads,
  activeThreadId,
  view,
  runningThreadId,
  collapsed,
  onCollapsedChange,
  onSelectThread,
  onNewAgent,
  onView,
  onOpenSettings,
  onOpenSupport,
  onUpgrade,
  planName,
}: AiChatSidebarProps) {
  const [account, setAccount] = useState(ACCOUNTS[0]!);
  const [accountOpen, setAccountOpen] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({ vibl: true });
  // Opening a chat from search unfolds its repository (derived during render, not in an effect).
  const [seenActive, setSeenActive] = useState(activeThreadId);
  if (seenActive !== activeThreadId) {
    setSeenActive(activeThreadId);
    const folderId = threads.find((th) => th.id === activeThreadId)?.folderId;
    if (folderId && !open[folderId]) setOpen((o) => ({ ...o, [folderId]: true }));
  }

  const search = (
    <QuickSearchButton
      label="Quick Search"
      shortcutKey="l"
      placeholder="Search chats and actions"
      paletteLabel="Search chats"
      onAction={(key) => {
        const id = String(key);
        if (id === "action:new") onNewAgent();
        else if (id === "action:settings") onOpenSettings();
        else if (id === "action:automations") onView("automations");
        else onSelectThread(id);
      }}
      className="max-w-none bg-background-primary-default"
    >
      <CommandPaletteSection title="Actions">
        <CommandPaletteItem id="action:new" icon={RiAddLine}>New agent</CommandPaletteItem>
        <CommandPaletteItem id="action:automations" icon={RiRobot2Line}>Automations</CommandPaletteItem>
        <CommandPaletteItem id="action:settings" icon={RiSettings3Line}>Settings</CommandPaletteItem>
      </CommandPaletteSection>
      <CommandPaletteSection title="Chats">
        {threads.map((th) => (
          <CommandPaletteItem
            key={th.id}
            id={th.id}
            icon={RiChat3Line}
            textValue={`${th.title} ${folders.find((f) => f.id === th.folderId)?.name ?? ""}`}
            description={folders.find((f) => f.id === th.folderId)?.name}
          >
            {th.title}
          </CommandPaletteItem>
        ))}
      </CommandPaletteSection>
    </QuickSearchButton>
  );

  if (collapsed) {
    return (
      <nav
        aria-label="Agent sidebar"
        className="flex w-14 shrink-0 flex-col items-center gap-1 rounded-2xl border border-separator-border bg-background-secondary-default py-3 shadow-sidebar"
      >
        <IconAction label="Expand sidebar" icon={RiSidebarUnfoldLine} onPress={() => onCollapsedChange(false)} />
        <IconAction label="New agent" icon={RiAddLine} onPress={() => onNewAgent()} />
        <IconAction label="Automations" icon={RiRobot2Line} active={view === "automations"} onPress={() => onView("automations")} />
        <IconAction label="Customize" icon={RiMagicLine} active={view === "customize"} onPress={() => onView("customize")} />
        <IconAction label="Search chats" icon={RiSearchLine} onPress={() => onCollapsedChange(false)} tip="Expand to search" />
        <div className="mt-auto flex flex-col items-center gap-1">
          <ThemeToggle collapsed />
          <IconAction label="Settings" icon={RiSettings3Line} onPress={onOpenSettings} />
        </div>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Agent sidebar"
      className="flex w-[248px] shrink-0 flex-col rounded-2xl border border-separator-border bg-background-secondary-default shadow-sidebar"
    >
      <div className="flex items-center gap-1 px-2.5 pt-2.5">
        <Dropdown isOpen={accountOpen} onOpenChange={setAccountOpen}>
          <DropdownTrigger
            aria-label={`Account: ${account.name}`}
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg p-1 text-start outline-none hover:bg-background-tertiary-default data-[focus-visible]:ring-2 data-[focus-visible]:ring-border-focus-ring"
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-background-tertiary-default text-caption-1-semibold text-text-secondary">
              {account.name[0]}
            </span>
            <span className="truncate text-body-2-semibold text-text-primary">{account.name}</span>
            <RiExpandUpDownLine aria-hidden className="size-3.5 shrink-0 text-foreground-icon-tertiary" />
          </DropdownTrigger>
          <DropdownPopover aria-label="Switch account" className="w-[240px]">
            <DropdownGroup label="Accounts">
              {ACCOUNTS.map((a) => (
                <DropdownItem
                  key={a.id}
                  selected={a.id === account.id}
                  onSelect={() => {
                    setAccount(a);
                    setAccountOpen(false);
                  }}
                >
                  <span className="grid size-5 place-items-center rounded-full bg-background-tertiary-default text-caption-2-semibold">{a.name[0]}</span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body-2-medium text-text-primary">{a.name}</span>
                    <span className="truncate text-caption-1-regular text-text-tertiary">{a.email}</span>
                  </span>
                  {a.id === account.id && <RiCheckLine aria-hidden className="size-4 text-foreground-icon-primary" />}
                </DropdownItem>
              ))}
            </DropdownGroup>
            <DropdownDivider />
            <DropdownItem
              onSelect={() => {
                setAccountOpen(false);
                onOpenSettings();
              }}
            >
              <RiSettings3Line aria-hidden className="size-4 text-foreground-icon-secondary" />
              <span className="text-body-2-medium text-text-primary">Account settings</span>
            </DropdownItem>
          </DropdownPopover>
        </Dropdown>
        <IconAction label="Collapse sidebar" icon={RiSidebarFoldLine} onPress={() => onCollapsedChange(true)} />
      </div>

      <div className="px-2.5 pt-2.5">{search}</div>

      <div className="flex flex-col gap-0.5 px-2.5 pt-3">
        <button type="button" className={NAV_ROW} onClick={() => onNewAgent()}>
          <RiAddLine aria-hidden className="size-4 text-foreground-icon-secondary" />
          New agent
        </button>
        <button
          type="button"
          aria-current={view === "automations" ? "page" : undefined}
          className={cx(NAV_ROW, view === "automations" && "bg-background-tertiary-default text-text-primary")}
          onClick={() => onView("automations")}
        >
          <RiRobot2Line aria-hidden className="size-4 text-foreground-icon-secondary" />
          Automations
        </button>
        <button
          type="button"
          aria-current={view === "customize" ? "page" : undefined}
          className={cx(NAV_ROW, view === "customize" && "bg-background-tertiary-default text-text-primary")}
          onClick={() => onView("customize")}
        >
          <RiMagicLine aria-hidden className="size-4 text-foreground-icon-secondary" />
          Customize
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-2 pt-4">
        <p className="px-2 pb-1.5 text-caption-1-medium text-text-tertiary">Repositories</p>
        <ul className="flex flex-col gap-0.5">
          {folders.map((folder) => {
            const isOpen = open[folder.id] ?? false;
            const chats = threads.filter((th) => th.folderId === folder.id);
            const FolderIcon = isOpen ? RiFolderOpenLine : RiFolderLine;
            return (
              <li key={folder.id}>
                <div className="group/folder flex items-center">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    className={cx(NAV_ROW, "min-w-0 flex-1")}
                    onClick={() => setOpen((o) => ({ ...o, [folder.id]: !isOpen }))}
                  >
                    <FolderIcon aria-hidden className="size-4 shrink-0 text-foreground-icon-secondary" />
                    <span className="truncate">{folder.name}</span>
                  </button>
                  <IconAction
                    label={`New chat in ${folder.name}`}
                    icon={RiAddLine}
                    onPress={() => onNewAgent(folder.id)}
                    className="size-6 opacity-0 group-hover/folder:opacity-100 data-[focus-visible]:opacity-100"
                  />
                </div>
                {isOpen && (
                  <ul className="ms-4 flex flex-col gap-0.5 border-s border-separator-border ps-2">
                    {chats.length === 0 && <li className="px-2 py-1 text-caption-1-regular text-text-tertiary">No chats yet</li>}
                    {chats.map((th) => {
                      const active = view === "chat" && th.id === activeThreadId;
                      const running = th.id === runningThreadId;
                      return (
                        <li key={th.id}>
                          <button
                            type="button"
                            aria-current={active ? "page" : undefined}
                            onClick={() => onSelectThread(th.id)}
                            className={cx(
                              NAV_ROW,
                              "h-7 text-caption-1-medium",
                              active && "bg-background-tertiary-default text-text-primary",
                            )}
                          >
                            {th.pinned && <RiPushpinLine aria-label="Pinned" className="size-3 shrink-0 text-foreground-icon-tertiary" />}
                            <span className="min-w-0 flex-1 truncate">{th.title}</span>
                            {running ? (
                              <span className="flex items-center gap-1 text-caption-2-medium text-status-blue-text">
                                <span className="size-1.5 animate-pulse rounded-full bg-blue-500 motion-reduce:animate-none" aria-hidden />
                                working
                              </span>
                            ) : (
                              <span className="rounded-md bg-background-tertiary-default px-1.5 py-px text-caption-2-medium text-text-tertiary">
                                {th.age}
                              </span>
                            )}
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

      <div className="flex flex-col gap-0.5 px-2.5 pb-2.5">
        <ThemeToggle appearance="sidebar-segmented" className="mb-2 self-start" />
        <button type="button" className={NAV_ROW} onClick={onOpenSupport}>
          <RiCustomerService2Line aria-hidden className="size-4 text-foreground-icon-secondary" />
          Support
        </button>
        <button type="button" className={NAV_ROW} onClick={onOpenSettings}>
          <RiSettings3Line aria-hidden className="size-4 text-foreground-icon-secondary" />
          Settings
        </button>
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-separator-border bg-background-primary-default p-2 shadow-xs">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-blue-500 text-caption-1-semibold text-text-white">B</span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-caption-1-semibold text-text-primary">Board team</span>
            <span className="truncate text-caption-2-regular text-text-tertiary">{planName}</span>
          </span>
          <Button size="xs" variant="secondary" onClick={onUpgrade}>
            {planName === "Pro Plan" ? "Upgrade" : "Manage"}
          </Button>
        </div>
      </div>
    </nav>
  );
}
