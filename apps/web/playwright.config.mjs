import { defineConfig, devices } from "@playwright/test";

import { resolveE2eDatabasePath } from "./e2e/support/e2eDatabase.mjs";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3001";
const databasePath = resolveE2eDatabasePath();

export default defineConfig({
  testDir: "./e2e/specs",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  globalSetup: "./e2e/global.setup.mjs",
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  reporter: "list",
  retries: process.env.CI ? 2 : 0,
  timeout: 60_000,
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  webServer: {
    command: "pnpm exec next dev --hostname 127.0.0.1 --port 3001",
    env: {
      ...process.env,
      VARDI_DATABASE_PATH: databasePath,
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: baseURL,
  },
  workers: 1,
});
