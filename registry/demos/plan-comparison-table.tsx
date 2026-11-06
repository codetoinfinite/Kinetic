'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Plan Comparison Table" (boardui.com/pricing).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import { RiBox3Line, RiCustomerService2Line, RiScales3Line, RiTerminalBoxLine } from '@remixicon/react';
import { PlanComparisonTable } from '@/registry/ui/plan-comparison-table';
import type { ComparisonGroup, ComparisonPlan } from '@/registry/ui/plan-comparison-table';

const PLANS: ComparisonPlan[] = [
  { id: 'starter', name: 'Starter', price: 'Free', cta: { label: 'Install now' } },
  { id: 'pro', name: 'Pro', price: '€15', period: '/ month', cta: { label: 'Start with Pro' } },
  { id: 'team', name: 'Team', price: '€39', period: '/ month', highlighted: true, badge: 'Popular', cta: { label: 'Start with Team' } },
  { id: 'startup', name: 'Startup', price: '€79', period: '/ month', cta: { label: 'Start with Startup' } },
];

const all = { starter: true, pro: true, team: true, startup: true };
const paid = { starter: false, pro: true, team: true, startup: true };
const teams = { starter: false, pro: false, team: true, startup: true };

const GROUPS: ComparisonGroup[] = [
  {
    id: 'components',
    title: 'Components & blocks',
    icon: RiBox3Line,
    rows: [
      { id: 'fundamentals', label: 'Fundamental components', hint: 'Buttons, inputs, menus, dialogs', values: all },
      { id: 'pro-components', label: 'Pro components', values: paid },
      { id: 'blocks', label: 'Page blocks & templates', values: teams },
      { id: 'chat', label: 'AI chat starter', values: { starter: 'Free tier', pro: 'Full', team: 'Full', startup: 'Full' } },
      { id: 'tokens', label: 'Design tokens and dark mode', values: all },
    ],
  },
  {
    id: 'license',
    title: 'License',
    icon: RiScales3Line,
    rows: [
      { id: 'seats', label: 'Seats', values: { starter: '1', pro: '1', team: '3', startup: '10' } },
      { id: 'projects', label: 'Unlimited projects', values: all },
      { id: 'commercial', label: 'Commercial use', values: all },
      { id: 'forever', label: 'Keep the code forever', values: paid },
    ],
  },
  {
    id: 'tooling',
    title: 'Tooling',
    icon: RiTerminalBoxLine,
    rows: [
      { id: 'cli', label: 'Install via CLI', values: all },
      { id: 'mcp', label: 'MCP server for AI agents', values: paid },
      { id: 'updates', label: 'Updates', values: { starter: 'Free tier', pro: 'While subscribed', team: 'While subscribed', startup: 'While subscribed' } },
    ],
  },
  {
    id: 'support',
    title: 'Support',
    icon: RiCustomerService2Line,
    rows: [
      { id: 'discord', label: 'Discord community', values: all },
      { id: 'priority', label: 'Priority channel', values: { starter: false, pro: false, team: false, startup: true } },
      { id: 'response', label: 'Response time', values: { starter: false, pro: '2 days', team: '1 day', startup: 'Same day' } },
    ],
  },
];

export default function Demo() {
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <div className="h-full w-full overflow-y-auto bg-background-full">
      <div className="mx-auto max-w-[1120px] px-4 pt-12 pb-16 sm:px-8">
        <h2 className="text-center text-display-4-medium tracking-tight text-balance text-text-primary">Every plan, side by side</h2>
        <p className="mx-auto mt-3 max-w-md text-center text-body-regular text-pretty text-text-secondary">
          Prices per month, billed yearly. Collapse a group to shorten the list.
        </p>
        <p role="status" data-demo="picked" className="mt-2 min-h-5 text-center text-body-2-regular text-text-tertiary">
          {picked ? `Selected: ${picked}` : ''}
        </p>
        <PlanComparisonTable
          className="mt-4"
          plans={PLANS}
          groups={GROUPS}
          defaultCollapsed={['support']}
          label="Compare plans"
          sublabel="Billed yearly, excl. VAT"
          onSelectPlan={(id) => setPicked(PLANS.find((p) => p.id === id)?.name ?? id)}
        />
      </div>
    </div>
  );
}
