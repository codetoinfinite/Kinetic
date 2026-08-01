import type { APIRequestContext, Page } from '@playwright/test';

import { MANIFEST, type ManifestEntry } from '../__generated__/manifest';

/**
 * One component per category, the most expensive one in that category, for the
 * deep per-page assertions in component-page.spec.ts — the ones worth making
 * in detail but not worth making 119 times.
 *
 * This is a sample, not coverage. Every page is swept in a real browser by
 * catalogue.spec.ts; the earlier reasoning here was that a full browser sweep
 * would be too slow to run, and the cost of that was a component shipping with
 * a shader that never compiled.
 */
const COST_WEIGHT: Record<ManifestEntry['cost'], number> = {
  webgl: 3,
  canvas2d: 2,
  dom: 1,
  css: 0,
};

export function sample(): ManifestEntry[] {
  const heaviest = new Map<string, ManifestEntry>();

  // Sorted first so the sample is identical on every machine and every run —
  // a flaky test is bad, a flaky *test selection* is worse.
  for (const entry of [...MANIFEST].sort((a, b) => a.slug.localeCompare(b.slug))) {
    const incumbent = heaviest.get(entry.category);
    if (incumbent === undefined || COST_WEIGHT[entry.cost] > COST_WEIGHT[incumbent.cost]) {
      heaviest.set(entry.category, entry);
    }
  }

  return [...heaviest.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

export function firstOfCost(cost: ManifestEntry['cost']): ManifestEntry | undefined {
  return [...MANIFEST].sort((a, b) => a.slug.localeCompare(b.slug)).find((e) => e.cost === cost);
}

/**
 * Console output that is not a defect.
 *
 * Deliberately short. A console error on a page whose entire job is to run
 * animation code is the highest-signal smoke check available, so the bar for
 * adding a pattern here is "this is the environment talking, not our code".
 */
const IGNORED = [
  // `forceContextLoss()` on cleanup is how a WebGL preview releases its
  // context back to the budget. Chromium and three.js both log it.
  /context\s*lost/i,
  /CONTEXT_LOST_WEBGL/i,
  // A headless runner with no GPU falls back to SwiftShader, or to nothing.
  // Either way the error boundary shows the poster; that is a machine
  // property, not a regression.
  /software WebGL/i,
  /Unable to (?:create|initialize) WebGL/i,
  /WebGL is not supported/i,
  /React DevTools/i,
];

/**
 * Attach before `goto`. Returns a live array — read it at the end of the test.
 */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];

  page.on('pageerror', (error) => {
    errors.push(`pageerror: ${error.message}`);
  });

  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (IGNORED.some((pattern) => pattern.test(text))) return;
    errors.push(`console: ${text}`);
  });

  return errors;
}

export interface RegistryItem {
  $schema: string;
  name: string;
  type: string;
  title: string;
  description: string;
  dependencies: string[];
  /** Absent on the great majority of items — only emitted when one is needed. */
  devDependencies?: string[];
  registryDependencies: string[];
  files: { path: string; target: string; type: string; content: string }[];
  categories: string[];
  meta: Record<string, unknown>;
}

/**
 * Every file a user ends up with after installing `slug` — its own files plus
 * those of everything it pulls in, transitively.
 *
 * A registry item lists only the files it owns and delegates the rest to
 * `registryDependencies`, so its `files.length` is smaller than what the
 * component page shows, by design: the page shows the hooks and helpers the
 * code imports, because a component whose `useRaf` is missing is not "the
 * complete code". Walking the graph is what makes the two comparable.
 */
export async function resolveTargets(
  request: APIRequestContext,
  slug: string,
): Promise<string[]> {
  const visited = new Set<string>();
  const targets = new Set<string>();
  const queue: string[] = [slug];

  while (queue.length > 0) {
    const next = queue.pop();
    if (next === undefined || visited.has(next)) continue;
    visited.add(next);

    const response = await request.get(`/r/${next}.json`);
    if (!response.ok()) {
      throw new Error(`/r/${next}.json returned ${response.status()} (reached from ${slug})`);
    }
    const item = (await response.json()) as RegistryItem;

    for (const file of item.files) targets.add(file.target);

    // The emitted JSON carries absolute URLs — a bare name there would resolve
    // against shadcn's own registry rather than this one.
    for (const url of item.registryDependencies) {
      const dep = url.split('/').pop()?.replace(/\.json$/, '');
      if (dep !== undefined && dep.length > 0) queue.push(dep);
    }
  }

  return [...targets].sort();
}
