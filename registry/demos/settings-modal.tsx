'use client';

import { useCallback, useState } from 'react';
import {
  RiArrowRightSLine,
  RiEqualizerLine,
  RiHardDrive2Line,
  RiSettingsLine,
  RiToolsLine,
  RiUserLine,
  type RemixiconComponentType,
} from '@remixicon/react';

import { Avatar } from '@/registry/ui/avatar';
import { Button } from '@/registry/ui/button';
import { SettingsModal, type SettingsPage } from '@/registry/ui/settings-modal';

/* An app page with the dialog closed, as BoardUI ships it: a secondary
   "Open settings" button toggles the controlled modal. Each section card
   opens it at that page through `defaultPage`, so General's burning plan art,
   Profile's Saved toast, Tools' MCP list and the Storage table are each one
   click away. Esc, the backdrop and the close button all play the exit. */
const SECTIONS: {
  page: SettingsPage;
  title: string;
  description: string;
  icon: RemixiconComponentType;
}[] = [
  {
    page: 'general',
    title: 'General',
    description: 'Plan, limits, pull requests and notifications.',
    icon: RiEqualizerLine,
  },
  {
    page: 'profile',
    title: 'Profile',
    description: 'Name, email and birthday. Fields save on Enter or blur.',
    icon: RiUserLine,
  },
  {
    page: 'tools',
    title: 'Tools',
    description: 'MCP servers and their tools for each workspace scope.',
    icon: RiToolsLine,
  },
  {
    page: 'storage',
    title: 'Storage',
    description: 'Uploaded files to sort, filter, page through and delete.',
    icon: RiHardDrive2Line,
  },
];

export default function Demo() {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<SettingsPage>('general');
  const close = useCallback(() => setOpen(false), []);

  const openAt = (next: SettingsPage) => {
    setPage(next);
    setOpen(true);
  };

  return (
    <div className="flex h-full w-full flex-col bg-background-full">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-separator-border px-8">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex size-8 items-center justify-center rounded-2lg bg-linear-to-b from-accent-500 to-accent-600 text-body-semibold text-white"
          >
            A
          </span>
          <span className="text-headline-semibold text-text-primary">Acme</span>
          <span className="text-body-regular text-text-tertiary">/ Workspace</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" leadingIcon={RiSettingsLine} onClick={() => openAt('general')}>
            Open settings
          </Button>
          <Avatar initials="J" aria-hidden />
        </div>
      </header>

      <main className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-8 py-12">
        <div className="flex w-full max-w-[880px] flex-col gap-8">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-title-1-semibold text-text-primary">Settings</h1>
            <p className="text-body-regular text-text-secondary">
              Every section opens in the same dialog. Pick one to start there, then move between pages from the rail.
            </p>
          </div>

          <ul className="grid grid-cols-2 gap-3">
            {SECTIONS.map(({ page: target, title, description, icon: Icon }) => (
              <li key={target}>
                <button
                  type="button"
                  onClick={() => openAt(target)}
                  className="group flex w-full cursor-pointer items-center gap-4 rounded-2xl border border-border-button-default bg-background-secondary-default p-4 text-start outline-none transition-colors duration-150 hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-background-tertiary-default">
                    <Icon className="size-5 text-foreground-icon-secondary" aria-hidden />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-headline-medium text-text-primary">{title}</span>
                    <span className="text-body-2-regular text-text-secondary">{description}</span>
                  </span>
                  <RiArrowRightSLine
                    className="size-5 shrink-0 text-foreground-icon-tertiary transition-transform duration-150 group-hover:translate-x-0.5 rtl:rotate-180"
                    aria-hidden
                  />
                </button>
              </li>
            ))}
          </ul>

          <p className="text-body-2-regular text-text-tertiary">
            Esc, the backdrop or the round close button dismisses the dialog.
          </p>
        </div>
      </main>

      <SettingsModal isOpen={open} onClose={close} defaultPage={page} />
    </div>
  );
}
