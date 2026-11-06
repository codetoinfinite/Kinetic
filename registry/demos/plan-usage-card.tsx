'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Plan Usage Card" (boardui.com/).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import { RiSendPlane2Line } from '@remixicon/react';

import { Button } from '@/registry/ui/button';
import { ContextWindowCard, type ContextSegment } from '@/registry/ui/context-window-card';
import { PlanUsageCard, type PlanLimit } from '@/registry/ui/plan-usage-card';

/* The "Agent limits" tile: the context window on top and the plan's rolling
   limits underneath. "Send a prompt" spends the 5-hour window until it runs
   out (amber at 70%, red at 90%); "Upgrade" moves to the 20x plan and every
   limit drops to a quarter of what it was. */
const SEGMENTS: ContextSegment[] = [
  { id: 'messages', label: 'Messages', tokens: 520_000, color: 'blue' },
  { id: 'tools', label: 'System tools', tokens: 96_000, color: 'purple' },
  { id: 'mcp', label: 'MCP tools', tokens: 64_000, color: 'pink' },
  { id: 'memory', label: 'Memory files', tokens: 56_000, color: 'yellow' },
  { id: 'agents', label: 'Custom agents', tokens: 40_000, color: 'green' },
  { id: 'skills', label: 'Skills', tokens: 22_000, color: 'sky' },
  { id: 'system', label: 'System prompt', tokens: 22_000, color: 'teal' },
];

const STEP = { five: 9, weekly: 1, pro: 2 };

export default function Demo() {
  const [usage, setUsage] = useState({ five: 38, weekly: 3, pro: 5 });
  const [upgraded, setUpgraded] = useState(false);

  const limits: PlanLimit[] = [
    { id: 'five', label: '5-hour limit', used: usage.five, resets: 'Resets in 2 hr 46 min' },
    { id: 'weekly', label: 'Weekly · all models', used: usage.weekly, resets: 'Resets Tue 3:00 PM' },
    { id: 'pro', label: 'Weekly · Pro', used: usage.pro, resets: 'Resets Tue 3:00 PM' },
  ];
  const out = usage.five >= 100;

  const send = () =>
    setUsage((u) => ({
      five: Math.min(100, u.five + STEP.five),
      weekly: Math.min(100, u.weekly + STEP.weekly),
      pro: Math.min(100, u.pro + STEP.pro),
    }));

  const upgrade = () => {
    setUpgraded(true);
    setUsage((u) => ({
      five: Math.round(u.five / 4),
      weekly: Math.round(u.weekly / 4),
      pro: Math.round(u.pro / 4),
    }));
  };

  return (
    <div className="flex w-full max-w-[380px] flex-col gap-3 rounded-[20px] border border-border-table bg-background-primary-default p-2.5 shadow-xs">
      <ContextWindowCard capacity={1_000_000} segments={SEGMENTS}>
        <PlanUsageCard
          bare
          plan={upgraded ? 'Max (20x)' : 'Max (5x)'}
          limits={limits}
          renews="Renews Dec 1"
          onUpgrade={upgraded ? undefined : upgrade}
        />
      </ContextWindowCard>
      <div className="flex items-center justify-between gap-2 px-1.5 pb-1">
        <span className="min-w-0 truncate text-caption-1-medium text-text-tertiary" aria-live="polite">
          {out ? '5-hour limit reached' : upgraded ? 'Upgraded to Max (20x)' : 'Agent limits'}
        </span>
        <Button variant="secondary" size="small" leadingIcon={RiSendPlane2Line} disabled={out} onClick={send}>
          Send a prompt
        </Button>
      </div>
    </div>
  );
}
