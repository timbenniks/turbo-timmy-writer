import { mkdir } from "node:fs/promises";

import { chromium } from "@playwright/test";

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? "/usr/bin/chromium";
const statePath = ".auth/user.json";
await mkdir(".auth", { recursive: true });

const browser = await chromium.launch({ executablePath, headless: false });
const context = await browser.newContext();
const page = await context.newPage();

console.log("Complete GitHub sign-in in the opened browser. Waiting up to five minutes…");
await page.goto("http://localhost:3001/sign-in");
await page.waitForURL("http://localhost:3001/", { timeout: 300_000 });
await context.storageState({ path: statePath });
await browser.close();
console.log(`Saved ignored Playwright auth state to ${statePath}.`);
