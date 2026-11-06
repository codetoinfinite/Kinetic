import type { Metadata } from 'next';

import { MANIFEST } from '@/__generated__/manifest';
import { ComponentBrowser } from '@/components/browse/component-browser';
import { CATEGORIES, COSTS } from '@/scripts/schema';
import { site } from '@/site.config';

export const metadata: Metadata = {
  title: 'Components',
  description: `Every ${site.name} component, with a live preview, full source and an agent prompt.`,
  alternates: { canonical: '/components' },
};

/* ==========================================================================
   The catalogue.
   --------------------------------------------------------------------------
   Everything above the toolbar is static and server-rendered; only the toolbar
   and the grid below it are client code.

   The masthead's job is not decoration, it is to state the GPU budget out loud.
   A browser cannot run 119 previews at once, so at any moment most tiles are
   showing a poster instead of the component — and a visitor who has not been
   told that reads a correct page as a half-broken one. Naming the budget is
   what turns the dormant state into engineering rather than into failure.
   ========================================================================== */

const STATS: ReadonlyArray<readonly [string, string]> = [
  ['Components', String(MANIFEST.length)],
  ['Categories', String(CATEGORIES.length)],
  ['Runtime tiers', String(COSTS.length)],
  ['Zero-dependency', String(MANIFEST.filter((entry) => entry.deps.length === 0).length)],
];

export default async function ComponentsPage({
  searchParams,
}: {
  // Next 16: searchParams is a Promise and must be awaited.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  // Both filters are validated against the real option lists — an arbitrary
  // query string must not reach the client as a filter value that matches
  // nothing forever.
  const initialCategory = pick(params['category'], CATEGORIES);
  const initialRuntime = pick(params['runtime'], COSTS);

  return (
    <>
      <header className="wash border-b border-line">
        <div className="mx-auto max-w-[100rem] px-5 pt-14 pb-12 sm:px-8 sm:pt-20 sm:pb-14">
          <p className="meta text-faint">Catalogue</p>

          <h1 className="mt-5 max-w-[44rem] text-display-2 text-fg">
            Every technique in the library, running.
          </h1>

          <p className="mt-6 max-w-2xl text-lead text-muted">
            {MANIFEST.length} techniques across {CATEGORIES.length} categories. Each tile is the
            component itself rather than a recording of it, which is why they take turns: the grid
            runs to a GPU budget, and a tile holds its poster until a slot is worth spending on it.
            Scroll to one, or hover it, and it takes the next slot.
          </p>

          <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-6">
            {STATS.map(([label, value]) => (
              <div key={label}>
                <dt className="meta text-faint">{label}</dt>
                <dd className="mt-2 font-mono text-[1.0625rem] tracking-[-0.02em] text-fg tabular-nums">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <ComponentBrowser
        manifest={MANIFEST}
        initialCategory={initialCategory}
        initialRuntime={initialRuntime}
      />
    </>
  );
}

function pick(raw: string | string[] | undefined, allowed: readonly string[]): string | null {
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  return candidate !== undefined && allowed.includes(candidate) ? candidate : null;
}
