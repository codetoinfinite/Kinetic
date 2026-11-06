'use client';

import { Kbd } from '@/registry/ui/kbd';

/* Shortcut hints where they live: a quick-search row like the dashboard
   sidebar's, a cheat sheet of chords and sequences, and one inline in copy. */
const SHORTCUTS = [
  { action: 'Quick search', keys: ['⌘K'] },
  { action: 'New ticket', keys: ['C'] },
  { action: 'Go to inbox', keys: ['G', 'I'] },
  { action: 'Toggle sidebar', keys: ['⌘['] },
  { action: 'Close panel', keys: ['Esc'] },
];

export default function Demo() {
  return (
    <div className="flex w-full max-w-[320px] flex-col gap-4">
      <div className="flex h-9 w-full items-center justify-between gap-2 rounded-full bg-background-tertiary-default px-3">
        <span className="text-body-medium text-text-secondary">Quick Search</span>
        <Kbd>⌘L</Kbd>
      </div>

      <section
        aria-labelledby="kbd-demo-title"
        className="flex flex-col gap-1 rounded-xl border border-border-button-default bg-background-primary-default p-2"
      >
        <h3 id="kbd-demo-title" className="px-2 pt-1 pb-1.5 text-caption-1-semibold text-text-tertiary">
          Keyboard shortcuts
        </h3>
        <ul className="flex flex-col">
          {SHORTCUTS.map((row) => (
            <li
              key={row.action}
              className="flex h-8 items-center justify-between rounded-lg px-2 text-body-medium text-text-primary"
            >
              <span>{row.action}</span>
              <span className="flex items-center gap-1 text-caption-1-medium text-text-tertiary">
                {row.keys.map((key, index) => (
                  <span key={key} className="flex items-center gap-1">
                    {index > 0 ? <span aria-hidden>then</span> : null}
                    <Kbd>{key}</Kbd>
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-body-medium text-text-secondary">
        Press <Kbd>Esc</Kbd> to dismiss any panel without saving.
      </p>
    </div>
  );
}
