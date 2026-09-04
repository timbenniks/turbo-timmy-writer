import "server-only";

import { and, desc, eq } from "drizzle-orm";

import type { ArticleReviewOutput, ReviewKind } from "@/ai/review/model";
import { getDatabase } from "@/db/client";
import { articleReviews, articles } from "@/db/schema";

export async function listArticleReviewsForUser(articleId: string, userId: string) {
  return getDatabase().select().from(articleReviews)
    .where(and(eq(articleReviews.articleId, articleId), eq(articleReviews.userId, userId)))
    .orderBy(desc(articleReviews.createdAt))
    .limit(12);
}

export async function createArticleReviewForUser(input: {
  userId: string;
  articleId: string;
  runId: string;
  kind: ReviewKind;
  skillVersion: string;
  sourceRevision: number;
  result: ArticleReviewOutput;
}) {
  const [article] = await getDatabase().select({ revision: articles.revision })
    .from(articles)
    .where(and(eq(articles.id, input.articleId), eq(articles.userId, input.userId)))
    .limit(1);
  if (!article) return { status: "not-found" as const };
  if (article.revision !== input.sourceRevision) return { status: "superseded" as const };
  const [review] = await getDatabase().insert(articleReviews).values({
    userId: input.userId,
    articleId: input.articleId,
    aiRunId: input.runId,
    kind: input.kind,
    skillVersion: input.skillVersion,
    sourceRevision: input.sourceRevision,
    resultJson: input.result,
  }).returning();
  return review ? { status: "created" as const, review } : { status: "not-found" as const };
}
