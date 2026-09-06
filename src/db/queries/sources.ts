import "server-only";

import { randomUUID } from "node:crypto";

import { and, asc, eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { articles, articleSources, sources } from "@/db/schema";
import type { ArticleSourceDetails, SourceInput } from "@/sources/model";

const articleSourceSelection = {
  id: sources.id,
  type: sources.type,
  title: sources.title,
  url: sources.url,
  text: sources.text,
  notes: sources.notes,
  quote: articleSources.quote,
  context: articleSources.context,
  position: articleSources.position,
  createdAt: sources.createdAt,
  updatedAt: sources.updatedAt,
};

export async function listArticleSourcesForUser(articleId: string, userId: string) {
  return getDatabase()
    .select(articleSourceSelection)
    .from(articleSources)
    .innerJoin(sources, eq(sources.id, articleSources.sourceId))
    .innerJoin(articles, eq(articles.id, articleSources.articleId))
    .where(and(
      eq(articleSources.articleId, articleId),
      eq(articles.userId, userId),
      eq(sources.userId, userId),
    ))
    .orderBy(asc(articleSources.position), asc(sources.title), asc(sources.id));
}

export async function createArticleSourceForUser(input: {
  articleId: string;
  userId: string;
  source: SourceInput;
  link: ArticleSourceDetails;
}) {
  const database = getDatabase();
  const [ownedArticle] = await database
    .select({ id: articles.id })
    .from(articles)
    .where(and(eq(articles.id, input.articleId), eq(articles.userId, input.userId)))
    .limit(1);
  if (!ownedArticle) return null;

  const sourceId = randomUUID();
  const now = new Date();
  await database.batch([
    database.insert(sources).values({
      id: sourceId,
      userId: input.userId,
      ...input.source,
      updatedAt: now,
    }),
    database.insert(articleSources).values({
      articleId: input.articleId,
      sourceId,
      ...input.link,
      updatedAt: now,
    }),
  ]);
  return { id: sourceId };
}

export async function updateArticleSourceForUser(input: {
  articleId: string;
  sourceId: string;
  userId: string;
  source: SourceInput;
  link: ArticleSourceDetails;
}) {
  const database = getDatabase();
  const [ownedLink] = await database
    .select({ sourceId: sources.id })
    .from(articleSources)
    .innerJoin(sources, eq(sources.id, articleSources.sourceId))
    .innerJoin(articles, eq(articles.id, articleSources.articleId))
    .where(and(
      eq(articleSources.articleId, input.articleId),
      eq(articleSources.sourceId, input.sourceId),
      eq(articles.userId, input.userId),
      eq(sources.userId, input.userId),
    ))
    .limit(1);
  if (!ownedLink) return false;

  const now = new Date();
  await database.batch([
    database
      .update(sources)
      .set({ ...input.source, updatedAt: now })
      .where(and(eq(sources.id, input.sourceId), eq(sources.userId, input.userId))),
    database
      .update(articleSources)
      .set({ ...input.link, updatedAt: now })
      .where(and(
        eq(articleSources.articleId, input.articleId),
        eq(articleSources.sourceId, input.sourceId),
      )),
  ]);
  return true;
}

export async function removeArticleSourceForUser(input: {
  articleId: string;
  sourceId: string;
  userId: string;
}) {
  const database = getDatabase();
  const [ownedLink] = await database
    .select({ sourceId: sources.id })
    .from(articleSources)
    .innerJoin(sources, eq(sources.id, articleSources.sourceId))
    .innerJoin(articles, eq(articles.id, articleSources.articleId))
    .where(and(
      eq(articleSources.articleId, input.articleId),
      eq(articleSources.sourceId, input.sourceId),
      eq(articles.userId, input.userId),
      eq(sources.userId, input.userId),
    ))
    .limit(1);
  if (!ownedLink) return false;

  const [removed] = await database
    .delete(articleSources)
    .where(and(
      eq(articleSources.articleId, input.articleId),
      eq(articleSources.sourceId, input.sourceId),
    ))
    .returning({ sourceId: articleSources.sourceId });
  return Boolean(removed);
}
