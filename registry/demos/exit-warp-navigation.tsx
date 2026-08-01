'use client';

import { useState } from 'react';
import { ExitWarpNavigation } from '@/registry/ui/exit-warp-navigation';

const ITEMS = [
  { id: 'atlas', label: 'Atlas' },
  { id: 'meridian', label: 'Meridian' },
  { id: 'foundry', label: 'Foundry' },
  { id: 'pelago', label: 'Pelago' },
  { id: 'northline', label: 'Northline' },
  { id: 'quarry', label: 'Quarry' },
];

export default function Demo() {
  // Stands in for the router: 'index' is the drum, anything else is a project
  // page. In a real app `open` is the pathname and `setOpen` is router.push.
  const [open, setOpen] = useState<string | null>(null);
  const item = ITEMS.find((i) => i.id === open);

  if (item) {
    return (
      <div className="flex h-full w-full flex-col justify-between bg-bg p-4">
        <button
          type="button"
          onClick={() => setOpen(null)}
          className="meta self-start transition-colors hover:text-accent"
        >
          ← Index
        </button>
        <div className="flex flex-col gap-2">
          <span className="meta text-accent">Project</span>
          <h2 className="text-3xl leading-none tracking-tight text-fg">{item.label}</h2>
          <p className="max-w-[42ch] text-sm text-muted">
            The ring finished its warp before this view mounted, so the change of route
            landed on a frame that was already empty.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-bg">
      <ExitWarpNavigation items={ITEMS} onNavigate={(id) => setOpen(id)}>
        <div className="flex items-start justify-between" data-warp-chrome>
          <span className="meta text-fg">Selected Work</span>
          <span className="meta text-faint">{ITEMS.length} projects</span>
        </div>
      </ExitWarpNavigation>
    </div>
  );
}
