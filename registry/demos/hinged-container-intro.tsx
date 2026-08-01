'use client';

import { useState } from 'react';
import { HingedContainerIntro } from '@/registry/ui/hinged-container-intro';

/* Two fake routes standing in for real navigations. In an App Router app the
   nav is <Link> and `routeKey` is `usePathname()`; here it is local state so
   the whole thing runs inside the preview box. */
const ROUTES = [
  {
    key: 'field-notes',
    label: 'Field Notes',
    index: '001',
    title: 'A studio that ships',
    detail: ['Editorial', 'Berlin', '2026'],
  },
  {
    key: 'archive',
    label: 'Archive',
    index: '002',
    title: 'Everything since 2019',
    detail: ['Selected work', 'Remote', '84 entries'],
  },
] as const;

export default function Demo() {
  const [routeKey, setRouteKey] = useState<string>('field-notes');
  const route = ROUTES.find((r) => r.key === routeKey) ?? ROUTES[0];

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-bg">
      <nav className="flex shrink-0 items-center gap-5 border-b border-line px-4 py-3">
        <span className="meta text-fg">Studio</span>
        <div className="ml-auto flex gap-4">
          {ROUTES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRouteKey(r.key)}
              className={
                r.key === routeKey
                  ? 'meta text-accent'
                  : 'meta transition-colors hover:text-fg'
              }
            >
              {r.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="min-h-0 flex-1 p-4">
        <HingedContainerIntro routeKey={route.key}>
          <article className="flex h-full w-full flex-col justify-end gap-3 rounded-md border border-line bg-linear-to-br from-surface to-bg p-5">
            <span className="meta text-accent">{route.index}</span>
            <h2 className="max-w-[18ch] text-2xl leading-[1.05] tracking-tight text-fg">
              {route.title}
            </h2>
            <div className="flex flex-wrap gap-x-5 gap-y-1">
              {route.detail.map((d) => (
                <span key={d} data-hinge-detail className="meta">
                  {d}
                </span>
              ))}
            </div>
          </article>
        </HingedContainerIntro>
      </div>
    </div>
  );
}
