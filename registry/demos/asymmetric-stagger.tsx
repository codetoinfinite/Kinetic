'use client';

import { useState } from 'react';
import { AsymmetricStagger } from '@/registry/ui/asymmetric-stagger';

const ROWS = [
  { id: '01', title: 'Harbour Atlas', year: '2026' },
  { id: '02', title: 'Meridian Type', year: '2025' },
  { id: '03', title: 'Foundry Rebuild', year: '2025' },
  { id: '04', title: 'Pelago Editions', year: '2024' },
  { id: '05', title: 'Northline Rail', year: '2024' },
];

export default function Demo() {
  const [view, setView] = useState<'cover' | 'index'>('cover');

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <nav className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-3">
        <span className="meta text-fg">Studio Index</span>
        <div className="flex gap-4">
          {(['cover', 'index'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={v === view ? 'meta text-accent' : 'meta transition-colors hover:text-fg'}
            >
              {v}
            </button>
          ))}
        </div>
      </nav>

      {/* The view being replaced: it leaves first, and the list waits 0.25s
          for it — that hold is what the entrance delay buys. */}
      <div
        className="absolute inset-0 flex items-end p-4 transition-opacity duration-400 ease-out"
        style={{ opacity: view === 'cover' ? 1 : 0 }}
      >
        <div className="h-full w-full rounded-md bg-linear-to-br from-surface to-bg" />
      </div>

      <div className="absolute inset-x-0 bottom-0 top-12 px-4">
        <AsymmetricStagger show={view === 'index'} className="gap-px">
          {ROWS.map((row) => (
            <div
              key={row.id}
              className="flex items-baseline gap-3 border-b border-line py-2.5"
            >
              <span className="meta w-6 text-faint">{row.id}</span>
              <span className="text-sm tracking-tight text-fg">{row.title}</span>
              <span className="meta ml-auto">{row.year}</span>
            </div>
          ))}
        </AsymmetricStagger>
      </div>
    </div>
  );
}
