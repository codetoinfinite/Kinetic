'use client';

import { useState } from 'react';
import { PanelWipePreloader } from '@/registry/ui/panel-wipe-preloader';

export default function Demo() {
  // Bumping `run` remounts the preloader, which is exactly how you replay it
  // in development. In production it mounts once, in the root layout.
  const [run, setRun] = useState(0);
  const [ready, setReady] = useState(false);

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <nav className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="meta text-fg">Vantage</span>
        <button
          type="button"
          onClick={() => {
            setReady(false);
            setRun((n) => n + 1);
          }}
          className="meta transition-colors hover:text-fg"
        >
          Replay
        </button>
      </nav>

      <div className="flex h-[calc(100%-3rem)] flex-col justify-between p-4">
        <div className="flex items-baseline justify-between">
          <span className="meta text-accent">Issue 04</span>
          <span className="meta">{ready ? 'Loaded' : '—'}</span>
        </div>
        <h2 className="max-w-[14ch] text-3xl leading-[1.02] tracking-tight text-fg">
          Everything arrives at once, or not at all.
        </h2>
      </div>

      <PanelWipePreloader
        key={run}
        position="absolute"
        onDone={() => setReady(true)}
      />
    </div>
  );
}
