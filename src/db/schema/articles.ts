import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import {
  articleStatuses,
  type ArticleMetadata,
} from "@/articles/model";
import type { ArticleDocument } from "@/editor/document";

import { users } from "./users";

export const articleStatus = pgEnum("article_status", articleStatuses);

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    status: articleStatus("status").notNull(),
    documentJson: jsonb("document_json").$type<ArticleDocument>().notNull(),
    plainText: text("plain_text").notNull(),
    metadata: jsonb("metadata").$type<ArticleMetadata>().notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("articles_user_slug_unique").on(table.userId, table.slug),
    index("articles_user_status_updated_idx").on(
      table.userId,
      table.status,
      table.updatedAt,
    ),
    index("articles_user_updated_idx").on(table.userId, table.updatedAt),
  ],
);

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
