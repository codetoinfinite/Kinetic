'use client';

import { useState } from 'react';
import { HoverPrefetchWipe } from '@/registry/ui/hover-prefetch-wipe';

const PAGES = [
  {
    href: '/work',
    label: 'Work',
    title: 'Selected Work',
    lede: 'Nine projects, four of which shipped.',
    rows: [
      ['Northfield Press', 'Identity'],
      ['Room For One Idea', 'Exhibition'],
      ['Half Measures', 'Packaging'],
    ],
  },
  {
    href: '/studio',
    label: 'Studio',
    title: 'Two Rooms, One Kettle',
    lede: 'Founded 2019. Still arguing about kerning.',
    rows: [
      ['Practice', 'Print and screen'],
      ['Size', 'Four people'],
      ['Location', 'Bristol, UK'],
    ],
  },
  {
    href: '/contact',
    label: 'Contact',
    title: 'Say Something',
    lede: 'Briefs, budgets, and the occasional postcard.',
    rows: [
      ['General', 'hello@example.com'],
      ['New work', 'work@example.com'],
      ['Post', '12 Colston Yard'],
    ],
  },
] as const;

/**
 * Module scope, mirroring the component's own prefetch memory: a warmed href
 * stays warmed across remounts, so re-opening this demo shows the same ticks
 * the browser cache would still be honouring.
 */
const warmed = new Set<string>();

export default function Demo() {
  const [route, setRoute] = useState<string>('/work');
  const [hinted, setHinted] = useState<ReadonlySet<string>>(() => new Set(warmed));

  const page = PAGES.find((p) => p.href === route) ?? PAGES[0];

  return (
    <HoverPrefetchWipe
      // A fake router: the callback is the whole framework boundary, so this
      // same component works under Next.js, React Router or nothing at all.
      onNavigate={(href) => setRoute(href)}
      // Stands in for `router.prefetch`. Recorded rather than fetched, so the
      // hover half is visible without a network tab open.
      onPrefetch={(href) => {
        warmed.add(href);
        setHinted(new Set(warmed));
      }}
      // A change retracts the wipe. `usePathname()` in a real app.
      pageKey={route}
      position="absolute"
      color="var(--k-fg)"
      duration={0.4}
      zIndex={20}
      className="flex h-full w-full flex-col overflow-hidden bg-bg"
    >
      <nav className="flex items-center gap-1 border-b border-line px-4 py-3">
        <span className="mr-auto text-sm tracking-tight text-fg">Bell &amp; Yard</span>
        {PAGES.map((p) => {
          const active = p.href === route;
          return (
            <a
              key={p.href}
              href={p.href}
              aria-current={active ? 'page' : undefined}
              className={
                active
                  ? 'meta rounded-full border border-line-strong px-2.5 py-1 text-fg'
                  : 'meta rounded-full border border-transparent px-2.5 py-1 text-muted transition-colors hover:border-line hover:text-fg'
              }
            >
              {p.label}
              {/* Lit once the href has been hinted. */}
              <span
                aria-hidden
                className={
                  hinted.has(p.href)
                    ? 'ml-1.5 inline-block h-1 w-1 rounded-full bg-accent align-middle'
                    : 'ml-1.5 inline-block h-1 w-1 rounded-full bg-line align-middle'
                }
              />
            </a>
          );
        })}
      </nav>

      <div className="min-h-0 flex-1 overflow-hidden px-4 py-5">
        <h3 className="text-xl leading-tight tracking-tight text-fg sm:text-2xl">{page.title}</h3>
        <p className="mt-1 text-sm text-muted">{page.lede}</p>
        <dl className="mt-4 border-t border-line">
          {page.rows.map(([term, detail]) => (
            <div key={term} className="flex justify-between gap-4 border-b border-line py-2">
              <dt className="text-sm text-fg">{term}</dt>
              <dd className="meta">{detail}</dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="meta border-t border-line px-4 py-2">
        {hinted.size === 0
          ? 'Hover a nav item to warm it, then click.'
          : `Prefetched: ${[...hinted].join('  ')}`}
      </p>
    </HoverPrefetchWipe>
  );
}
