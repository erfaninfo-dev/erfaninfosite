import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3210);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  // The suite hits the live API through the server, so give it room.
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  // Tests run against a production build: dev-mode timing and bundle sizes are
  // not what visitors get.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `pnpm build && pnpm start --port ${PORT}`,
        url: BASE_URL,
        /*
         * Never reuse a running server. Playwright's default reuses whatever
         * answers on the port, which silently tests a stale build — it cost a
         * whole screenshot matrix run here. The rebuild is worth the certainty.
         */
        reuseExistingServer: false,
        timeout: 300_000,
      },
});
