'use client';

import { useState, type MouseEvent } from 'react';
import { RiCalendarCheckLine, RiChat3Line, RiTaskLine } from '@remixicon/react';

import { Avatar } from '@/registry/ui/avatar';
import { DASHBOARD_NAV, DashboardSidebar } from '@/registry/ui/dashboard-sidebar';
import { Kbd } from '@/registry/ui/kbd';

/* The floating sidebar beside a dashboard page, as BoardUI lays it out. The
   rows are plain `href="#"` links, so a capture handler on the page keeps them
   from touching the host URL and moves the selected state instead. Fold the
   rail, press ⌘L to filter the nav, open the account or team menus, or click
   Settings for the settings dialog. The theme toggle is hidden because it
   flips the whole document, which BoardUI's own preview also avoids. */
const STATS = [
  { label: 'Open tasks', value: '24', delta: '+3 today', icon: RiTaskLine },
  { label: 'Due this week', value: '7', delta: '2 overdue', icon: RiCalendarCheckLine },
  { label: 'Unread messages', value: '94', delta: 'across 6 threads', icon: RiChat3Line },
];

const ACTIVITY = [
  { who: 'Steven Raule', initials: 'S', color: 'lime', what: 'moved "Landing page copy" to Review', when: '12 min ago' },
  { who: 'Lauren Proso', initials: 'L', color: 'pink', what: 'commented on "Q3 campaign brief"', when: '38 min ago' },
  { who: 'Jordan Lee', initials: 'J', color: 'neutral', what: 'scheduled "Design review" for Thursday', when: '1 h ago' },
  { who: 'Acme team', initials: 'A', color: 'blue', what: 'added 4 files to Marketing assets', when: '3 h ago' },
  { who: 'Steven Raule', initials: 'S', color: 'lime', what: 'closed "Onboarding checklist"', when: 'Yesterday' },
] as const;

export default function Demo() {
  const [selected, setSelected] = useState('home');
  const title = DASHBOARD_NAV.find((item) => item.key === selected)?.label ?? 'Home';

  const onNavClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest('a[href="#"]');
    if (!link) return;
    event.preventDefault();
    const item = DASHBOARD_NAV.find((entry) => entry.label === link.getAttribute('aria-label'));
    if (item) setSelected(item.key);
  };

  return (
    <div className="flex h-full w-full gap-3 bg-background-full p-3" onClickCapture={onNavClickCapture}>
      <DashboardSidebar selected={selected} showThemeToggle={false} />

      <main className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-8 py-7">
        <header className="flex flex-col gap-1">
          <h1 className="text-title-1-semibold text-text-primary">{title}</h1>
          <p className="text-body-regular text-text-secondary">
            Fold the rail with the icon beside your name, or press <Kbd>⌘L</Kbd> to search the navigation.
          </p>
        </header>

        <ul className="grid grid-cols-3 gap-3">
          {STATS.map(({ label, value, delta, icon: Icon }) => (
            <li
              key={label}
              className="flex flex-col gap-3 rounded-2xl border border-border-button-default bg-background-secondary-default p-4"
            >
              <span className="flex items-center gap-2 text-body-medium text-text-secondary">
                <Icon className="size-5 shrink-0 text-foreground-icon-secondary" aria-hidden />
                {label}
              </span>
              <span className="flex items-baseline gap-2">
                <span className="text-title-1-semibold text-text-primary">{value}</span>
                <span className="text-body-2-regular text-text-tertiary">{delta}</span>
              </span>
            </li>
          ))}
        </ul>

        <section className="flex flex-col rounded-2xl border border-border-button-default bg-background-secondary-default">
          <h2 className="px-5 pb-2 pt-4 text-headline-semibold text-text-primary">
            Recent activity
          </h2>
          <ul className="flex flex-col ps-5">
            {ACTIVITY.map(({ who, initials, color, what, when }) => (
              <li
                key={`${who}:${what}`}
                className="flex items-center gap-3 border-b border-separator-border py-3 pe-5 last:border-b-0"
              >
                <Avatar size="sm" color={color} initials={initials} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-body-regular text-text-secondary">
                  <span className="text-body-medium text-text-primary">{who}</span> {what}
                </span>
                <span className="shrink-0 text-body-2-regular text-text-tertiary">{when}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
