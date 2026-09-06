import { expect, test } from "@playwright/test";

const productionServer = process.env.PLAYWRIGHT_GUIDED_AI_MOCK === "1";

test("installs a private offline shell without caching protected pages", async ({ context, page, request }) => {
  test.skip(!productionServer, "Service-worker registration is production-only.");

  const workerResponse = await request.get("/sw.js");
  expect(workerResponse.ok()).toBe(true);
  expect(workerResponse.headers()["cache-control"]).toContain("no-store");
  expect(workerResponse.headers()["service-worker-allowed"]).toBe("/");

  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(await manifestResponse.json()).toMatchObject({
    name: "Turbo Timmy Writer",
    display: "standalone",
    scope: "/",
  });

  await page.goto("/offline");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true });
      });
    }
  });

  await context.setOffline(true);
  try {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Turbo Timmy Writer is offline" })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
