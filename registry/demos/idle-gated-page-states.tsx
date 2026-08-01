'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import {
  IdleGatedPageStates,
  useIdlePageStates,
} from '@/registry/ui/idle-gated-page-states';

/* A route table, not a router. The demo holds the current page in local state
   and hands `setRoute` to `leave` as the commit — the exact shape a real
   `router.push(href)` has, without the dependency. */
const PAGES = [
  {
    label: 'Index',
    eyebrow: 'Foundations',
    heading: 'The entrance waits for the thread, not the clock.',
    body: 'A floor delay and an idle callback both have to finish before the first element moves. Whichever is slower is the one that decides.',
    footer: ['Since 2016', 'Copenhagen'],
  },
  {
    label: 'Studio',
    eyebrow: 'Practice',
    heading: 'Eleven people, one room, no account managers.',
    body: 'Hydration, font swap and image decode all land in the same few hundred milliseconds. Nothing of ours is scheduled inside them.',
    footer: ['11 people', 'One room'],
  },
  {
    label: 'Journal',
    eyebrow: 'Writing',
    heading: 'Notes on making pages that arrive calmly.',
    body: 'The gate is invisible when it works. You only ever notice the version without it, where three lines arrive and the rest snap.',
    footer: ['24 entries', 'Monthly'],
  },
] as const;

export default function Demo() {
  const [route, setRoute] = useState(0);

  // Shorter than the shipped defaults because the preview frame is small and
  // the visitor is already looking at it — a real first load pays 0.8 s.
  const states = useIdlePageStates({ preloadDelay: 0.55, routeDelay: 0.12 });
  const { state, ready, leave } = states;

  const page = PAGES[route] ?? PAGES[0];
  const loading = state === 'preload' || state === 'gating';

  // The real signal a preload is finished. `document.fonts.ready` resolves once
  // every face used on the page has loaded or failed, which is the moment text
  // measurements stop moving.
  useEffect(() => {
    let live = true;
    const done = () => {
      if (live) ready();
    };
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(done, done);
    } else {
      done();
    }
    return () => {
      live = false;
    };
  }, [ready]);

  const go = (next: number) => {
    if (next === route || state === 'leaving') return;
    leave(() => setRoute(next));
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <IdleGatedPageStates
        controller={states}
        pageKey={String(route)}
        className="flex h-full w-full flex-col"
      >
        <nav className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="meta text-fg">Meridian Works</span>
          <div className="flex gap-4">
            {PAGES.map((p, i) => (
              <button
                key={p.label}
                type="button"
                onClick={() => go(i)}
                className="meta transition-colors hover:text-fg"
                style={{ color: i === route ? 'var(--k-accent)' : undefined }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="flex flex-1 flex-col justify-between p-4">
          <span data-page-enter className="meta text-accent">
            {page.eyebrow}
          </span>
          <div className="flex flex-col gap-2">
            <h2
              data-page-enter
              className="max-w-[20ch] text-2xl leading-[1.05] tracking-tight text-fg sm:text-3xl"
            >
              {page.heading}
            </h2>
            <p data-page-enter className="max-w-[46ch] text-sm text-muted">
              {page.body}
            </p>
          </div>
          <div
            data-page-enter
            className="flex items-baseline justify-between border-t border-line pt-3"
          >
            {page.footer.map((f) => (
              <span key={f} className="meta">
                {f}
              </span>
            ))}
          </div>
        </div>
      </IdleGatedPageStates>

      {/* The preloader stays up for the whole gate, not just the load. That is
          the point: the wait is dead time only if you show the visitor an empty
          page during it. */}
      <div
        aria-hidden
        className={cn(
          'absolute inset-0 z-10 flex flex-col justify-end bg-bg p-4 transition-opacity duration-500',
          loading ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <div className="flex items-baseline justify-between">
          <span className="meta text-fg">Meridian Works</span>
          <span className="meta text-faint">Est. Copenhagen</span>
        </div>
        <div className="mt-3 h-px w-full bg-line-strong">
          <div className="h-px w-1/3 animate-pulse bg-accent motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  );
}
