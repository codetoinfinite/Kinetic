import { expect, test } from '@playwright/test';

import { collectErrors, firstOfCost, resolveTargets, sample } from './helpers';

/* ==========================================================================
   The three promises of a component page, asserted on the heaviest component
   in each category:

     1. the preview actually comes alive (not just the poster)
     2. the code is all there — one tab per file the registry ships
     3. the prompt on the page, the prompt on the clipboard and the prompt in
        the downloadable .md are the same text

   Anything less and the page looks right while shipping nothing.
   ========================================================================== */

for (const entry of sample()) {
  test.describe(`${entry.category} · ${entry.slug}`, () => {
    test('preview, code and prompt all deliver', async ({ page, context }) => {
      // Reading the clipboard back is the only way to prove the copy button
      // hands over the real prompt rather than an empty string.
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      const errors = collectErrors(page);

      await page.goto(`/c/${entry.slug}`);
      await expect(page.getByRole('heading', { level: 1, name: entry.title })).toBeVisible();

      /* -- 1. preview ---------------------------------------------------- */
      const host = page.locator(`[data-preview="${entry.slug}"]`);
      await expect(host).toBeVisible();
      // A focused detail-page preview outranks everything, so the budget must
      // grant it a slot. `data-live="false"` here means the claim never
      // resolved — the preview would sit on its poster forever.
      await expect(host).toHaveAttribute('data-live', 'true');
      const demo = host.locator(`[data-demo="${entry.slug}"]`);
      await expect(demo).toBeAttached();
      // The demo subtree rendered something of its own, rather than mounting
      // and returning null.
      expect(await demo.locator('*').count()).toBeGreaterThan(0);

      /* -- 2. code ------------------------------------------------------- */
      // Against the resolved dependency graph, not just the item's own files:
      // the page ships the hooks and helpers the component imports, and a page
      // that showed only the two files the item happens to own would be
      // missing most of the code needed to run it.
      const expectedTargets = await resolveTargets(page.request, entry.slug);
      expect(expectedTargets.length).toBeGreaterThan(0);

      const tabs = page.getByRole('tab');
      await expect(tabs).toHaveCount(expectedTargets.length);

      const panelTargets = await page
        .locator('[role="tabpanel"]')
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-file')));
      expect([...panelTargets].sort()).toEqual(expectedTargets);

      // Every tab shows highlighted source, not an empty panel. Panels are
      // matched positionally rather than by `#id`: React's useId values are not
      // valid CSS identifiers.
      const panels = page.locator('[role="tabpanel"]');
      for (let index = 0; index < expectedTargets.length; index += 1) {
        const tab = tabs.nth(index);
        await tab.click();
        await expect(tab).toHaveAttribute('aria-selected', 'true');

        const panel = panels.nth(index);
        await expect(panel).toBeVisible();
        expect(await panel.getAttribute('aria-labelledby')).toBe(await tab.getAttribute('id'));
        expect((await panel.innerText()).trim().length).toBeGreaterThan(80);
      }

      /* -- 3. prompt ----------------------------------------------------- */
      // Found by `data-copy`, not by accessible name: the button relabels
      // itself "Copied" for two seconds, so a name-based locator stops
      // matching at exactly the moment the assertion needs it.
      const copyPrompt = page.locator('button[data-copy="Copy prompt"]');
      await copyPrompt.click();
      await expect(copyPrompt).toHaveAttribute('data-copy-state', 'copied');

      const copied = await page.evaluate(() => navigator.clipboard.readText());
      expect(copied.startsWith(`# Build: ${entry.title}`)).toBeTruthy();

      const markdown = await page.request.get(`/prompts/${entry.slug}.md`);
      expect(markdown.ok()).toBeTruthy();
      expect((await markdown.text()).trim()).toBe(copied.trim());

      /* -- install ------------------------------------------------------- */
      // The command has to carry an absolute URL: a bare name resolves against
      // shadcn's own registry, so a relative path would install someone else's
      // component or nothing at all.
      const copyInstall = page.locator('[data-install] button[data-copy="Copy"]');
      await copyInstall.click();
      await expect(copyInstall).toHaveAttribute('data-copy-state', 'copied');
      const command = await page.evaluate(() => navigator.clipboard.readText());
      expect(command).toMatch(
        new RegExp(`^npx shadcn@latest add https?://[^\\s]+/r/${entry.slug}\\.json$`),
      );

      expect(errors, errors.join('\n')).toEqual([]);
    });

    test('standalone preview route runs the same demo', async ({ page }) => {
      const errors = collectErrors(page);

      await page.goto(`/preview/${entry.slug}`);
      const host = page.locator(`[data-preview="${entry.slug}"]`);
      await expect(host).toHaveAttribute('data-live', 'true');
      await expect(host.locator(`[data-demo="${entry.slug}"]`)).toBeAttached();

      expect(errors, errors.join('\n')).toEqual([]);
    });
  });
}

/* --------------------------------------------------------------------------
   Reduced motion is a per-component contract: each one reads the query itself
   and is expected to render its end state rather than skip rendering. The
   WebGL component is the interesting case, because "do nothing" there means a
   blank canvas.
   -------------------------------------------------------------------------- */
test.describe('prefers-reduced-motion', () => {
  // Playwright 1.62 exposes `reducedMotion` only through `contextOptions`, not
  // as a top-level test option.
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  const webgl = firstOfCost('webgl');

  test('the heaviest component still renders its end state', async ({ page }) => {
    test.skip(webgl === undefined, 'no webgl component in the catalogue yet');
    if (webgl === undefined) return;

    const errors = collectErrors(page);

    await page.goto(`/c/${webgl.slug}`);
    const host = page.locator(`[data-preview="${webgl.slug}"]`);
    await expect(host).toHaveAttribute('data-live', 'true');
    await expect(host.locator(`[data-demo="${webgl.slug}"]`)).toBeAttached();

    expect(errors, errors.join('\n')).toEqual([]);
  });
});

/* --------------------------------------------------------------------------
   A slug that does not exist must 404, not 500 and not render an empty shell.
   -------------------------------------------------------------------------- */
test('unknown slug 404s', async ({ page }) => {
  const response = await page.goto('/c/definitely-not-a-component');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('does not exist');
});
