'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Agent Detail Panel" (boardui.com/components/multi-agent-chat).
 * No BoardUI source was used.
 */
import { useEffect, useState } from 'react';
import { RiSideBarLine } from '@remixicon/react';

import { AgentDetailPanel, type AgentRunStatus, type AgentStep } from '@/registry/ui/agent-detail-panel';

const PLAN: Omit<AgentStep, 'state'>[] = [
  { id: 'brief', title: 'Read the brief', detail: 'Parsed the landing page brief and brand notes.', time: '0:12' },
  { id: 'audit', title: 'Audit the current hero', detail: 'Found three competing calls to action above the fold.', time: '0:48' },
  { id: 'layout', title: 'Draft a new layout', detail: 'One primary action, social proof moved under the fold.', time: '1:35' },
  { id: 'copy', title: 'Write headline variants', detail: 'Three options, each under eight words.', time: '2:10' },
  { id: 'hero', title: 'Update hero.tsx', detail: 'Swap the CTA group for a single primary button.', time: '2:58' },
  { id: 'checks', title: 'Run visual checks', detail: 'Light, dark and 360px wide.', time: '3:40' },
  { id: 'pr', title: 'Open a pull request', detail: 'feat/hero-single-cta → main', time: '4:05' },
];

/** Steps before `active` are done, `active` is in progress, the rest pending. */
function stepsAt(active: number): AgentStep[] {
  return PLAN.map((s, i) => ({ ...s, state: i < active ? 'done' : i === active ? 'active' : 'pending' }));
}

const STEP_MS = 3200;

export default function Demo() {
  const [active, setActive] = useState(3);
  const [status, setStatus] = useState<AgentRunStatus>('running');
  const [open, setOpen] = useState(true);

  // Finishing the plan ends the run; derived so no effect has to sync it.
  const shown: AgentRunStatus = status === 'running' && active >= PLAN.length ? 'done' : status;

  // Advance one step every STEP_MS while the run is live.
  useEffect(() => {
    if (shown !== 'running') return;
    const id = window.setInterval(() => setActive((a) => Math.min(a + 1, PLAN.length)), STEP_MS);
    return () => window.clearInterval(id);
  }, [shown]);

  return (
    <div className="flex h-full w-full items-center justify-center bg-background-full p-6">
      {open ? (
        <AgentDetailPanel
          name="Landing page designer"
          subtitle="Design · started by Mara"
          task="Give the hero one clear action and move pricing below the fold. Keep the illustration."
          steps={stepsAt(active)}
          stats={[
            { label: 'Elapsed', value: PLAN[Math.min(active, PLAN.length - 1)]?.time ?? '0:00' },
            { label: 'Files', value: Math.max(0, active - 3) },
            { label: 'Tokens', value: `${(8.2 + active * 2.6).toFixed(1)}k` },
          ]}
          status={shown}
          onStatusChange={(next) => setStatus(next)}
          onRestart={() => setActive(0)}
          onClose={() => setOpen(false)}
          className="h-[512px] w-full max-w-[420px]"
        />
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-9 cursor-pointer items-center gap-2 rounded-full border border-border-button-default bg-background-primary-default px-4 text-body-medium text-text-primary shadow-xs outline-none transition-colors duration-150 ease-out hover:bg-background-primary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring motion-reduce:transition-none"
        >
          <RiSideBarLine aria-hidden className="size-4 text-foreground-icon-secondary" />
          Show agent details
        </button>
      )}
    </div>
  );
}
