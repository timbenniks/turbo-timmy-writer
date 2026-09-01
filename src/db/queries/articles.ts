import "server-only";

import { randomUUID } from "node:crypto";

import { and, desc, eq, inArray } from "drizzle-orm";

import {
  emptyArticleMetadata,
  statusesForLibraryFilter,
  untitledArticleSlug,
  type LibraryFilter,
} from "@/articles/model";
import { getDatabase } from "@/db/client";
import { articles } from "@/db/schema";
import { emptyArticleDocument } from "@/editor/document";

const articleSummarySelection = {
  id: articles.id,
  title: articles.title,
  status: articles.status,
  plainText: articles.plainText,
  createdAt: articles.createdAt,
  updatedAt: articles.updatedAt,
};

export async function listArticlesForUser(
  userId: string,
  filter: LibraryFilter = "all",
) {
  const statuses = statusesForLibraryFilter(filter);

  return getDatabase()
    .select(articleSummarySelection)
    .from(articles)
    .where(
      and(eq(articles.userId, userId), inArray(articles.status, [...statuses])),
    )
    .orderBy(desc(articles.updatedAt));
}

export async function listRecentArticlesForUser(userId: string) {
  return getDatabase()
    .select(articleSummarySelection)
    .from(articles)
    .where(eq(articles.userId, userId))
    .orderBy(desc(articles.updatedAt))
    .limit(5);
}

export async function getArticleForUser(articleId: string, userId: string) {
  const [article] = await getDatabase()
    .select()
    .from(articles)
    .where(and(eq(articles.id, articleId), eq(articles.userId, userId)))
    .limit(1);

  return article ?? null;
}

export async function createBlankArticleForUser(userId: string) {
  const id = randomUUID();
  const [article] = await getDatabase()
    .insert(articles)
    .values({
      id,
      userId,
      title: "",
      slug: untitledArticleSlug(id),
      status: "drafting",
      documentJson: emptyArticleDocument,
      plainText: "",
      metadata: emptyArticleMetadata,
    })
    .returning({ id: articles.id });

  if (!article) {
    throw new Error("Blank article creation did not return an article ID.");
  }

  return article;
}

type SaveArticleForUserInput = {
  articleId: string;
  userId: string;
  title: string;
  documentJson: typeof articles.$inferInsert.documentJson;
  plainText: string;
  documentVersion: 1;
  expectedRevision: number;
};

export async function saveArticleForUser(input: SaveArticleForUserInput) {
  const savedAt = new Date();
  const [article] = await getDatabase()
    .update(articles)
    .set({
      title: input.title,
      documentJson: input.documentJson,
      plainText: input.plainText,
      metadata: { version: input.documentVersion },
      revision: input.expectedRevision + 1,
      updatedAt: savedAt,
    })
    .where(
      and(
        eq(articles.id, input.articleId),
        eq(articles.userId, input.userId),
        eq(articles.revision, input.expectedRevision),
      ),
    )
    .returning({ revision: articles.revision, updatedAt: articles.updatedAt });

  if (article) {
    return { status: "saved" as const, article };
  }

  const [currentArticle] = await getDatabase()
    .select({ revision: articles.revision })
    .from(articles)
    .where(and(eq(articles.id, input.articleId), eq(articles.userId, input.userId)))
    .limit(1);

  return currentArticle
    ? { status: "conflict" as const, currentRevision: currentArticle.revision }
    : null;
}
