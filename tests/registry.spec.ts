import { expect, test } from '@playwright/test';

import { MANIFEST } from '../__generated__/manifest';
import type { RegistryItem } from './helpers';

/* ==========================================================================
   Whole-catalogue coverage, at the request level.
   --------------------------------------------------------------------------
   `npx shadcn add <url>` is the primary way anyone consumes this site, and it
   never opens a browser: it fetches one JSON file, then fetches every URL in
   that file's `registryDependencies`. A broken cross-item URL is invisible on
   the page and fatal at install time, so it gets checked here for every item
   rather than for a sample.

   Failures accumulate into a list instead of throwing on the first one — with
   119 items, "the third one is broken" is far less useful than "these six are".
   ========================================================================== */

test.describe('registry', () => {
  test.describe.configure({ timeout: 180_000 });

  test('every component has a page, a registry item and a prompt', async ({ request }) => {
    const failures: string[] = [];
    /** url -> the item that pointed at it, for a useful failure message. */
    const crossReferences = new Map<string, string>();

    for (const entry of MANIFEST) {
      const { slug } = entry;

      const page = await request.get(`/c/${slug}`);
      if (!page.ok()) {
        failures.push(`${slug}: GET /c/${slug} returned ${page.status()}`);
      }

      const itemResponse = await request.get(`/r/${slug}.json`);
      if (!itemResponse.ok()) {
        failures.push(`${slug}: GET /r/${slug}.json returned ${itemResponse.status()}`);
      } else {
        const item = (await itemResponse.json()) as RegistryItem;

        if (item.name !== slug) failures.push(`${slug}: item name is "${item.name}"`);
        if (!item.type.startsWith('registry:')) failures.push(`${slug}: type "${item.type}"`);
        if (item.title.trim().length === 0) failures.push(`${slug}: empty title`);
        if (item.description.trim().length === 0) failures.push(`${slug}: empty description`);
        if (!Array.isArray(item.files) || item.files.length === 0) {
          failures.push(`${slug}: ships no files`);
        }

        for (const file of item.files ?? []) {
          if (!file.path.startsWith('registry/')) {
            failures.push(`${slug}: file path "${file.path}" is outside registry/`);
          }
          if (file.target.trim().length === 0) {
            failures.push(`${slug}: file ${file.path} has no install target`);
          }
          if (file.content.trim().length === 0) {
            failures.push(`${slug}: file ${file.path} was emitted empty`);
          }
        }

        // An unpinned dependency installs whatever is latest at install time,
        // which for three.js has meant a breaking change roughly every month.
        for (const dependency of item.dependencies ?? []) {
          if (!dependency.includes('@', 1)) {
            failures.push(`${slug}: dependency "${dependency}" has no version range`);
          }
        }

        // three ships no type declarations of its own, so an item that pulls it
        // in without `@types/three` installs cleanly and then fails to compile
        // on its first import in any strict TypeScript project — a failure the
        // page cannot show and only a real install surfaces.
        const needsThreeTypes = (item.dependencies ?? []).some(
          (dependency) => dependency === 'three' || dependency.startsWith('three@'),
        );
        const hasThreeTypes = (item.devDependencies ?? []).some((dependency) =>
          dependency.startsWith('@types/three@'),
        );
        if (needsThreeTypes && !hasThreeTypes) {
          failures.push(`${slug}: depends on three but ships no pinned @types/three`);
        }

        for (const dependency of item.devDependencies ?? []) {
          if (!dependency.includes('@', 1)) {
            failures.push(`${slug}: devDependency "${dependency}" has no version range`);
          }
        }

        for (const reference of item.registryDependencies ?? []) {
          if (!reference.startsWith('http')) {
            // A bare name resolves against shadcn's registry, not ours — it
            // would install someone else's component, or nothing.
            failures.push(`${slug}: registryDependency "${reference}" is not an absolute URL`);
            continue;
          }
          if (!crossReferences.has(reference)) crossReferences.set(reference, slug);
        }
      }

      const prompt = await request.get(`/prompts/${slug}.md`);
      if (!prompt.ok()) {
        failures.push(`${slug}: GET /prompts/${slug}.md returned ${prompt.status()}`);
      } else {
        const body = await prompt.text();
        if (!body.startsWith('# Build: ')) {
          failures.push(`${slug}: prompt does not open with "# Build: "`);
        }
        if (body.length < 400) {
          failures.push(`${slug}: prompt is only ${body.length} chars`);
        }
      }
    }

    /* The URLs are absolute and built from `SITE_URL` at build time, so they
       point at production, not at this server. Fetching them verbatim would
       make the suite depend on the deployed site being up — and on a machine
       that has never set `SITE_URL`, on a domain that does not resolve at all.
       So: assert the origin is uniform (a half-rebranded build shows up as two
       origins, which is the real failure worth catching) and then re-point the
       path at whatever host the run is actually testing. */
    const origins = new Set([...crossReferences.keys()].map((url) => new URL(url).origin));
    if (origins.size > 1) {
      failures.push(`registryDependencies span ${origins.size} origins: ${[...origins].join(', ')}`);
    }

    for (const [url, from] of crossReferences) {
      const response = await request.get(new URL(url).pathname);
      if (!response.ok()) {
        failures.push(`${from}: registryDependency ${url} returned ${response.status()}`);
        continue;
      }
      const shared = (await response.json()) as RegistryItem;
      const expectedName = url.split('/').pop()?.replace(/\.json$/, '');
      if (shared.name !== expectedName) {
        failures.push(`${from}: ${url} serves an item named "${shared.name}"`);
      }
      for (const file of shared.files ?? []) {
        if (file.content.trim().length === 0) {
          failures.push(`${from}: shared file ${file.path} in ${url} is empty`);
        }
      }
    }

    expect(failures, `${failures.length} registry problem(s):\n${failures.join('\n')}`).toEqual([]);
  });

  test('llms.txt lists every component', async ({ request }) => {
    const response = await request.get('/llms.txt');
    expect(response.ok()).toBeTruthy();

    const body = await response.text();
    const missing = MANIFEST.filter((entry) => !body.includes(`/c/${entry.slug}`)).map(
      (entry) => entry.slug,
    );

    expect(missing, `missing from llms.txt: ${missing.join(', ')}`).toEqual([]);
  });

  test('llms-full.txt carries the prompt bodies', async ({ request }) => {
    const response = await request.get('/llms-full.txt');
    expect(response.ok()).toBeTruthy();

    const body = await response.text();
    // The file is the prompts concatenated, each opening with its own
    // "# Build: <title>" line — that is the whole point of the -full variant.
    const missing = MANIFEST.filter((entry) => !body.includes(`# Build: ${entry.title}`)).map(
      (entry) => entry.slug,
    );

    expect(missing, `missing from llms-full.txt: ${missing.join(', ')}`).toEqual([]);
  });
});
