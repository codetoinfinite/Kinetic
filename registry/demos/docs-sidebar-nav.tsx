'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Docs Sidebar Nav" (boardui.com/components/typography).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import {
  RiArrowLeftRightLine,
  RiFontSize,
  RiInstallLine,
  RiLayout2Line,
  RiLayoutGridFill,
  RiPaletteLine,
  RiPlugLine,
  RiPresentationLine,
  RiRocket2Line,
  RiStickyNoteAddLine,
} from '@remixicon/react';
import { DocsSidebarNav } from '@/registry/ui/docs-sidebar-nav';
import type { DocsNavGroup, DocsNavItem } from '@/registry/ui/docs-sidebar-nav';

const GROUPS: DocsNavGroup[] = [
  {
    id: 'getting-started',
    label: 'Getting started',
    items: [
      { id: 'introduction', label: "Let's begin", icon: RiRocket2Line },
      { id: 'installation', label: 'Installation', icon: RiInstallLine, keywords: ['setup', 'cli'] },
      { id: 'mcp', label: 'MCP Server', icon: RiPlugLine },
      { id: 'agent-skills', label: 'Agent Skills', icon: RiStickyNoteAddLine, badge: 'new' },
      { id: 'rtl', label: 'RTL Support', icon: RiArrowLeftRightLine, badge: 'new' },
    ],
  },
  {
    id: 'foundations',
    label: 'Foundations',
    items: [
      { id: 'color', label: 'Color', icon: RiPaletteLine },
      { id: 'typography', label: 'Typography', icon: RiFontSize, keywords: ['font', 'type scale'] },
      { id: 'components', label: 'Components', icon: RiPresentationLine },
      { id: 'templates', label: 'Templates', icon: RiLayout2Line },
    ],
  },
  {
    id: 'base',
    label: 'Base',
    items: [
      { id: 'accordion', label: 'Accordion', badge: 'new' },
      { id: 'announcement', label: 'Announcement' },
      { id: 'avatar', label: 'Avatar' },
      { id: 'badge', label: 'Badge' },
      { id: 'breadcrumb', label: 'Breadcrumb' },
      { id: 'button', label: 'Button' },
      { id: 'button-group', label: 'Button Group' },
      { id: 'carousel', label: 'Carousel', badge: 'new' },
      { id: 'checkbox', label: 'Checkbox' },
      { id: 'chip', label: 'Chip' },
      { id: 'close-button', label: 'Close Button' },
    ],
  },
  {
    id: 'charts',
    label: 'Charts',
    items: [
      { id: 'line-chart-card', label: 'Line Chart Card', badge: 'pro' },
      { id: 'heatmap-chart', label: 'Heatmap Chart', badge: 'pro' },
      { id: 'most-active-days', label: 'Most Active Days', badge: 'pro' },
      { id: 'sankey', label: 'Sankey Flow', disabled: true },
    ],
  },
];

function findItem(id: string): { group: DocsNavGroup; item: DocsNavItem } | null {
  for (const group of GROUPS) {
    const item = group.items.find((entry) => entry.id === id);
    if (item) return { group, item };
  }
  return null;
}

export default function Demo() {
  const [active, setActive] = useState<string | null>('typography');
  const [collapsed, setCollapsed] = useState<string[]>(['charts']);
  const found = active ? findItem(active) : null;

  return (
    <div data-demo className="flex h-[512px] w-full max-w-[720px] items-stretch gap-6">
      <DocsSidebarNav
        groups={GROUPS}
        value={active}
        onValueChange={(id) => setActive(id)}
        collapsedGroups={collapsed}
        onCollapsedGroupsChange={setCollapsed}
        hotkey
        className="h-full w-full max-w-[260px] shrink-0"
        header={
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-md bg-linear-to-b from-accent-400 to-accent-600 text-white shadow-xs">
              <RiLayoutGridFill aria-hidden className="size-3.5" />
            </span>
            <span className="text-headline-semibold text-text-primary">Lumen UI</span>
          </div>
        }
      />

      <section
        aria-live="polite"
        className="hidden min-w-0 flex-1 flex-col gap-3 rounded-3xl border border-border-component-detail-container bg-background-primary-default p-8 sm:flex"
      >
        <p className="text-caption-1-medium tracking-[0.04em] text-text-tertiary uppercase">
          {found ? found.group.label : 'Docs'}
        </p>
        <h2 className="text-title-2-medium text-text-primary">{found ? found.item.label : 'Pick a page'}</h2>
        <p className="max-w-[46ch] text-body-regular text-text-secondary">
          The sidebar keeps its own scroll, collapses groups on the header row and filters every page as you type.
          Press ⌘K to jump to the filter, then use the arrow keys to walk the list.
        </p>
        <div className="mt-auto grid grid-cols-3 gap-2" aria-hidden>
          <div className="h-20 rounded-2xl bg-background-secondary-default" />
          <div className="h-20 rounded-2xl bg-background-secondary-default" />
          <div className="h-20 rounded-2xl bg-background-secondary-default" />
        </div>
      </section>
    </div>
  );
}
