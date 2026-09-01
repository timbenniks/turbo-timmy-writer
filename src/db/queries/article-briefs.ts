import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { articleBriefSchema, type ArticleBrief } from "@/ai/brief/model";
import { getDatabase } from "@/db/client";
import { articleBriefs, articles } from "@/db/schema";

export async function getCurrentArticleBriefForUser(
  articleId: string,
  userId: string,
) {
  const [row] = await getDatabase()
    .select({
      id: articleBriefs.id,
      revision: articleBriefs.revision,
      briefJson: articleBriefs.briefJson,
      source: articleBriefs.source,
      createdAt: articleBriefs.createdAt,
    })
    .from(articleBriefs)
    .innerJoin(articles, eq(articles.id, articleBriefs.articleId))
    .where(and(eq(articleBriefs.articleId, articleId), eq(articles.userId, userId)))
    .orderBy(desc(articleBriefs.revision))
    .limit(1);

  return row ? { ...row, briefJson: articleBriefSchema.parse(row.briefJson) } : null;
}

export async function createArticleBriefRevisionForUser(input: {
  articleId: string;
  userId: string;
  expectedRevision: number;
  brief: ArticleBrief;
  source: "user" | "ai" | "system";
  aiRunId?: string;
}) {
  const brief = articleBriefSchema.parse(input.brief);
  const current = await getCurrentArticleBriefForUser(input.articleId, input.userId);
  if (!current) return null;
  if (current.revision !== input.expectedRevision) {
    return { status: "conflict" as const, current };
  }

  const [created] = await getDatabase()
    .insert(articleBriefs)
    .values({
      articleId: input.articleId,
      revision: current.revision + 1,
      briefJson: brief,
      source: input.source,
      aiRunId: input.aiRunId,
    })
    .returning({
      id: articleBriefs.id,
      revision: articleBriefs.revision,
      briefJson: articleBriefs.briefJson,
      source: articleBriefs.source,
      createdAt: articleBriefs.createdAt,
    });

  if (!created) throw new Error("Brief revision creation returned no row.");
  return { status: "created" as const, brief: created };
}
