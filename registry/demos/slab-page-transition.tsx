'use client';

import { useState } from 'react';
import {
  SlabPageTransition,
  useSlabNavigation,
} from '@/registry/ui/slab-page-transition';

/* A route table, not a router. The demo holds the current page in local state
   and hands `setIndex` to `navigate` as the commit — the exact shape a real
   `router.push(href)` has, without the dependency. */
const PAGES = [
  {
    label: 'Index',
    eyebrow: 'Studio',
    heading: 'Everything travels the same way.',
    body: 'A slab is not a curtain. It arrives from below, holds long enough to be read, and keeps going.',
    footer: ['Est. 2017', 'Antwerp'],
  },
  {
    label: 'Process',
    eyebrow: 'How',
    heading: 'Four weeks, three reviews, one build.',
    body: 'The page you leave and the page you arrive on move in one direction, so the site reads as a single surface.',
    footer: ['Fixed scope', 'Fixed fee'],
  },
  {
    label: 'Contact',
    eyebrow: 'Enquiries',
    heading: 'Tell us the deadline first.',
    body: 'Then the budget. We will tell you which of the two is the problem.',
    footer: ['Mon — Thu', 'Two week lead'],
  },
] as const;

export default function Demo() {
  const [index, setIndex] = useState(0);
  const nav = useSlabNavigation();

  const page = PAGES[index] ?? PAGES[0];

  const go = (next: number) => {
    if (next === index) return;
    const target = PAGES[next];
    if (!target) return;
    nav.navigate(() => setIndex(next), {
      label: target.label,
      // Going back up the nav sends the slab the other way, so the site has a
      // sense of which direction the visitor is travelling.
      direction: next < index ? 'down' : 'up',
    });
  };

  return (
    <div className="h-full w-full bg-bg">
      <SlabPageTransition
        controller={nav}
        position="absolute"
        zIndex={20}
        color="var(--k-accent)"
        labelClassName="text-xl tracking-tight text-accent-fg sm:text-2xl"
      >
        <div className="flex h-full w-full flex-col">
          <nav className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="meta text-fg">Vantage</span>
            <div className="flex gap-4">
              {PAGES.map((p, i) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => go(i)}
                  className="meta transition-colors hover:text-fg"
                  style={{ color: i === index ? 'var(--k-accent)' : undefined }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </nav>

          <div className="flex flex-1 flex-col justify-between p-4">
            <span className="meta text-accent">{page.eyebrow}</span>
            <div className="flex flex-col gap-2">
              <h2 className="max-w-[20ch] text-2xl leading-[1.05] tracking-tight text-fg sm:text-3xl">
                {page.heading}
              </h2>
              <p className="max-w-[46ch] text-sm text-muted">{page.body}</p>
            </div>
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              {page.footer.map((f) => (
                <span key={f} className="meta">
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      </SlabPageTransition>
    </div>
  );
}
