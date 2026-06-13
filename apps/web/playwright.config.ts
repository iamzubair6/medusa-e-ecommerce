import { defineConfig, devices } from "@playwright/test";

/**
 * Storefront/admin end-to-end tests.
 * `webServer` auto-starts `next dev -p 3200` (reused if already running).
 *
 * Prerequisite: the CMS Prisma client must be generated so the app compiles:
 *   bun run --filter @ecom/cms db:generate
 * Full commerce flows also need the Medusa backend + DB; the storefront renders
 * on placeholder data without them, which is enough for the smoke suite.
 */
const PORT = 3200;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "bun run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
