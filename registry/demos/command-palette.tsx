'use client';

import { useState } from 'react';
import {
  RiArchiveLine,
  RiChat3Line,
  RiFileAddLine,
  RiHome5Line,
  RiInbox2Line,
  RiSearchLine,
  RiSettings3Line,
  RiUserAddLine,
} from '@remixicon/react';

import { CommandPalette, CommandPaletteItem, CommandPaletteSection } from '@/registry/ui/command-palette';
import { Kbd } from '@/registry/ui/kbd';

const LABELS: Record<string, string> = {
  'new-project': 'Create project',
  invite: 'Invite teammates',
  'new-chat': 'New chat',
  dashboard: 'Dashboard',
  inbox: 'Inbox',
  settings: 'Settings',
  archive: 'Archive finished tasks',
};

/* A search-bar trigger in a page header: pressing it (or ⌘K / Ctrl+K anywhere)
   opens the palette, typing filters the rows, and Enter or a click runs the
   highlighted command, closes the palette and reports it below. */
export default function Demo() {
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState<string | null>(null);

  return (
    <div className="flex w-full max-w-[420px] flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="flex w-full cursor-pointer items-center gap-2 rounded-xl border border-border-button-default bg-background-primary-default px-3 py-2.5 text-start shadow-xs outline-none transition-colors hover:bg-background-secondary-default focus-visible:ring-2 focus-visible:ring-border-focus-ring"
      >
        <RiSearchLine className="size-5 shrink-0 text-foreground-icon-secondary" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-body-medium text-text-tertiary">Search or run a command</span>
        <Kbd>⌘K</Kbd>
      </button>

      <p className="px-1 text-body-2-regular text-text-secondary" aria-live="polite">
        {last ? (
          <>
            Ran <span className="text-text-primary">{last}</span>
          </>
        ) : (
          'Nothing run yet. Try typing "set" or "new".'
        )}
      </p>

      <CommandPalette
        isOpen={open}
        onOpenChange={setOpen}
        onAction={(key) => setLast(LABELS[String(key)] ?? String(key))}
      >
        <CommandPaletteSection title="Suggestions">
          <CommandPaletteItem id="new-project" icon={RiFileAddLine} shortcut="⌘N">
            Create project
          </CommandPaletteItem>
          <CommandPaletteItem id="invite" icon={RiUserAddLine}>
            Invite teammates
          </CommandPaletteItem>
          <CommandPaletteItem id="new-chat" icon={RiChat3Line} shortcut="⌘J">
            New chat
          </CommandPaletteItem>
        </CommandPaletteSection>
        <CommandPaletteSection title="Navigation">
          <CommandPaletteItem id="dashboard" icon={RiHome5Line} description="Workspace">
            Dashboard
          </CommandPaletteItem>
          <CommandPaletteItem id="inbox" icon={RiInbox2Line} description="Workspace">
            Inbox
          </CommandPaletteItem>
          <CommandPaletteItem id="settings" icon={RiSettings3Line} description="Account">
            Settings
          </CommandPaletteItem>
        </CommandPaletteSection>
        <CommandPaletteSection title="Tasks">
          <CommandPaletteItem id="archive" icon={RiArchiveLine}>
            Archive finished tasks
          </CommandPaletteItem>
        </CommandPaletteSection>
      </CommandPalette>
    </div>
  );
}
