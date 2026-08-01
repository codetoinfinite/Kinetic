'use client';

import { useState } from 'react';
import { PageRevealOverlay, usePageCover } from '@/registry/ui/page-reveal-overlay';

/* A route table, not a router. The demo owns the current page in local state
   and hands `setRoute` to `cover` as the commit — exactly the shape a real
   `router.push(href)` has, without the dependency. */
const ROUTES = [
  {
    id: 'index',
    label: 'Index',
    eyebrow: 'Studio',
    title: 'We build the parts of a site nobody notices.',
    meta: ['Est. 2019', 'Rotterdam'],
  },
  {
    id: 'work',
    label: 'Work',
    eyebrow: 'Selected',
    title: 'Fourteen projects, three of which we can talk about.',
    meta: ['2019 — 2025', '14 projects'],
  },
  {
    id: 'contact',
    label: 'Contact',
    eyebrow: 'Enquiries',
    title: 'Say what you need. We will say whether we can.',
    meta: ['Mon — Thu', 'Two week lead'],
  },
] as const;

export default function Demo() {
  const [route, setRoute] = useState<string>('index');
  const { covering, cover } = usePageCover();

  const current = ROUTES.find((r) => r.id === route) ?? ROUTES[0];

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <nav className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="meta text-fg">Field Office</span>
        <div className="flex gap-4">
          {ROUTES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => cover(() => setRoute(r.id))}
              className="meta transition-colors hover:text-fg"
              style={{ color: r.id === route ? 'var(--k-accent)' : undefined }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="flex h-[calc(100%-3rem)] flex-col justify-between p-4">
        <span className="meta text-accent">{current.eyebrow}</span>
        <h2 className="max-w-[18ch] text-2xl leading-[1.05] tracking-tight text-fg sm:text-3xl">
          {current.title}
        </h2>
        <div className="flex items-baseline justify-between border-t border-line pt-3">
          {current.meta.map((m) => (
            <span key={m} className="meta">
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* `revealKey` is the route id here and `usePathname()` in a real app —
          the component cannot tell the difference. */}
      <PageRevealOverlay
        revealKey={route}
        covering={covering}
        position="absolute"
        zIndex={20}
        color="var(--k-bg)"
      />
    </div>
  );
}
