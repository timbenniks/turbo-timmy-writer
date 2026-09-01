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
    expect(originalTitle).toMatch(/^Playwright fixture\b/);
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
      const articleCanvas = page.locator(".article-canvas");
      const editorFooter = page.locator(".workspace-frame > section > footer");
      await expect
        .poll(() => articleCanvas.evaluate((element) => element.scrollHeight > element.clientHeight))
        .toBe(true);
      await articleCanvas.evaluate((element) => element.scrollTo({ top: element.scrollHeight }));
      await expect(editorFooter).toBeInViewport();
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

  test("selects reusable tags and keeps account actions aligned", async ({ page }) => {
    await page.goto(`/articles/${articleId}`);

    if ((page.viewportSize()?.width ?? 0) >= 1_024) {
      const manageTags = page.getByRole("button", { name: "Manage tags" });
      const signOut = page.getByRole("button", { name: "Sign out" });
      const [manageBox, signOutBox] = await Promise.all([
        manageTags.boundingBox(),
        signOut.boundingBox(),
      ]);
      expect(manageBox).not.toBeNull();
      expect(signOutBox).not.toBeNull();
      expect(Math.abs(
        (manageBox?.y ?? 0) + (manageBox?.height ?? 0) / 2
          - ((signOutBox?.y ?? 0) + (signOutBox?.height ?? 0) / 2),
      )).toBeLessThan(1);

      await manageTags.focus();
      await manageTags.press("Enter");
      await expect(page.getByRole("dialog", { name: "Manage tag taxonomy" })).toBeVisible();
      await page.getByLabel("Find tags").fill("ai");
      await expect(page.getByText("ai", { exact: true }).last()).toBeVisible();

      const temporaryTag = `Playwright ${Date.now()}`;
      const renamedTag = `${temporaryTag} renamed`;
      await page.getByLabel("New tag name").fill(temporaryTag);
      await page.getByRole("button", { name: "Add", exact: true }).click();
      await expect(page.getByText("Tag saved.")).toBeVisible();
      await page.getByLabel("Find tags").fill(temporaryTag);
      await page.getByRole("button", { name: `Rename ${temporaryTag}` }).click();
      await page.getByLabel(`Rename ${temporaryTag}`).fill(renamedTag);
      await page.getByRole("button", { name: `Save ${temporaryTag}` }).click();
      await expect(page.getByText("Tag renamed.")).toBeVisible();
      await page.getByLabel("Find tags").fill(renamedTag);
      page.once("dialog", (dialog) => void dialog.accept());
      await page.getByRole("button", { name: `Delete ${renamedTag}` }).click();
      await expect(page.getByText("Tag deleted from the taxonomy and its articles.")).toBeVisible();
      await page.getByRole("button", { name: "Close tag manager" }).click();
    }

    const pickerButton = page.getByRole("button", { name: "Choose article tags" });
    await expect(pickerButton).toContainText("Add tags");
    await pickerButton.click();
    const picker = page.getByRole("dialog", { name: "Choose article tags" });
    await picker.getByRole("button", { name: "Select ai", exact: true }).click();
    await picker.getByRole("button", { name: "Save tags" }).click();
    await expect(page.getByText("Tags saved.")).toBeVisible();

    await pickerButton.click();
    await picker.getByRole("button", { name: "Remove ai", exact: true }).click();
    await picker.getByRole("button", { name: "Save tags" }).click();
    await expect(page.getByText("Tags cleared.")).toBeVisible();
  });
});
