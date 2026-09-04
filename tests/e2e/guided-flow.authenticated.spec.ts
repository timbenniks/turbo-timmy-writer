import { neon } from "@neondatabase/serverless";
import { expect, test } from "@playwright/test";
import { config } from "dotenv";
import { encode } from "next-auth/jwt";

config({ path: ".env.local", quiet: true });

const databaseUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
const mockEnabled = process.env.PLAYWRIGHT_GUIDED_AI_MOCK === "1";
const authSecret = process.env.AUTH_SECRET;
const allowedLogin = process.env.ALLOWED_GITHUB_LOGIN;

test.describe("guided article flow with deterministic AI", () => {
  test.skip(
    !databaseUrl || !authSecret || !allowedLogin || !mockEnabled,
    "Provide local auth/database configuration and PLAYWRIGHT_GUIDED_AI_MOCK=1.",
  );

  test.beforeEach(async ({ context }) => {
    if (!databaseUrl || !authSecret || !allowedLogin) return;
    const sql = neon(databaseUrl);
    const users = await sql`
      select id, github_account_id, github_login
      from users
      where lower(github_login) = lower(${allowedLogin})
      limit 2
    `;
    if (users.length !== 1) throw new Error("Expected exactly one guided-flow test user.");
    const user = users[0];
    const token = await encode({
      secret: authSecret,
      token: {
        userId: user.id,
        githubAccountId: user.github_account_id,
        githubLogin: user.github_login,
      },
    });
    await context.addCookies([
      {
        name: "next-auth.session-token",
        value: token,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
  });

  test("persists interview, brief, draft, and responsive access", async ({ page }) => {
    let articleId: string | undefined;
    try {
      await page.goto("/start");
      await page
        .getByRole("textbox", { name: "What are you thinking about?" })
        .fill("Playwright fixture guided flow preserves specific evidence.");
      await page.getByRole("button", { name: "Start conversation" }).click();
      await expect(page).toHaveURL(/\/articles\/([0-9a-f-]+)$/);
      articleId = page.url().split("/").at(-1);

      const isMobile = (page.viewportSize()?.width ?? 0) < 1_280;
      if (isMobile) await page.getByRole("button", { name: "Open assistant" }).click();
      const assistant = page.getByRole("complementary", { name: "Writing assistant" });
      await expect(
        assistant.getByText(
          "Which concrete experience best demonstrates the tension in this premise?",
        ),
      ).toBeVisible();
      await expect(assistant.getByRole("tab", { name: "Brief · 1" })).toBeVisible();

      await assistant
        .getByRole("textbox", { name: "Your response" })
        .fill("A specific tool removed the uncertainty that carried the lesson.");
      await assistant.getByRole("button", { name: "Send response" }).click();
      await expect(assistant.getByRole("tab", { name: "Brief · 2" })).toBeVisible();

      await assistant.getByRole("button", { name: "Draft article" }).click();
      await expect(assistant.getByRole("button", { name: "Draft saved" })).toBeVisible();
      await expect(page.getByRole("textbox", { name: "Article title" })).toHaveValue(
        "Mock first draft",
      );
      await expect(page.locator('[aria-label="Article body"]')).toContainText(
        "Specific experience makes the argument credible.",
      );
      await expect(page.getByRole("combobox", { name: "Article status" })).toHaveValue(
        "drafting",
      );

      if (isMobile) await assistant.getByRole("button", { name: "Close assistant" }).click();
      await page.reload();
      if (isMobile) await page.getByRole("button", { name: "Open assistant" }).click();
      await expect(page.getByRole("complementary", { name: "Writing assistant" }))
        .toContainText("Playwright fixture guided flow preserves specific evidence.");
    } finally {
      if (articleId && databaseUrl) {
        const sql = neon(databaseUrl);
        await sql`delete from editor_suggestions where article_id = ${articleId}`;
        await sql`delete from article_reviews where article_id = ${articleId}`;
        await sql`delete from ai_runs where article_id = ${articleId}`;
        await sql`delete from articles where id = ${articleId}`;
      }
    }
  });
});
