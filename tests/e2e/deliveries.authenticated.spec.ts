import { randomUUID } from "node:crypto";

import { neon } from "@neondatabase/serverless";
import { expect, test } from "@playwright/test";
import { config } from "dotenv";
import { encode } from "next-auth/jwt";

import { hashCanonicalArticle, hashVariant } from "@/variants/hashing";

config({ path: ".env.local", quiet: true });

const databaseUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
const mockEnabled = process.env.PLAYWRIGHT_GUIDED_AI_MOCK === "1";
const authSecret = process.env.AUTH_SECRET;
const allowedLogin = process.env.ALLOWED_GITHUB_LOGIN;

test.describe("audited provider delivery", () => {
  test.skip(
    !databaseUrl || !authSecret || !allowedLogin || !mockEnabled,
    "Provide local auth/database configuration and PLAYWRIGHT_GUIDED_AI_MOCK=1.",
  );

  test.beforeEach(async ({ context }) => {
    if (!databaseUrl || !authSecret || !allowedLogin) return;
    const sql = neon(databaseUrl);
    const [user] = await sql`
      select id, github_account_id, github_login from users
      where lower(github_login) = lower(${allowedLogin}) limit 1
    `;
    if (!user) throw new Error("Expected one delivery test user.");
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

  test("shows guarded provider actions without making a provider request", async ({ page }) => {
    if (!databaseUrl || !allowedLogin) return;
    const sql = neon(databaseUrl);
    const [user] = await sql`select id from users where lower(github_login) = lower(${allowedLogin}) limit 1`;
    const articleId = randomUUID();
    const versionId = randomUUID();
    const variantId = randomUUID();
    const linkedInVariantId = randomUUID();
    const title = "Disposable newsletter delivery";
    const documentJson = {
      type: "doc" as const,
      content: [{ type: "paragraph" as const, content: [{ type: "text" as const, text: "Canonical body" }] }],
    };
    const content = {
      version: 1 as const,
      destination: "newsletter" as const,
      bodyMarkdown: "Newsletter body",
      intro: "Intro",
      callToAction: "Read more",
    };
    const metadata = {
      version: 1 as const,
      destination: "newsletter" as const,
      subject: "Disposable newsletter subject",
      previewText: "Disposable preview",
    };
    const sourceContentHash = hashCanonicalArticle({ title, documentJson });
    const contentHash = hashVariant({ content, metadata });
    const linkedInContent = {
      version: 1 as const,
      destination: "linkedin-post" as const,
      bodyMarkdown: "Disposable public post",
    };
    const linkedInMetadata = {
      version: 1 as const,
      destination: "linkedin-post" as const,
      publicationUrl: null,
    };
    const linkedInContentHash = hashVariant({
      content: linkedInContent,
      metadata: linkedInMetadata,
    });

    await sql`insert into articles (id,user_id,title,slug,status,document_json,plain_text,metadata,revision)
      values (${articleId},${user.id},${title},${`delivery-${articleId}`},'editing',${JSON.stringify(documentJson)}::jsonb,'Canonical body',${JSON.stringify({ version: 1 })}::jsonb,1)`;
    try {
      await sql`insert into article_versions (id,article_id,article_revision,title,document_json,plain_text,markdown,reason,label)
        values (${versionId},${articleId},1,${title},${JSON.stringify(documentJson)}::jsonb,'Canonical body','Canonical body','manual','Delivery fixture')`;
      await sql`insert into publication_variants (
        id,user_id,article_id,destination,content_json,metadata_json,
        generated_from_version_id,source_article_revision,source_content_hash,
        content_hash,revision,status
      ) values (
        ${variantId},${user.id},${articleId},'newsletter',${JSON.stringify(content)}::jsonb,
        ${JSON.stringify(metadata)}::jsonb,${versionId},1,${sourceContentHash},${contentHash},1,'ready'
      )`;
      await sql`insert into publication_variants (
        id,user_id,article_id,destination,content_json,metadata_json,
        generated_from_version_id,source_article_revision,source_content_hash,
        content_hash,revision,status
      ) values (
        ${linkedInVariantId},${user.id},${articleId},'linkedin-post',${JSON.stringify(linkedInContent)}::jsonb,
        ${JSON.stringify(linkedInMetadata)}::jsonb,${versionId},1,${sourceContentHash},${linkedInContentHash},1,'ready'
      )`;

      await page.goto(`/articles/${articleId}/variants`);
      await page.getByRole("button", { name: /Newsletter/ }).click();
      await expect(page.getByRole("heading", { name: "Newsletter", exact: true })).toBeVisible();
      const delivery = page.getByRole("region", { name: "Buttondown draft delivery" });
      await expect(delivery.getByText("It never sends the newsletter.")).toBeVisible();
      const button = delivery.getByRole("button", { name: "Create draft" });
      if (process.env.BUTTONDOWN_API_KEY) await expect(button).toBeEnabled();
      else {
        await expect(button).toBeDisabled();
        await expect(delivery.getByText(/Configure the server-side Buttondown API key/)).toBeVisible();
      }

      await page.getByRole("button", { name: /LinkedIn post/ }).click();
      const linkedInDelivery = page.getByRole("region", { name: "LinkedIn public delivery" });
      await expect(linkedInDelivery.getByText(/publishes immediately/)).toBeVisible();
      const publishButton = linkedInDelivery.getByRole("button", { name: "Publish publicly" });
      const linkedInConfigured = process.env.LINKEDIN_ACCESS_TOKEN
        && process.env.LINKEDIN_AUTHOR_URN
        && process.env.LINKEDIN_API_VERSION;
      if (linkedInConfigured) await expect(publishButton).toBeEnabled();
      else {
        await expect(publishButton).toBeDisabled();
        await expect(linkedInDelivery.getByText(/Configure the server-side LinkedIn identity/)).toBeVisible();
      }
    } finally {
      await sql`delete from articles where id = ${articleId}`;
    }
  });
});
