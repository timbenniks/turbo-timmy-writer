import { expect, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("protected writing routes fail closed", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Your writing studio" })).toBeVisible();
  await expect(page.getByText("Access is restricted to the configured GitHub login.")).toBeVisible();
});

test("unknown auth errors remain safe and useful", async ({ page }) => {
  await page.goto("/sign-in?error=unexpected-provider-value");

  await expect(page.getByRole("alert")).toHaveText("GitHub sign-in failed. Please try again.");
});
