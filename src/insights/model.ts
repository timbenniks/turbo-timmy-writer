import type { ArticleStatus } from "@/articles/model";

type UsageRows = {
  articles: { status: ArticleStatus; wordCount: number; updatedAt: Date }[];
  aiRuns: {
    status: "running" | "succeeded" | "failed" | "cancelled";
    inputTokens: number | null;
    outputTokens: number | null;
    durationMs: number | null;
    createdAt: Date;
  }[];
  variants: { status: "draft" | "ready" | "published"; hasManualEdits: boolean; updatedAt: Date }[];
  publications: { status: "pending" | "succeeded" | "failed"; createdAt: Date }[];
};

function isRecent(date: Date, cutoff: number) {
  return date.getTime() >= cutoff;
}

export function summarizeUsage(rows: UsageRows, now = new Date()) {
  const cutoff = now.getTime() - 30 * 24 * 60 * 60 * 1_000;
  const articleStatuses = {
    idea: 0,
    interviewing: 0,
    drafting: 0,
    editing: 0,
    ready: 0,
    published: 0,
    archived: 0,
  } satisfies Record<ArticleStatus, number>;
  for (const article of rows.articles) articleStatuses[article.status] += 1;

  const completedAiRuns = rows.aiRuns.filter((run) => run.status !== "running");
  const measuredDurations = completedAiRuns.flatMap((run) => run.durationMs === null ? [] : [run.durationMs]);

  return {
    articles: {
      total: rows.articles.length,
      words: rows.articles.reduce((total, article) => total + article.wordCount, 0),
      activeLast30Days: rows.articles.filter((article) => isRecent(article.updatedAt, cutoff)).length,
      statuses: articleStatuses,
    },
    ai: {
      total: rows.aiRuns.length,
      succeeded: rows.aiRuns.filter((run) => run.status === "succeeded").length,
      failed: rows.aiRuns.filter((run) => run.status === "failed").length,
      inputTokens: rows.aiRuns.reduce((total, run) => total + (run.inputTokens ?? 0), 0),
      outputTokens: rows.aiRuns.reduce((total, run) => total + (run.outputTokens ?? 0), 0),
      averageDurationMs: measuredDurations.length
        ? Math.round(measuredDurations.reduce((total, duration) => total + duration, 0) / measuredDurations.length)
        : null,
      last30Days: rows.aiRuns.filter((run) => isRecent(run.createdAt, cutoff)).length,
    },
    variants: {
      total: rows.variants.length,
      ready: rows.variants.filter((variant) => variant.status === "ready").length,
      manuallyEdited: rows.variants.filter((variant) => variant.hasManualEdits).length,
    },
    publications: {
      total: rows.publications.length,
      succeeded: rows.publications.filter((publication) => publication.status === "succeeded").length,
      failed: rows.publications.filter((publication) => publication.status === "failed").length,
      last30Days: rows.publications.filter((publication) => isRecent(publication.createdAt, cutoff)).length,
    },
  };
}

export type UsageSummary = ReturnType<typeof summarizeUsage>;
