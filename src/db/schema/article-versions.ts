import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import type { ArticleDocument } from "@/editor/document";

import { articles } from "./articles";

export const articleVersions = pgTable(
  "article_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    articleRevision: integer("article_revision").notNull(),
    title: text("title").notNull(),
    documentJson: jsonb("document_json").$type<ArticleDocument>().notNull(),
    plainText: text("plain_text").notNull(),
    markdown: text("markdown").notNull(),
    reason: text("reason").notNull(),
    label: text("label"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("article_versions_article_created_idx").on(
      table.articleId,
      table.createdAt,
    ),
  ],
);

export type ArticleVersion = typeof articleVersions.$inferSelect;
