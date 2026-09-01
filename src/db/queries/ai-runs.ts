import "server-only";

import { and, eq } from "drizzle-orm";

import type {
  AiRunStore,
  CompleteAiRunInput,
  StartAiRunInput,
} from "@/ai/runtime/run-store";
import { getDatabase } from "@/db/client";
import { aiRuns, articles } from "@/db/schema";

async function verifyArticleOwnership(articleId: string, userId: string) {
  const [article] = await getDatabase()
    .select({ id: articles.id })
    .from(articles)
    .where(and(eq(articles.id, articleId), eq(articles.userId, userId)))
    .limit(1);
  return Boolean(article);
}

export const databaseAiRunStore: AiRunStore = {
  async start(input: StartAiRunInput) {
    if (
      input.articleId &&
      !(await verifyArticleOwnership(input.articleId, input.userId))
    ) {
      throw new Error("The related article was not found.");
    }
    const [run] = await getDatabase()
      .insert(aiRuns)
      .values({
        userId: input.userId,
        articleId: input.articleId,
        skillId: input.skillId,
        skillVersion: input.skillVersion,
        model: input.model,
      })
      .returning({ id: aiRuns.id });
    if (!run) throw new Error("The AI run could not be started.");
    return run;
  },

  async complete(input: CompleteAiRunInput) {
    const [completed] = await getDatabase()
      .update(aiRuns)
      .set({
        status: input.status,
        inputTokens: input.usage?.inputTokens,
        outputTokens: input.usage?.outputTokens,
        durationMs: input.durationMs,
        outcomeJson: input.outcome,
        errorCode: input.errorCode,
        completedAt: input.completedAt,
      })
      .where(
        and(
          eq(aiRuns.id, input.id),
          eq(aiRuns.userId, input.userId),
          eq(aiRuns.status, "running"),
        ),
      )
      .returning({ id: aiRuns.id });
    if (!completed) throw new Error("The AI run was already finalized or missing.");
  },
};
