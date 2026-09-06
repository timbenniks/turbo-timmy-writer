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

test.describe("version comparison", () => {
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
    if (users.length !== 1) throw new Error("Expected exactly one version-history test user.");
    const user = users[0];
    const token = await encode({
      secret: authSecret,
      token: {
        userId: user.id,
        githubAccountId: user.github_account_id,
        githubLogin: user.github_login,
      },
    });
    await context.addCookies([{
      name: "next-auth.session-token",
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    }]);
  });

  test("compares an AI-linked checkpoint with the current document", async ({ page }) => {
    if (!databaseUrl || !allowedLogin) return;
    const sql = neon(databaseUrl);
    const [user] = await sql`
      select id from users where lower(github_login) = lower(${allowedLogin}) limit 1
    `;
    const articleId = randomUUID();
    const versionId = randomUUID();
    const aiRunId = randomUUID();
    const oldText = "Shared opening\nOld evidence\nShared ending";
    const currentText = "Shared opening\nSpecific evidence\nShared ending";
    const currentDocument = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: currentText }] }],
    };
    const oldDocument = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: oldText }] }],
    };

    await sql`
      insert into articles (
        id, user_id, title, slug, status, document_json, plain_text, metadata, revision
      ) values (
        ${articleId}, ${user.id}, ${"Playwright fixture version history"},
        ${`playwright-history-${articleId}`}, 'editing',
        ${JSON.stringify(currentDocument)}::jsonb, ${currentText},
        ${JSON.stringify({ version: 1 })}::jsonb, 2
      )
    `;

    try {
      await sql`
        insert into ai_runs (
          id, user_id, article_id, skill_id, skill_version, model, status, duration_ms,
          created_at, completed_at
        ) values (
          ${aiRunId}, ${user.id}, ${articleId}, 'article-first-draft', 'v2',
          'test-model', 'succeeded', 240, now(), now()
        )
      `;
      await sql`
        insert into article_versions (
          id, article_id, article_revision, title, document_json, plain_text,
          markdown, reason, label, ai_run_id
        ) values (
          ${versionId}, ${articleId}, 1, ${"Earlier fixture title"},
          ${JSON.stringify(oldDocument)}::jsonb, ${oldText}, ${oldText},
          'initial-draft', 'Initial AI draft', ${aiRunId}
        )
      `;

      await page.goto(`/articles/${articleId}/history`);
      await expect(page.getByRole("heading", { name: "Playwright fixture version history" })).toBeVisible();
      await page.keyboard.press("Control+k");
      const palette = page.getByRole("dialog", { name: "Command palette" });
      await expect(palette).toBeVisible();
      await palette.getByRole("textbox", { name: "Search commands" }).fill("publication variants");
      await expect(palette.getByRole("button", { name: /Publication variants/ })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(palette).toBeHidden();
      await expect(page.getByText("article-first-draft@v2 · test-model · succeeded · 240 ms")).toBeVisible();
      await expect(page.getByText("Old evidence", { exact: true })).toBeVisible();
      await expect(page.getByText("Specific evidence", { exact: true })).toBeVisible();
      await expect(page.getByText("+1 lines", { exact: true })).toBeVisible();
      await expect(page.getByText("−1 lines", { exact: true })).toBeVisible();
      const titleChange = page.getByRole("region", { name: "Title change" });
      await expect(titleChange.getByText("Earlier fixture title", { exact: true })).toBeVisible();
      await expect(titleChange.getByText("Playwright fixture version history", { exact: true })).toBeVisible();

      page.once("dialog", (dialog) => dialog.accept());
      await page.getByRole("button", { name: "Restore this version" }).click();
      await expect(page).toHaveURL(`/articles/${articleId}`);
      await expect(page.getByRole("textbox", { name: "Article title" })).toHaveValue(
        "Earlier fixture title",
      );
      await expect(page.locator('[aria-label="Article body"]')).toContainText("Old evidence");

      const [restoreEvidence] = await sql`
        select
          count(*) filter (where reason = 'pre-restore')::integer as before_count,
          count(*) filter (where reason = 'restore')::integer as restore_count
        from article_versions
        where article_id = ${articleId}
      `;
      expect(restoreEvidence.before_count).toBe(1);
      expect(restoreEvidence.restore_count).toBe(1);
    } finally {
      await sql`delete from ai_runs where id = ${aiRunId}`;
      await sql`delete from articles where id = ${articleId}`;
    }
  });
});
