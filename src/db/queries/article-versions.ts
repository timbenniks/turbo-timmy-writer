import "server-only";

import { randomUUID } from "node:crypto";

import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import { aiRuns, articles, articleVersions } from "@/db/schema";
import { articleDocumentToMarkdown } from "@/editor/serialization/markdown";

const restoredArticleSchema = z.object({
  revision: z.number().int().nonnegative(),
  updated_at: z.coerce.date(),
});

export async function listArticleVersionsForUser(articleId: string, userId: string) {
  return getDatabase()
    .select({
      id: articleVersions.id,
      articleRevision: articleVersions.articleRevision,
      title: articleVersions.title,
      plainText: articleVersions.plainText,
      markdown: articleVersions.markdown,
      reason: articleVersions.reason,
      label: articleVersions.label,
      aiRunId: articleVersions.aiRunId,
      createdAt: articleVersions.createdAt,
      aiSkillId: aiRuns.skillId,
      aiSkillVersion: aiRuns.skillVersion,
      aiModel: aiRuns.model,
      aiStatus: aiRuns.status,
      aiDurationMs: aiRuns.durationMs,
    })
    .from(articleVersions)
    .innerJoin(
      articles,
      and(eq(articles.id, articleVersions.articleId), eq(articles.userId, userId)),
    )
    .leftJoin(
      aiRuns,
      and(eq(aiRuns.id, articleVersions.aiRunId), eq(aiRuns.userId, userId)),
    )
    .where(eq(articleVersions.articleId, articleId))
    .orderBy(desc(articleVersions.createdAt), desc(articleVersions.id));
}

export async function restoreArticleVersionForUser(input: {
  articleId: string;
  versionId: string;
  userId: string;
  expectedRevision: number;
}) {
  const database = getDatabase();
  const [[article], [source]] = await Promise.all([
    database
      .select()
      .from(articles)
      .where(and(eq(articles.id, input.articleId), eq(articles.userId, input.userId)))
      .limit(1),
    database
      .select({
        id: articleVersions.id,
        title: articleVersions.title,
        documentJson: articleVersions.documentJson,
        plainText: articleVersions.plainText,
        markdown: articleVersions.markdown,
        label: articleVersions.label,
        reason: articleVersions.reason,
      })
      .from(articleVersions)
      .innerJoin(
        articles,
        and(eq(articles.id, articleVersions.articleId), eq(articles.userId, input.userId)),
      )
      .where(
        and(
          eq(articleVersions.id, input.versionId),
          eq(articleVersions.articleId, input.articleId),
        ),
      )
      .limit(1),
  ]);

  if (!article || !source) return null;
  if (article.revision !== input.expectedRevision) {
    return { status: "conflict" as const, currentRevision: article.revision };
  }

  const beforeId = randomUUID();
  const restoredId = randomUUID();
  const restoredLabel = `Restored: ${source.label || source.reason}`.slice(0, 200);
  const rows = await database.execute(sql`
    with locked as (
      select * from ${articles}
      where ${articles.id} = ${input.articleId}
        and ${articles.userId} = ${input.userId}
        and ${articles.revision} = ${input.expectedRevision}
      for update
    ), before_restore as (
      insert into ${articleVersions} (
        id, article_id, article_revision, title, document_json, plain_text,
        markdown, reason, label
      )
      select
        ${beforeId}, id, revision, title, document_json, plain_text,
        ${articleDocumentToMarkdown(article.documentJson)}, 'pre-restore',
        'Before version restore'
      from locked
      returning id
    ), restored as (
      update ${articles} set
        title = ${source.title},
        document_json = ${JSON.stringify(source.documentJson)}::jsonb,
        plain_text = ${source.plainText},
        revision = ${input.expectedRevision + 1},
        updated_at = now()
      from locked, before_restore
      where ${articles.id} = locked.id
      returning ${articles.id}, ${articles.revision}, ${articles.updatedAt}
    ), restored_version as (
      insert into ${articleVersions} (
        id, article_id, article_revision, title, document_json, plain_text,
        markdown, reason, label
      )
      select
        ${restoredId}, restored.id, restored.revision, ${source.title},
        ${JSON.stringify(source.documentJson)}::jsonb, ${source.plainText},
        ${source.markdown}, 'restore', ${restoredLabel}
      from restored
      returning id
    )
    select restored.revision, restored.updated_at
    from restored cross join restored_version
  `);

  const restored = restoredArticleSchema.safeParse(rows.rows[0]);
  if (restored.success) {
    return {
      status: "restored" as const,
      revision: restored.data.revision,
      updatedAt: restored.data.updated_at,
    };
  }

  const [current] = await database
    .select({ revision: articles.revision })
    .from(articles)
    .where(and(eq(articles.id, input.articleId), eq(articles.userId, input.userId)))
    .limit(1);
  return current
    ? { status: "conflict" as const, currentRevision: current.revision }
    : null;
}
