'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Repo Tree Nav" (boardui.com/components/multi-agent-chat).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import { RiGitBranchLine } from '@remixicon/react';

import { RepoTreeNav, fileIconFor, summarizeChanges, type RepoTreeNode } from '@/registry/ui/repo-tree-nav';

/* An agent's working tree after a theming task. Folders open and close with a
   click, Enter or the arrow keys; picking a file shows its change summary on
   the right. Collapsed folders roll up the counts of everything inside. */
const TREE: RepoTreeNode[] = [
  {
    id: 'app',
    name: 'app',
    children: [
      {
        id: 'app/components',
        name: 'components',
        children: [
          { id: 'app/components/button.tsx', name: 'button.tsx', additions: 74, deletions: 6, status: 'modified' },
          { id: 'app/components/theme-toggle.tsx', name: 'theme-toggle.tsx', additions: 48, status: 'added' },
          { id: 'app/components/card.tsx', name: 'card.tsx' },
        ],
      },
      { id: 'app/layout.tsx', name: 'layout.tsx', additions: 9, deletions: 2, status: 'modified' },
      { id: 'app/page.tsx', name: 'page.tsx' },
    ],
  },
  {
    id: 'styles',
    name: 'styles',
    children: [
      { id: 'styles/tokens.css', name: 'tokens.css', additions: 18, deletions: 11, status: 'modified' },
      { id: 'styles/legacy-dark.css', name: 'legacy-dark.css', deletions: 4, status: 'deleted' },
    ],
  },
  {
    id: 'public',
    name: 'public',
    children: [{ id: 'public/logo.svg', name: 'logo.svg' }],
  },
  { id: 'registry.json', name: 'registry.json', additions: 7, status: 'modified' },
  { id: 'README.md', name: 'README.md' },
];

const findNode = (nodes: RepoTreeNode[], id: string): RepoTreeNode | undefined => {
  for (const node of nodes) {
    if (node.id === id) return node;
    const hit = node.children ? findNode(node.children, id) : undefined;
    if (hit) return hit;
  }
  return undefined;
};

const SUMMARY = summarizeChanges(TREE);
const STATUS_TEXT = { added: 'Added', modified: 'Modified', deleted: 'Deleted', renamed: 'Renamed' } as const;

export default function Demo() {
  const [selected, setSelected] = useState('app/components/button.tsx');
  const file = findNode(TREE, selected);
  const additions = file?.additions ?? 0;
  const deletions = file?.deletions ?? 0;
  const total = additions + deletions;
  // Five-block change bar: green share first, then red, the rest neutral.
  const red = deletions ? Math.max(1, Math.round((deletions / total) * 5)) : 0;
  const green = additions ? Math.max(1, Math.min(5 - red, Math.round((additions / total) * 5))) : 0;
  const Icon = fileIconFor(file?.name ?? '');

  return (
    <div className="flex h-full w-full items-center justify-center bg-background-full p-6">
      <div className="flex h-[500px] w-full max-w-[760px] gap-3">
        <aside className="flex w-full shrink-0 flex-col gap-2 rounded-3xl border border-border-button-default bg-background-primary-default p-3 shadow-sidebar sm:w-[300px]">
          <div className="flex items-center justify-between gap-2 border-b border-border-button-default px-2 pt-1 pb-3">
            <div className="flex min-w-0 items-center gap-1.5 text-body-2-medium text-text-secondary">
              <RiGitBranchLine aria-hidden className="size-4 shrink-0 text-foreground-icon-secondary" />
              <span className="truncate">feat/dark-mode</span>
            </div>
            <p className="shrink-0 text-caption-1-medium tabular-nums text-text-tertiary">
              {SUMMARY.files} files <span className="text-status-lime-text">+{SUMMARY.additions}</span>{' '}
              <span className="text-status-rose-text">&minus;{SUMMARY.deletions}</span>
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <RepoTreeNav
              aria-label="Changed files"
              nodes={TREE}
              selectedId={selected}
              onSelect={(id) => setSelected(id)}
              defaultExpandedIds={['app', 'app/components', 'styles']}
              className="rounded-none border-0 bg-transparent p-0"
            />
          </div>
        </aside>

        <section
          aria-label="Selected file"
          className="hidden min-w-0 flex-1 flex-col gap-4 rounded-3xl border border-border-button-default bg-background-secondary-default p-6 sm:flex"
        >
          <p className="truncate text-body-2-medium text-text-tertiary" data-testid="file-path">
            {selected}
          </p>
          <div key={selected} className="flex flex-col gap-4 transition-[opacity,translate] duration-200 ease-out starting:translate-y-1 starting:opacity-0 motion-reduce:transition-none">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl border border-border-button-default bg-background-primary-default">
                <Icon aria-hidden className="size-5 text-foreground-icon-secondary" />
              </span>
              <div className="flex min-w-0 flex-col">
                <h2 data-testid="file-name" className="truncate text-title-3-semibold text-text-primary">
                  {file?.name}
                </h2>
                <p className="text-body-2-regular text-text-tertiary">
                  {file?.status ? STATUS_TEXT[file.status] : 'Unchanged'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-border-button-default bg-background-primary-default p-4">
              <span className="text-body-medium tabular-nums text-status-lime-text">+{additions}</span>
              <span className="text-body-medium tabular-nums text-status-rose-text">&minus;{deletions}</span>
              <span aria-hidden className="ms-auto flex gap-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <span
                    key={i}
                    className={
                      i < green
                        ? 'size-2.5 rounded-sm bg-status-lime-text'
                        : i < green + red
                          ? 'size-2.5 rounded-sm bg-status-rose-text'
                          : 'size-2.5 rounded-sm bg-border-button-default'
                    }
                  />
                ))}
              </span>
            </div>
            <p className="text-body-2-regular text-text-secondary">
              {total
                ? `${additions + deletions} lines touched by the agent in this file.`
                : 'The agent read this file but did not change it.'}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
