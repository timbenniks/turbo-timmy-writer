import { expect, test } from "@playwright/test";

const storageState = process.env.PLAYWRIGHT_STORAGE_STATE;
const articleId = process.env.PLAYWRIGHT_ARTICLE_ID;

test.describe("authenticated writing core", () => {
  test.skip(!storageState || !articleId, "Provide an ignored auth state and a designated test article.");
  test.use({ storageState: storageState ?? { cookies: [], origins: [] } });

  test("autosaves, reloads, and restores the designated article", async ({ page }) => {
    await page.goto(`/articles/${articleId}`);
    const title = page.getByRole("textbox", { name: "Article title" });
    const body = page.locator('[aria-label="Article body"]');
    const originalTitle = await title.inputValue();
    const originalBody = await body.innerText();
    const markerTitle = `Playwright recovery ${Date.now()}`;
    const longBody = Array.from(
      { length: 1_200 },
      (_, index) => `word-${index + 1}`,
    ).join(" ");

    try {
      await title.fill(markerTitle);
      await body.fill(longBody);
      await page.waitForTimeout(1_200);
      await expect(page.getByText(/Saved at/).first()).toBeVisible({ timeout: 10_000 });
      await page.reload();
      await expect(title).toHaveValue(markerTitle);
      await expect(body).toHaveText(longBody);
    } finally {
      await title.fill(originalTitle);
      await body.fill(originalBody);
      await page.waitForTimeout(1_200);
      await expect(page.getByText(/Saved at/).first()).toBeVisible({ timeout: 10_000 });
      await page.reload();
      await expect(title).toHaveValue(originalTitle);
      await expect(body).toHaveText(originalBody);
    }
  });

  test("switches theme and focus chrome without changing prose", async ({ page }) => {
    await page.goto(`/articles/${articleId}`);
    const body = page.locator('[aria-label="Article body"]');
    const originalBody = await body.innerText();

    await page.getByRole("button", { name: "Choose writing theme" }).click();
    await page.getByRole("button", { name: /Paper.*Starter/ }).click();
    await page.getByRole("button", { name: "Close themes" }).click();
    await expect(page.locator(".writing-workspace")).toHaveCSS("background-color", "rgb(247, 241, 227)");

    await page.getByRole("button", { name: "Enter focus mode" }).click();
    await expect(page.locator(".workspace-navigation")).toBeHidden();
    await expect(page.locator(".workspace-assistant")).toBeHidden();
    await expect(body).toHaveText(originalBody);
  });
});
