'use client';

import { NavDotWave } from '@/registry/ui/nav-dot-wave';

const ITEMS = [
  { label: 'Index' },
  { label: 'Works' },
  { label: 'Studio' },
  { label: 'Journal' },
  { label: 'Contact' },
];

export default function Demo() {
  return (
    <div className="flex h-full w-full flex-col justify-between p-5">
      <header className="flex items-center justify-between gap-6 border-b border-line pb-4">
        <span className="font-mono text-[0.6875rem] uppercase tracking-[0.24em] text-fg">
          Atelier Vance
        </span>
        <NavDotWave items={ITEMS} activeIndex={1} />
      </header>

      <div className="py-6">
        <p className="max-w-[24ch] text-2xl leading-tight tracking-tight text-fg">
          Selected works, 2019 to now.
        </p>
        <p className="mt-2 max-w-[38ch] text-xs leading-relaxed text-muted">
          The dot beside the current section holds steady while the rest breathe in sequence.
        </p>
      </div>

      <footer className="flex items-center justify-between gap-6 border-t border-line pt-4">
        <NavDotWave items={ITEMS} activeIndex={1} reverse staggerMs={90} size={4} />
        <span className="font-mono text-[0.625rem] tracking-[0.16em] text-faint">© 2026</span>
      </footer>
    </div>
  );
}
