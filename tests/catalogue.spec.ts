import { expect, test } from '@playwright/test';

import { MANIFEST } from '../__generated__/manifest';
import { collectErrors, resolveTargets } from './helpers';

/* ==========================================================================
   Every component page, in a real browser.
   --------------------------------------------------------------------------
   tests/component-page.spec.ts samples the heaviest component per category —
   seven of 119 — on the theory that the expensive path is the one that breaks.
   That theory has now been falsified once: `cylinder-dot-score` shipped a
   vertex shader that named a variable `active`, which is reserved for future
   use in GLSL ES, so the shader failed to compile and the preview rendered
   nothing. It was not the heaviest component in its category, so nothing ran
   it, and the request-level sweep in registry.spec.ts cannot see a shader that
   only fails once a GPU tries to compile it.

   A console error on a page whose entire job is to run animation code is the
   highest-signal check available, and it is only worth anything if every page
   is checked. Sharded so the workers run them in parallel: the whole sweep
   costs about as much wall-clock as the seven-component sample did.
   ========================================================================== */

const SHARDS = 12;

for (let shard = 0; shard < SHARDS; shard += 1) {
  // Strided rather than chunked, so each shard draws from the whole alphabet
  // and one heavy neighbourhood cannot land entirely in a single worker.
  const slice = MANIFEST.filter((_, index) => index % SHARDS === shard);

  test(`catalogue ${shard + 1}/${SHARDS} · ${slice.length} components render clean`, async ({
    context,
  }) => {
    test.setTimeout(300_000);
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Accumulated rather than thrown on, so one run names every broken
    // component instead of only the first.
    const failures: string[] = [];

    for (const entry of slice) {
      const { slug } = entry;
      const page = await context.newPage();
      const errors = collectErrors(page);

      try {
        const response = await page.goto(`/c/${slug}`, { waitUntil: 'domcontentloaded' });
        if (response?.status() !== 200) {
          failures.push(`${slug}: page returned ${response?.status()}`);
          continue;
        }

        /* -- the preview comes alive ------------------------------------- */
        const host = page.locator(`[data-preview="${slug}"]`);
        try {
          await host.waitFor({ state: 'visible', timeout: 15_000 });
          await page
            .locator(`[data-preview="${slug}"][data-live="true"]`)
            .waitFor({ state: 'attached', timeout: 15_000 });
        } catch {
          const state = await host.getAttribute('data-live').catch(() => null);
          failures.push(`${slug}: preview never went live (data-live=${state})`);
        }

        // Mounting is async — a one-shot count() races the lazy import.
        const demo = host.locator(`[data-demo="${slug}"]`);
        try {
          await demo.waitFor({ state: 'attached', timeout: 15_000 });
          if ((await demo.locator('*').count()) === 0) {
            failures.push(`${slug}: demo mounted but rendered nothing`);
          }
        } catch {
          failures.push(`${slug}: demo subtree never mounted`);
        }

        /* -- the code is all of the code --------------------------------- */
        // One tab per file the user actually installs: no duplicate of a
        // shared hook, and no missing sibling component. `[data-file]` keeps a
        // demo's own tab panels (the `tabs` component has some) out of the count.
        const expectedTargets = await resolveTargets(page.request, slug);
        const panelTargets = (
          await page
            .locator('[role="tabpanel"][data-file]')
            .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-file')))
        ).sort();

        if (JSON.stringify(panelTargets) !== JSON.stringify(expectedTargets)) {
          const duplicates = [
            ...new Set(panelTargets.filter((t, i) => panelTargets.indexOf(t) !== i)),
          ];
          const missing = expectedTargets.filter((t) => !panelTargets.includes(t));
          failures.push(
            `${slug}: ${panelTargets.length} tabs vs ${expectedTargets.length} installed files` +
              (duplicates.length > 0 ? ` [duplicated: ${duplicates.join(', ')}]` : '') +
              (missing.length > 0 ? ` [missing: ${missing.join(', ')}]` : ''),
          );
        }

        const empty = await page
          .locator('[role="tabpanel"][data-file]')
          .evaluateAll((nodes) =>
            nodes
              .filter((node) => (node.textContent ?? '').trim().length < 80)
              .map((node) => node.getAttribute('data-file')),
          );
        if (empty.length > 0) failures.push(`${slug}: empty code panel(s) ${empty.join(', ')}`);

        /* -- the prompt reaches the clipboard ---------------------------- */
        // By `data-copy`, not accessible name: the button relabels itself
        // "Copied" for two seconds and a name-based locator stops matching.
        const copy = page.locator('button[data-copy="Copy prompt"]');
        if ((await copy.count()) !== 1) {
          failures.push(`${slug}: ${await copy.count()} prompt-copy buttons on the page`);
        } else {
          await copy.click();
          try {
            await page
              .locator('button[data-copy="Copy prompt"][data-copy-state="copied"]')
              .waitFor({ state: 'attached', timeout: 5_000 });
            const text = await page.evaluate(() => navigator.clipboard.readText());
            if (!text.startsWith(`# Build: ${entry.title}`)) {
              failures.push(`${slug}: clipboard did not receive this component's prompt`);
            }
          } catch {
            const state = await copy.getAttribute('data-copy-state').catch(() => null);
            failures.push(`${slug}: prompt copy stuck at data-copy-state=${state}`);
          }
        }

        if (errors.length > 0) failures.push(`${slug}: ${errors.join(' | ')}`);
      } finally {
        await page.close();
      }
    }

    expect(failures, `${failures.length} broken component(s):\n${failures.join('\n')}`).toEqual([]);
  });
}
