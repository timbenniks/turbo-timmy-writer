import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type { ArticleBrief } from "@/ai/brief/model";

import { aiRuns } from "./ai-runs";
import { articles } from "./articles";

export const articleBriefSource = pgEnum("article_brief_source", [
  "user",
  "ai",
  "system",
]);

export const articleBriefs = pgTable(
  "article_briefs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    revision: integer("revision").notNull(),
    briefJson: jsonb("brief_json").$type<ArticleBrief>().notNull(),
    source: articleBriefSource("source").notNull(),
    aiRunId: uuid("ai_run_id").references(() => aiRuns.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("article_briefs_article_revision_unique").on(
      table.articleId,
      table.revision,
    ),
    index("article_briefs_article_created_idx").on(
      table.articleId,
      table.createdAt,
    ),
  ],
);

export type ArticleBriefRevision = typeof articleBriefs.$inferSelect;
