/**
 * Visual pass. Not a test — a screenshotter, so it deliberately does not go
 * through playwright.config.ts (whose webServer would take ownership of 8927
 * and tear the running server down at the end).
 *
 * Scroll-driven reveals only advance when the page actually scrolls, and a
 * background tab does not tick them, so each shot scrolls to its offset, waits
 * for the frame, and only then captures.
 */
import { chromium, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2] ?? '.';
const BASE = `http://localhost:${process.env['PORT'] ?? '8927'}`;

type Shot = { name: string; path: string; y?: number; light?: boolean; width?: number };

/* The first five walk the pinned hero track: 340vh at a 900px viewport is
   3060px tall, of which 2160 is travel, so 0 / 540 / 1080 / 1620 / 2100 samples
   the scrub at roughly 0, 25, 50, 75 and 97 per cent — one frame per split-flap
   message plus the two mid-flip.

   The rest are offsets into a 11.7k-tall document, taken by hand rather than
   derived: four of the seven spreads (the lead, then one of each alternation),
   both ends of the workflow ledger, and the index. scrollTo clamps at the
   document end, so an overshoot degrades to the footer shot rather than to a
   failure. */
const SHOTS: Shot[] = [
  { name: 'home-01-scrub-000', path: '/' },
  { name: 'home-02-scrub-025', path: '/', y: 540 },
  { name: 'home-03-scrub-050', path: '/', y: 1080 },
  { name: 'home-04-scrub-075', path: '/', y: 1620 },
  { name: 'home-05-scrub-100', path: '/', y: 2100 },
  { name: 'home-06-spread-lead', path: '/', y: 3450 },
  { name: 'home-07-spread-right', path: '/', y: 4450 },
  { name: 'home-08-spread-left', path: '/', y: 6000 },
  { name: 'home-09-spread-last', path: '/', y: 7500 },
  { name: 'home-10-workflow', path: '/', y: 9000 },
  { name: 'home-11-workflow-end', path: '/', y: 9700 },
  { name: 'home-12-index', path: '/', y: 10600 },
  { name: 'home-13-light-scrub-040', path: '/', y: 864, light: true },
  { name: 'browse-01', path: '/components' },
  { name: 'browse-02', path: '/components', y: 900 },
  { name: 'detail-01', path: '/c/depth-pulse-travelling-wave' },
  { name: 'detail-02', path: '/c/depth-pulse-travelling-wave', y: 900 },
  { name: 'detail-03', path: '/c/depth-pulse-travelling-wave', y: 2000 },
  { name: 'shader-check', path: '/c/cylinder-dot-score' },
  { name: 'narrow-home', path: '/', width: 420, y: 300 },
  { name: 'narrow-browse', path: '/components', width: 420 },
  { name: 'notfound', path: '/nope' },
];

const IGNORE =
  /context\s*lost|CONTEXT_LOST_WEBGL|software WebGL|Unable to (?:create|initialize) WebGL|WebGL is not supported|React DevTools|Download the React/i;

async function settle(page: Page, y: number): Promise<void> {
  await page.evaluate((offset) => window.scrollTo(0, offset), y);
  // Two frames: one to apply the scroll, one for the driven animations to be
  // sampled at the new offset.
  await page.evaluate(
    () =>
      new Promise<void>((done) =>
        requestAnimationFrame(() => requestAnimationFrame(() => done())),
      ),
  );
  await page.waitForTimeout(900);
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
  });

  const problems: string[] = [];

  for (const shot of SHOTS) {
    const context = await browser.newContext({
      viewport: { width: shot.width ?? 1440, height: 900 },
      colorScheme: shot.light === true ? 'light' : 'dark',
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      if (IGNORE.test(message.text())) return;
      problems.push(`${shot.name}: console ${message.text().slice(0, 200)}`);
    });
    page.on('pageerror', (error) => problems.push(`${shot.name}: pageerror ${error.message}`));

    await page.goto(`${BASE}${shot.path}`, { waitUntil: 'networkidle' });
    await settle(page, shot.y ?? 0);

    await page.screenshot({ path: `${OUT}/${shot.name}.png` });
    console.log(`${shot.name}  ${shot.path}${shot.y === undefined ? '' : ` @${shot.y}`}`);
    await context.close();
  }

  await browser.close();

  console.log(problems.length === 0 ? '\nno console/page errors' : `\n${problems.length} problem(s):`);
  for (const problem of problems) console.log(`  ${problem}`);
}

await main();
