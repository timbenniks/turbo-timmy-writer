import { existsSync } from "node:fs";

import { defineConfig, devices } from "@playwright/test";

const chromiumExecutable = [
  process.env.PLAYWRIGHT_CHROMIUM_PATH,
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
].find((candidate): candidate is string => Boolean(candidate && existsSync(candidate)));
const guidedMockEnabled = process.env.PLAYWRIGHT_GUIDED_AI_MOCK === "1";
const playwrightPort = Number(process.env.PLAYWRIGHT_PORT ?? 3001);
const baseUrl = `http://localhost:${playwrightPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: baseUrl,
    trace: "retain-on-failure",
    launchOptions: chromiumExecutable ? { executablePath: chromiumExecutable } : undefined,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: guidedMockEnabled
      ? `pnpm build && AI_PROVIDER_MODE=guided-test pnpm exec next start --port ${playwrightPort}`
      : "pnpm dev",
    url: `${baseUrl}/sign-in`,
    reuseExistingServer: !process.env.CI && !guidedMockEnabled,
    timeout: 120_000,
  },
});
