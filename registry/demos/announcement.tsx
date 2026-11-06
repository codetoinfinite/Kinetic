'use client';

import { useState } from 'react';
import { RiFolder3Line, RiHome5Line, RiInbox2Line, RiSettings3Line } from '@remixicon/react';

import { Announcement } from '@/registry/ui/announcement';
import { Button } from '@/registry/ui/button';

/* The card where BoardUI places it: the footer of a 260px sidebar. Dismiss it
   to see the blur-and-shrink exit; "Show again" remounts it with an
   `introDelay`, so the second time it also plays the entrance. */
const NAV = [
  { label: 'Home', icon: RiHome5Line, current: true },
  { label: 'Inbox', icon: RiInbox2Line, current: false },
  { label: 'Projects', icon: RiFolder3Line, current: false },
  { label: 'Settings', icon: RiSettings3Line, current: false },
];

export default function Demo() {
  const [round, setRound] = useState(0);
  const [open, setOpen] = useState(true);

  return (
    <div className="flex h-[380px] w-full max-w-[260px] flex-col justify-between rounded-2xl border border-border-button-default bg-background-secondary-default p-3">
      <ul className="flex flex-col gap-0.5" aria-label="Workspace">
        {NAV.map(({ label, icon: Icon, current }) => (
          <li
            key={label}
            aria-current={current ? 'page' : undefined}
            className={
              current
                ? 'flex h-8 items-center gap-2 rounded-lg bg-background-primary-default px-2 text-body-medium text-text-primary shadow-xs'
                : 'flex h-8 items-center gap-2 rounded-lg px-2 text-body-medium text-text-secondary'
            }
          >
            <Icon className="size-4 shrink-0 text-foreground-icon-secondary" aria-hidden />
            {label}
          </li>
        ))}
      </ul>

      {open ? (
        <Announcement
          key={round}
          title="Two new components"
          description="Carousel and Input OTP are installable through the CLI today."
          actionLabel="See what's new"
          dismissible
          introDelay={round === 0 ? undefined : 0.1}
          onClose={() => setOpen(false)}
        />
      ) : (
        <Button
          variant="ghost"
          size="small"
          className="w-full"
          onClick={() => {
            setRound((n) => n + 1);
            setOpen(true);
          }}
        >
          Show again
        </Button>
      )}
    </div>
  );
}
