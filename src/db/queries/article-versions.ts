import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { aiRuns, articles, articleVersions } from "@/db/schema";

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
