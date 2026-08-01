'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import {
  CanvasHandoffSlot,
  CanvasHandoffTransition,
  useCanvasHandoff,
} from '@/registry/ui/canvas-handoff-transition';

/* A studio site whose one WebGL surface appears in a different shape on every
   page: a wide banner on the index, a tall column on the work page, a small
   mark on the contact page. Nothing here navigates — the "route" is a piece of
   local state — but the handoff API is used exactly as it would be against a
   router: `handoff(slotId, () => router.push(href))`. */

const PAGES = [
  { id: 'index', label: 'Index', slot: 'index-hero' },
  { id: 'work', label: 'Work', slot: 'work-panel' },
  { id: 'contact', label: 'Contact', slot: 'contact-mark' },
] as const;

const PROJECTS = [
  { year: '2025', name: 'Rijnhaven Atlas' },
  { year: '2024', name: 'Vellum Quarterly' },
  { year: '2024', name: 'Northbank Ferries' },
  { year: '2023', name: 'Pica Type Foundry' },
] as const;

export default function Demo() {
  const [route, setRoute] = useState<(typeof PAGES)[number]['id']>('index');
  const field = useCanvasHandoff('index-hero');

  const page = PAGES.find((p) => p.id === route) ?? PAGES[0];

  const go = (next: (typeof PAGES)[number]) => {
    if (next.id === route) return;
    field.handoff(next.slot, () => setRoute(next.id));
  };

  return (
    <CanvasHandoffTransition
      controller={field}
      className="h-full w-full overflow-hidden bg-bg text-fg"
    >
      <div className="flex h-full w-full flex-col gap-4 p-4 sm:gap-5 sm:p-6">
        <header className="relative z-10 flex shrink-0 items-baseline justify-between gap-4">
          <span className="text-sm font-medium tracking-tight sm:text-base">Field Office</span>
          <nav className="flex gap-3 sm:gap-4">
            {PAGES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => go(p)}
                aria-current={p.id === route ? 'page' : undefined}
                className={cn(
                  'meta transition-colors',
                  p.id === route ? 'text-accent' : 'text-muted hover:text-fg',
                )}
              >
                {p.label}
              </button>
            ))}
          </nav>
        </header>

        <main className="relative min-h-0 flex-1">
          {page.id === 'index' ? (
            <div className="flex h-full flex-col gap-4">
              <CanvasHandoffSlot
                controller={field}
                id="index-hero"
                className="min-h-0 flex-1 border border-line"
              />
              <div className="relative z-10 shrink-0">
                <h2 className="text-balance text-xl leading-tight tracking-tight sm:text-2xl">
                  Ordered dither for people who still print things.
                </h2>
                <p className="mt-1 max-w-[52ch] text-sm text-muted">
                  A four-person studio in Rotterdam. We make identities that survive being
                  photocopied.
                </p>
              </div>
            </div>
          ) : null}

          {page.id === 'work' ? (
            <div className="flex h-full gap-4">
              <div className="relative z-10 flex min-w-0 flex-1 flex-col">
                <span className="meta text-faint">Selected — 12 of 38</span>
                <ul className="mt-2 flex flex-col">
                  {PROJECTS.map((project) => (
                    <li
                      key={project.name}
                      className="flex items-baseline justify-between gap-3 border-b border-line py-2"
                    >
                      <span className="truncate text-sm tracking-tight">{project.name}</span>
                      <span className="meta shrink-0 text-faint">{project.year}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-auto pt-3 text-sm text-muted">
                  Everything above shares one press check and one colour budget.
                </p>
              </div>
              <CanvasHandoffSlot
                controller={field}
                id="work-panel"
                className="h-full w-[38%] shrink-0 border border-line"
              />
            </div>
          ) : null}

          {page.id === 'contact' ? (
            <div className="flex h-full flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <p className="relative z-10 max-w-[46ch] text-sm leading-relaxed text-muted">
                  We take on four projects a year and finish all four. Briefs open in January and
                  August; the rest of the time we are on press or asleep.
                </p>
                <CanvasHandoffSlot
                  controller={field}
                  id="contact-mark"
                  className="size-20 shrink-0 border border-line sm:size-28"
                />
              </div>
              <dl className="relative z-10 mt-auto grid grid-cols-1 gap-x-6 gap-y-2 border-t border-line pt-3 sm:grid-cols-3">
                <div>
                  <dt className="meta text-faint">Studio</dt>
                  <dd className="text-sm">Goudsesingel 214, Rotterdam</dd>
                </div>
                <div>
                  <dt className="meta text-faint">New work</dt>
                  <dd className="text-sm">briefs@fieldoffice.example</dd>
                </div>
                <div>
                  <dt className="meta text-faint">Everything else</dt>
                  <dd className="text-sm">+31 10 000 0000</dd>
                </div>
              </dl>
            </div>
          ) : null}
        </main>

        <footer className="relative z-10 flex shrink-0 items-baseline justify-between gap-4 border-t border-line pt-3">
          <span className="meta text-faint">One context, three shapes</span>
          <span className="meta text-faint">{page.label}</span>
        </footer>
      </div>
    </CanvasHandoffTransition>
  );
}
