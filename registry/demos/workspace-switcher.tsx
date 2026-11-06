'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Workspace Switcher" (boardui.com/components/multi-agent-chat).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import { RiFolder3Line, RiGitBranchLine, RiRobot2Line, RiSettings3Line, RiTimeLine } from '@remixicon/react';

import { WorkspaceSwitcher, type Workspace } from '@/registry/ui/workspace-switcher';

/* The switcher sits at the top of an agent sidebar. Pick another workspace
   and the trigger, the repository list and the summary on the right all
   follow; "Create workspace" appends a fresh one and switches to it. */
const INITIAL: Workspace[] = [
  { id: 'board', name: 'Board team', plan: 'Pro plan', detail: '8 members', tone: 'blue' },
  { id: 'personal', name: 'Personal', plan: 'Free plan', detail: 'Just you', tone: 'neutral' },
  { id: 'northwind', name: 'Northwind Labs', plan: 'Team plan', detail: '24 members', tone: 'lime' },
  { id: 'atlas', name: 'Atlas Studio', plan: 'Enterprise', detail: '112 members', tone: 'pink' },
];

const REPOS: Record<string, { name: string; when: string }[]> = {
  board: [
    { name: 'boardui', when: '34m' },
    { name: 'marketing-site', when: '5h' },
    { name: 'design-tokens', when: '18h' },
  ],
  personal: [{ name: 'dotfiles', when: '2d' }],
  northwind: [
    { name: 'checkout-api', when: 'now' },
    { name: 'mobile-app', when: '1h' },
    { name: 'data-pipeline', when: '3h' },
    { name: 'infra', when: '1d' },
  ],
  atlas: [
    { name: 'portfolio', when: '12m' },
    { name: 'brand-kit', when: '6h' },
  ],
};

const NAV = [
  { label: 'Agents', icon: RiRobot2Line },
  { label: 'Automations', icon: RiTimeLine },
  { label: 'Settings', icon: RiSettings3Line },
];

export default function Demo() {
  const [workspaces, setWorkspaces] = useState(INITIAL);
  const [current, setCurrent] = useState('board');
  const [nav, setNav] = useState('Agents');

  const workspace = workspaces.find((entry) => entry.id === current) ?? workspaces[0];
  const repos = REPOS[current] ?? [];

  const createWorkspace = () => {
    const n = workspaces.length - INITIAL.length + 1;
    const id = `new-${n}`;
    setWorkspaces((list) => [...list, { id, name: `New workspace ${n}`, plan: 'Free plan', detail: 'Just you', initials: 'N' }]);
    setCurrent(id);
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-background-full p-6">
      <div className="flex h-[480px] w-full max-w-[760px] gap-3">
        <aside className="flex w-[260px] shrink-0 flex-col gap-3 rounded-3xl border border-border-button-white bg-background-secondary-default p-3 shadow-sidebar">
          <WorkspaceSwitcher
            workspaces={workspaces}
            value={current}
            onChange={setCurrent}
            onCreateWorkspace={createWorkspace}
          />

          <nav aria-label="Workspace" className="flex flex-col gap-0.5">
            {NAV.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                aria-current={nav === label ? 'page' : undefined}
                onClick={() => setNav(label)}
                className="flex cursor-pointer items-center gap-2 rounded-2lg p-2 text-start text-body-medium text-text-secondary outline-none transition-colors duration-150 ease-out hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring aria-[current=page]:bg-background-tertiary-default aria-[current=page]:text-text-primary motion-reduce:transition-none"
              >
                <Icon aria-hidden className="size-5 text-foreground-icon-secondary" />
                {label}
              </button>
            ))}
          </nav>

          <div className="flex min-h-0 flex-1 flex-col gap-1">
            <h3 className="px-2 pt-1 text-body-2-medium text-text-tertiary">Repositories</h3>
            {repos.length === 0 ? (
              <p className="px-2 py-1 text-body-2-regular text-text-tertiary">No repositories yet.</p>
            ) : (
              <ul key={current} className="flex flex-col gap-0.5" data-testid="repo-list">
                {repos.map((repo) => (
                  <li
                    key={repo.name}
                    className="flex items-center gap-2 rounded-2lg p-2 transition-[opacity,translate] duration-200 ease-out starting:translate-y-1 starting:opacity-0 motion-reduce:transition-none"
                  >
                    <RiFolder3Line aria-hidden className="size-4 shrink-0 text-foreground-icon-secondary" />
                    <span className="min-w-0 flex-1 truncate text-body-2-medium text-text-primary">{repo.name}</span>
                    <span className="text-caption-1-medium text-text-tertiary">{repo.when}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <section
          aria-label="Workspace summary"
          className="hidden min-w-0 flex-1 flex-col gap-4 rounded-3xl border border-border-button-default bg-background-primary-default p-6 sm:flex"
        >
          <p className="text-body-2-medium text-text-tertiary">{nav}</p>
          <h2 data-testid="summary-name" className="text-title-2-semibold text-text-primary">
            {workspace?.name}
          </h2>
          <p className="text-body-regular text-text-secondary">
            {workspace?.plan} · {workspace?.detail}
          </p>
          <div className="flex items-center gap-2 rounded-2xl border border-border-button-default bg-background-secondary-default p-4">
            <RiGitBranchLine aria-hidden className="size-5 text-foreground-icon-secondary" />
            <span className="text-body-medium text-text-primary">
              {repos.length} {repos.length === 1 ? 'repository' : 'repositories'}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
