import { randomUUID } from "node:crypto";

import { neon } from "@neondatabase/serverless";
import { expect, test } from "@playwright/test";
import { config } from "dotenv";
import { encode } from "next-auth/jwt";

config({ path: ".env.local", quiet: true });

const databaseUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
const mockEnabled = process.env.PLAYWRIGHT_GUIDED_AI_MOCK === "1";
const authSecret = process.env.AUTH_SECRET;
const allowedLogin = process.env.ALLOWED_GITHUB_LOGIN;

test.describe("precision AI with deterministic provider", () => {
  test.skip(
    !databaseUrl || !authSecret || !allowedLogin || !mockEnabled,
    "Provide local auth/database configuration and PLAYWRIGHT_GUIDED_AI_MOCK=1.",
  );

  test.beforeEach(async ({ context }) => {
    if (!databaseUrl || !authSecret || !allowedLogin) return;
    const sql = neon(databaseUrl);
    const users = await sql`select id, github_account_id, github_login from users where lower(github_login) = lower(${allowedLogin}) limit 2`;
    if (users.length !== 1) throw new Error("Expected exactly one precision-AI test user.");
    const user = users[0];
    const token = await encode({
      secret: authSecret,
      token: { userId: user.id, githubAccountId: user.github_account_id, githubLogin: user.github_login },
    });
    await context.addCookies([{ name: "next-auth.session-token", value: token, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" }]);
  });

  test("reviews, rejects, accepts, and supersedes suggestions without silent edits", async ({ page }) => {
    test.setTimeout(60_000);
    if (!databaseUrl || !allowedLogin) return;
    const sql = neon(databaseUrl);
    const [user] = await sql`select id from users where lower(github_login) = lower(${allowedLogin}) limit 1`;
    const articleId = randomUUID();
    const initialText = "Precision AI keeps Tim in control. The claim needs a concrete example.";
    const document = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: initialText }] }] };
    await sql`
      insert into articles (id, user_id, title, slug, status, document_json, plain_text, metadata, revision)
      values (${articleId}, ${user.id}, ${"Playwright fixture precision AI"}, ${`playwright-precision-${articleId}`}, 'editing', ${JSON.stringify(document)}::jsonb, ${initialText}, ${JSON.stringify({ version: 1 })}::jsonb, 1)
    `;

    const selectFirstWord = async () => {
      const body = page.locator('[aria-label="Article body"]');
      await body.click();
      await body.press("Control+Home");
      await body.press("Shift+Control+ArrowRight");
      return body;
    };

    try {
      await page.goto(`/articles/${articleId}`);
      const body = await selectFirstWord();
      const toolbar = page.getByRole("toolbar", { name: "AI writing actions" });
      await toolbar.getByRole("button", { name: "Tighten", exact: true }).click();
      const tighten = page.getByRole("region", { name: "Tighten suggestion" });
      await expect(tighten).toContainText("Sharper: Precision");
      await expect(body).toHaveText(initialText);
      await tighten.getByRole("button", { name: "Reject" }).click();
      await expect(page.getByText("Suggestion rejected. Your article was not changed.")).toBeVisible();
      await expect(body).toHaveText(initialText);
      await page.reload();
      await expect(body).toHaveText(initialText);

      await selectFirstWord();
      await toolbar.getByRole("button", { name: "Clarify", exact: true }).click();
      const clarify = page.getByRole("region", { name: "Clarify suggestion" });
      await expect(clarify).toBeVisible();
      await clarify.getByRole("button", { name: "Accept" }).click();
      await expect(page.getByText("Suggestion accepted and saved.")).toBeVisible();
      await expect(body).toContainText("Sharper: Precision AI keeps Tim in control.");
      await page.reload();
      await expect(body).toContainText("Sharper: Precision AI keeps Tim in control.");

      await page.locator("summary").filter({ hasText: "Precision AI" }).click();
      await page.getByRole("button", { name: "Humanizer scan" }).click();
      const humanizer = page.getByRole("region", { name: "humanizer review" });
      await expect(humanizer).toContainText("One generated-writing pattern deserves review.");
      await expect(body).not.toContainText("This passage can say");
      await humanizer.getByRole("button", { name: "Create rewrite suggestion" }).click();
      await expect(page.getByRole("region", { name: "Ask AI suggestion" })).toBeVisible();
      await expect(body).toContainText("Sharper: Precision AI keeps Tim in control.");

      await page.getByRole("button", { name: "Critic review" }).click();
      await expect(page.getByRole("region", { name: "critic review" })).toContainText("one claim needs stronger evidence");

      const rewrite = page.getByRole("region", { name: "Ask AI suggestion" });
      await sql`update articles set revision = revision + 1 where id = ${articleId}`;
      await rewrite.getByRole("button", { name: "Accept" }).click();
      await expect(page.getByText("The source passage changed. The suggestion was not applied.")).toBeVisible();
      await expect(body).toContainText("Sharper: Precision AI keeps Tim in control.");
      await page.reload();
      await page.locator("summary").filter({ hasText: "Precision AI" }).click();
      await page.getByText(/Suggestion outcomes/).click();
      await expect(page.getByText("superseded", { exact: true })).toBeVisible();
    } finally {
      await sql`delete from editor_suggestions where article_id = ${articleId}`;
      await sql`delete from article_reviews where article_id = ${articleId}`;
      await sql`delete from ai_runs where article_id = ${articleId}`;
      await sql`delete from articles where id = ${articleId}`;
    }
  });
});
