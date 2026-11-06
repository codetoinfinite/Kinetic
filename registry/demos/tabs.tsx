'use client';

import { useState } from 'react';
import {
  RiBarChartLine,
  RiChat3Line,
  RiGitBranchLine,
  RiGlobalLine,
  RiLayoutGridLine,
  RiStackLine,
} from '@remixicon/react';

import { PillTab, PillTabList } from '@/registry/ui/pill-tab';
import { Tab, TabList, TabPanel, Tabs } from '@/registry/ui/tabs';

const panels = {
  components: '48 primitives: buttons, fields, menus, overlays and data display.',
  blocks: '6 full-page compositions: auth, settings, dashboards and chat.',
  charts: 'Area, bar, line and donut charts themed with the kit tokens.',
} as const;

/* BoardUI's own preview is the underline strip with counts. Below it, the two
   pill switcher styles: the blue AI-chat panel switcher and the quieter gray
   filter row, each a controlled row so the thumb slides on click. */
export default function Demo() {
  const [panel, setPanel] = useState<'chat' | 'changes' | 'browser'>('chat');
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');

  return (
    <div className="flex w-full max-w-[520px] flex-col gap-8">
      <Tabs defaultSelectedKey="components">
        <TabList aria-label="Library sections">
          <Tab id="components" icon={RiLayoutGridLine} count={48}>
            Components
          </Tab>
          <Tab id="blocks" icon={RiStackLine} count={6}>
            Blocks
          </Tab>
          <Tab id="charts" icon={RiBarChartLine}>
            Charts
          </Tab>
        </TabList>
        <TabPanel id="components" className="text-body-regular text-text-secondary">
          {panels.components}
        </TabPanel>
        <TabPanel id="blocks" className="text-body-regular text-text-secondary">
          {panels.blocks}
        </TabPanel>
        <TabPanel id="charts" className="text-body-regular text-text-secondary">
          {panels.charts}
        </TabPanel>
      </Tabs>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <PillTabList aria-label="Assistant panel">
          <PillTab icon={RiChat3Line} isSelected={panel === 'chat'} onSelect={() => setPanel('chat')}>
            Chat
          </PillTab>
          <PillTab icon={RiGitBranchLine} isSelected={panel === 'changes'} onSelect={() => setPanel('changes')}>
            Changes
          </PillTab>
          <PillTab icon={RiGlobalLine} isSelected={panel === 'browser'} onSelect={() => setPanel('browser')}>
            Browser
          </PillTab>
        </PillTabList>

        <PillTabList aria-label="Date range">
          <PillTab variant="gray" isSelected={range === '7d'} onSelect={() => setRange('7d')}>
            7 days
          </PillTab>
          <PillTab variant="gray" isSelected={range === '30d'} onSelect={() => setRange('30d')}>
            30 days
          </PillTab>
          <PillTab variant="gray" isSelected={range === '90d'} onSelect={() => setRange('90d')}>
            90 days
          </PillTab>
        </PillTabList>
      </div>
    </div>
  );
}
