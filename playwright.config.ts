import { defineConfig, devices } from '@playwright/test';

const PORT = 8927;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * Smoke tests run against the production build, not `next dev` — the things most
 * likely to break are static generation of 119 component routes and the emitted
 * registry JSON, neither of which dev mode exercises the same way.
 *
 * `pnpm verify` runs `next build` before `pnpm smoke`, so `next start` here is
 * serving output that already exists.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    // Motion is the product. A tiny viewport hides the previews entirely.
    viewport: { width: 1280, height: 900 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm start',
    url: BASE_URL,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
