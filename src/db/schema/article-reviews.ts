import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import type { ArticleReviewOutput, ReviewKind } from "@/ai/review/model";

import { aiRuns } from "./ai-runs";
import { articles } from "./articles";
import { users } from "./users";

export const articleReviews = pgTable(
  "article_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    articleId: uuid("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
    aiRunId: uuid("ai_run_id").notNull().references(() => aiRuns.id, { onDelete: "restrict" }),
    kind: text("kind").$type<ReviewKind>().notNull(),
    skillVersion: text("skill_version").notNull(),
    sourceRevision: integer("source_revision").notNull(),
    resultJson: jsonb("result_json").$type<ArticleReviewOutput>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("article_reviews_article_created_idx").on(table.articleId, table.createdAt),
    index("article_reviews_user_kind_idx").on(table.userId, table.kind),
  ],
);

export type ArticleReview = typeof articleReviews.$inferSelect;
