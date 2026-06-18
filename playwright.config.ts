import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for commercial-manager e2e tests.
 * Requires: pnpm dev running on localhost:3005
 */
export default defineConfig({
  testDir: "./e2e",
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0,
  /* Single worker for local smoke tests */
  workers: 1,
  /* Reporter */
  reporter: "list",
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3005",
    /* Collect trace when retrying the failed test. */
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /* Run dev server before tests if E2E_NO_SERVER is not set */
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : {
        command: "pnpm dev",
        url: "http://localhost:3005",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
