import "server-only";

import { eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { aiRuns, articles, publications, publicationVariants } from "@/db/schema";
import { summarizeUsage } from "@/insights/model";

export async function getUsageSummaryForUser(userId: string) {
  const database = getDatabase();
  const [articleRows, aiRunRows, variantRows, publicationRows] = await Promise.all([
    database
      .select({ status: articles.status, plainText: articles.plainText, updatedAt: articles.updatedAt })
      .from(articles)
      .where(eq(articles.userId, userId)),
    database
      .select({
        status: aiRuns.status,
        inputTokens: aiRuns.inputTokens,
        outputTokens: aiRuns.outputTokens,
        durationMs: aiRuns.durationMs,
        createdAt: aiRuns.createdAt,
      })
      .from(aiRuns)
      .where(eq(aiRuns.userId, userId)),
    database
      .select({
        status: publicationVariants.status,
        hasManualEdits: publicationVariants.hasManualEdits,
        updatedAt: publicationVariants.updatedAt,
      })
      .from(publicationVariants)
      .where(eq(publicationVariants.userId, userId)),
    database
      .select({ status: publications.status, createdAt: publications.createdAt })
      .from(publications)
      .where(eq(publications.userId, userId)),
  ]);
  return summarizeUsage({
    articles: articleRows,
    aiRuns: aiRunRows,
    variants: variantRows,
    publications: publicationRows,
  });
}
