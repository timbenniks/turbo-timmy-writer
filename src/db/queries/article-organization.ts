import "server-only";

import { randomUUID } from "node:crypto";

import { and, asc, count, eq, inArray, max, sql } from "drizzle-orm";

import { canonicalizeTagLabels } from "@/articles/organization";
import type { ArticleStatus } from "@/articles/model";
import { getDatabase } from "@/db/client";
import { articleTags, articleVersions, articles, tags } from "@/db/schema";
import { articleDocumentToMarkdown } from "@/editor/serialization/markdown";

export async function getArticleOrganizationForUser(
  articleId: string,
  userId: string,
) {
  const database = getDatabase();
  const [tagRows, [versionSummary]] = await Promise.all([
    database
      .select({ label: tags.label })
      .from(articleTags)
      .innerJoin(tags, eq(tags.id, articleTags.tagId))
      .innerJoin(articles, eq(articles.id, articleTags.articleId))
      .where(and(eq(articles.id, articleId), eq(articles.userId, userId)))
      .orderBy(asc(articleTags.position), asc(tags.normalizedName)),
    database
      .select({
        count: count(articleVersions.id),
        latestAt: max(articleVersions.createdAt),
      })
      .from(articleVersions)
      .innerJoin(articles, eq(articles.id, articleVersions.articleId))
      .where(and(eq(articles.id, articleId), eq(articles.userId, userId))),
  ]);

  return {
    tags: tagRows.map((tag) => tag.label),
    versionCount: versionSummary?.count ?? 0,
    latestVersionAt: versionSummary?.latestAt ?? null,
  };
}

type UpdateStatusInput = {
  articleId: string;
  userId: string;
  expectedStatus: ArticleStatus;
  nextStatus: ArticleStatus;
};

export async function updateArticleStatusForUser(input: UpdateStatusInput) {
  const changedAt = new Date();
  const [updated] = await getDatabase()
    .update(articles)
    .set({
      status: input.nextStatus,
      publishedAt: input.nextStatus === "published" ? changedAt : undefined,
      updatedAt: changedAt,
    })
    .where(
      and(
        eq(articles.id, input.articleId),
        eq(articles.userId, input.userId),
        eq(articles.status, input.expectedStatus),
      ),
    )
    .returning({ status: articles.status, updatedAt: articles.updatedAt });

  if (updated) return { status: "updated" as const, article: updated };

  const [current] = await getDatabase()
    .select({ status: articles.status })
    .from(articles)
    .where(and(eq(articles.id, input.articleId), eq(articles.userId, input.userId)))
    .limit(1);

  return current ? { status: "conflict" as const, currentStatus: current.status } : null;
}

type UpdateTagsInput = {
  articleId: string;
  userId: string;
  labels: readonly string[];
};

export async function updateArticleTagsForUser(input: UpdateTagsInput) {
  const database = getDatabase();
  const [ownedArticle] = await database
    .select({ id: articles.id })
    .from(articles)
    .where(and(eq(articles.id, input.articleId), eq(articles.userId, input.userId)))
    .limit(1);

  if (!ownedArticle) return null;

  const canonicalTags = canonicalizeTagLabels(input.labels);
  const removeAssignments = database
    .delete(articleTags)
    .where(eq(articleTags.articleId, input.articleId));

  if (canonicalTags.length === 0) {
    await database.batch([removeAssignments]);
    return [];
  }

  const now = new Date();
  const upsertTags = database
    .insert(tags)
    .values(
      canonicalTags.map((tag) => ({
        id: randomUUID(),
        userId: input.userId,
        normalizedName: tag.normalizedName,
        label: tag.label,
        updatedAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: [tags.userId, tags.normalizedName],
      set: { label: sql`excluded.label`, updatedAt: now },
    });

  const normalizedNames = canonicalTags.map((tag) => tag.normalizedName);
  const assignTags = database
    .insert(articleTags)
    .select(
      database
        .select({
          articleId: sql<string>`${input.articleId}`.as("article_id"),
          tagId: tags.id,
          position: sql<number>`(row_number() over (order by ${tags.normalizedName}) - 1)::integer`.as(
            "position",
          ),
        })
        .from(tags)
        .where(
          and(
            eq(tags.userId, input.userId),
            inArray(tags.normalizedName, normalizedNames),
          ),
        ),
    )
    .onConflictDoUpdate({
      target: [articleTags.articleId, articleTags.tagId],
      set: { position: sql`excluded.position` },
    });

  await database.batch([upsertTags, removeAssignments, assignTags]);

  return canonicalTags.map((tag) => tag.label);
}

type CreateCheckpointInput = {
  articleId: string;
  userId: string;
  expectedRevision: number;
  label?: string;
};

export type CreateCheckpointQueryResult =
  | {
      status: "created";
      createdAt: Date;
      versionCount: number;
    }
  | {
      status: "conflict";
      currentRevision: number;
    }
  | null;

export async function createManualCheckpointForUser(
  input: CreateCheckpointInput,
): Promise<CreateCheckpointQueryResult> {
  const database = getDatabase();
  const [article] = await database
    .select({
      revision: articles.revision,
      title: articles.title,
      documentJson: articles.documentJson,
      plainText: articles.plainText,
    })
    .from(articles)
    .where(and(eq(articles.id, input.articleId), eq(articles.userId, input.userId)))
    .limit(1);

  if (!article) return null;
  if (article.revision !== input.expectedRevision) {
    return { status: "conflict", currentRevision: article.revision };
  }

  const [version] = await database
    .insert(articleVersions)
    .values({
      articleId: input.articleId,
      articleRevision: article.revision,
      title: article.title,
      documentJson: article.documentJson,
      plainText: article.plainText,
      markdown: articleDocumentToMarkdown(article.documentJson),
      reason: "manual",
      label: input.label?.trim() || null,
    })
    .returning({ createdAt: articleVersions.createdAt });

  if (!version) throw new Error("Manual checkpoint creation returned no version.");

  const [{ versionCount }] = await database
    .select({ versionCount: count(articleVersions.id) })
    .from(articleVersions)
    .where(eq(articleVersions.articleId, input.articleId));

  return {
    status: "created",
    createdAt: version.createdAt,
    versionCount: versionCount ?? 1,
  };
}
