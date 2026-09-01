import { existsSync } from "node:fs";

import { defineConfig, devices } from "@playwright/test";

const chromiumExecutable = [
  process.env.PLAYWRIGHT_CHROMIUM_PATH,
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
].find((candidate): candidate is string => Boolean(candidate && existsSync(candidate)));

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3001",
    trace: "retain-on-failure",
    launchOptions: chromiumExecutable ? { executablePath: chromiumExecutable } : undefined,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3001/sign-in",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
