import { expect, test } from '@playwright/test';

import { CATEGORY_COUNTS, MANIFEST } from '../__generated__/manifest';
import { collectErrors, sample } from './helpers';

/* ==========================================================================
   The shell: the pages a visitor moves through before they reach a component,
   plus the two things on them that are logic rather than markup — the filter
   and the theme.
   ========================================================================== */

test('home page states what the site is and links onward', async ({ page }) => {
  const errors = collectErrors(page);

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: /browse|components/i }).first()).toBeVisible();

  // Every category is reachable from the front page.
  for (const category of Object.keys(CATEGORY_COUNTS)) {
    await expect(page.locator(`a[href="/components?category=${category}"]`).first()).toBeVisible();
  }

  expect(errors, errors.join('\n')).toEqual([]);
});

test.describe('browse', () => {
  test('shows the whole catalogue, then filters it', async ({ page }) => {
    const errors = collectErrors(page);

    await page.goto('/components');

    const cards = page.locator('a[href^="/c/"][data-category]');
    await expect(cards).toHaveCount(MANIFEST.length);
    // Scoped to #main: the wordmark in the header carries the same count, so an
    // unscoped text match is a strict-mode violation rather than an assertion.
    await expect(page.locator('#main').getByText(`${MANIFEST.length} components`)).toBeVisible();

    /* -- category chip ------------------------------------------------- */
    const [category, count] = Object.entries(CATEGORY_COUNTS).sort(
      (a, b) => b[1] - a[1],
    )[0] as [string, number];

    const chip = page.locator(`button[data-category="${category}"]`);
    await chip.click();
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    await expect(cards).toHaveCount(count);
    // The filter is shareable — it writes itself into the URL.
    await expect(page).toHaveURL(new RegExp(`category=${category}`));

    await chip.click();
    await expect(cards).toHaveCount(MANIFEST.length);

    /* -- search -------------------------------------------------------- */
    const target = MANIFEST[0];
    expect(target).toBeDefined();
    if (target === undefined) return;

    const search = page.getByLabel('Search components');
    await search.fill(target.title);
    await expect(page.locator(`a[href="/c/${target.slug}"]`)).toBeVisible();
    await expect(cards).not.toHaveCount(MANIFEST.length);

    await search.fill('zzzzzznotathing');
    await expect(page.getByText('Nothing matches that.')).toBeVisible();

    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('a deep-linked category arrives pre-filtered', async ({ page }) => {
    const entry = MANIFEST[0];
    expect(entry).toBeDefined();
    if (entry === undefined) return;

    await page.goto(`/components?category=${entry.category}`);
    // Every manifest entry's category is a key of CATEGORY_COUNTS by
    // construction — both are emitted by the same build step — but the index
    // signature is widened to `string`, so the lookup is checked rather than
    // asserted away.
    const expected = CATEGORY_COUNTS[entry.category];
    expect(expected, `no count emitted for category "${entry.category}"`).toBeGreaterThan(0);
    await expect(page.locator('a[href^="/c/"][data-category]')).toHaveCount(expected ?? 0);
  });

  test('the / shortcut focuses search', async ({ page }) => {
    await page.goto('/components');

    const search = page.getByLabel('Search components');
    // The precondition is asserted rather than manufactured with a click:
    // clicking `body` targets its centre, which on this page is a component
    // card, so the "blur" navigated to a detail page and the shortcut was then
    // being pressed somewhere that has no search field at all. Focus already
    // rests on the document after a navigation, which is the state under test.
    await expect(search).not.toBeFocused();

    await page.keyboard.press('/');
    await expect(search).toBeFocused();
    // A literal slash must not have been typed into the field it just focused.
    await expect(search).toHaveValue('');
  });
});

test('theme toggle flips and persists', async ({ page }) => {
  await page.goto('/');

  const root = page.locator('html');
  const before = await root.getAttribute('class');
  const wasLight = (before ?? '').includes('light');

  await page.getByRole('button', { name: /theme/i }).click();
  if (wasLight) {
    await expect(root).not.toHaveClass(/light/);
  } else {
    await expect(root).toHaveClass(/light/);
  }

  // The choice is written before the first paint of the next page, so there is
  // no flash of the other theme.
  await page.reload();
  if (wasLight) {
    await expect(root).not.toHaveClass(/light/);
  } else {
    await expect(root).toHaveClass(/light/);
  }
});

test.describe('docs', () => {
  const PAGES = [
    { path: '/docs/installation', heading: /install/i },
    { path: '/docs/prompts', heading: /prompt/i },
    { path: '/docs/theming', heading: /theming/i },
    { path: '/docs/licensing', heading: /licen/i },
  ];

  for (const { path, heading } of PAGES) {
    test(`${path} renders`, async ({ page }) => {
      const errors = collectErrors(page);

      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);

      expect(errors, errors.join('\n')).toEqual([]);
    });
  }

  test('the credits page is gone, not merely unlinked', async ({ page }) => {
    // Asserted rather than assumed: an orphaned route still answers 200 and
    // still gets indexed, so "we removed the nav entry" is not the same claim
    // as "the page is not on the internet".
    const response = await page.goto('/docs/credits');
    expect(response?.status()).toBe(404);
  });
});

test('an unknown path 404s with a way out', async ({ page }) => {
  const response = await page.goto('/nope');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('link', { name: /components/i }).first()).toBeVisible();
});

/* --------------------------------------------------------------------------
   The grid holds far more previews than a browser can run at once. The budget
   exists to keep the number of simultaneously live WebGL contexts at 2 — a
   regression here does not throw, it silently loses contexts and blanks
   previews further down the page, so it gets asserted rather than trusted.
   -------------------------------------------------------------------------- */
test('the grid never runs more previews than the budget allows', async ({ page }) => {
  const errors = collectErrors(page);

  await page.goto('/components');
  // At least one preview has to come alive, or the assertion below would pass
  // on a page that simply runs nothing.
  await expect(page.locator('[data-live="true"]').first()).toBeVisible();

  const webglSlugs = new Set(MANIFEST.filter((e) => e.cost === 'webgl').map((e) => e.slug));
  const liveWebgl = await page
    .locator('[data-preview][data-live="true"]')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-preview')));

  expect(liveWebgl.filter((slug) => slug !== null && webglSlugs.has(slug)).length).toBeLessThanOrEqual(2);

  expect(errors, errors.join('\n')).toEqual([]);
});

test('a card in the grid navigates to its component', async ({ page }) => {
  const entry = sample()[0];
  expect(entry).toBeDefined();
  if (entry === undefined) return;

  await page.goto('/components');
  await page.locator(`a[href="/c/${entry.slug}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/c/${entry.slug}$`));
  await expect(page.getByRole('heading', { level: 1, name: entry.title })).toBeVisible();
});
