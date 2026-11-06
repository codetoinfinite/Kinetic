'use client';

import { useState } from 'react';
import type { ComponentType } from 'react';
import {
  RiBankCardLine,
  RiFolder3Line,
  RiHome5Line,
  RiSettings3Line,
  RiShieldKeyholeLine,
  RiTeamLine,
  RiUserLine,
} from '@remixicon/react';

import { Breadcrumb, BreadcrumbItem } from '@/registry/ui/breadcrumb';

type Icon = ComponentType<{ className?: string }>;
type Tree = { [name: string]: Tree };

const files: Tree = {
  Design: { Brand: { Logos: {}, Typography: {} }, 'Product UI': { Onboarding: {} } },
  Engineering: { Frontend: { Components: {} }, Infrastructure: {} },
  Finance: { Invoices: {} },
};

const settings: Tree = {
  Settings: { Account: { Profile: {}, Security: {} }, Team: { Members: {} }, Billing: { Invoices: {} } },
};

const settingsIcons: Record<string, Icon> = {
  Settings: RiSettings3Line,
  Account: RiUserLine,
  Profile: RiUserLine,
  Security: RiShieldKeyholeLine,
  Team: RiTeamLine,
  Members: RiTeamLine,
  Billing: RiBankCardLine,
  Invoices: RiBankCardLine,
};

function childrenOf(tree: Tree, path: string[]): string[] {
  let node: Tree | undefined = tree;
  for (const segment of path) node = node?.[segment];
  return node ? Object.keys(node) : [];
}

/* A trail you can walk: open a child below, then click any ancestor in the
   breadcrumb to jump back up. The ancestors are `onClick` buttons (no `href`)
   so the preview never navigates away; the last crumb is `current`. */
function Explorer({
  label,
  root,
  rootIcon,
  tree,
  icons,
  initial,
}: {
  label: string;
  root: string;
  rootIcon: Icon;
  tree: Tree;
  icons?: Record<string, Icon>;
  initial: string[];
}) {
  const [path, setPath] = useState<string[]>(initial);
  const crumbs = [root, ...path];
  const next = childrenOf(tree, path);

  return (
    <div className="flex w-full flex-col gap-3 rounded-xl border border-border-button-default bg-background-primary-default p-4 shadow-xs">
      <Breadcrumb aria-label={label}>
        {crumbs.map((name, index) =>
          index === crumbs.length - 1 ? (
            <BreadcrumbItem key={`${index}-${name}`} current icon={index === 0 ? rootIcon : icons?.[name]}>
              {name}
            </BreadcrumbItem>
          ) : (
            <BreadcrumbItem
              key={`${index}-${name}`}
              icon={index === 0 ? rootIcon : icons?.[name]}
              onClick={() => setPath(path.slice(0, index))}
            >
              {name}
            </BreadcrumbItem>
          ),
        )}
      </Breadcrumb>
      <div className="flex min-h-7 flex-wrap items-center gap-1.5">
        {next.length === 0 ? (
          <span className="text-caption-1-regular text-text-tertiary">No subfolders. Click a crumb to go back.</span>
        ) : (
          next.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setPath([...path, name])}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border-button-default px-2 py-1 text-caption-1-medium text-text-secondary transition-colors duration-150 outline-none hover:bg-background-primary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring"
            >
              <RiFolder3Line className="size-3.5 text-text-tertiary" aria-hidden />
              {name}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export default function Demo() {
  return (
    <div className="flex w-full max-w-[460px] flex-col gap-4">
      <Explorer
        label="Folder path"
        root="Workspace"
        rootIcon={RiHome5Line}
        tree={files}
        initial={['Design', 'Brand']}
      />
      <Explorer
        label="Settings path"
        root="Home"
        rootIcon={RiHome5Line}
        tree={settings}
        icons={settingsIcons}
        initial={['Settings', 'Account', 'Profile']}
      />
    </div>
  );
}
