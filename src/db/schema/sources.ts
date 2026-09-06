import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import type { SourceType } from "@/sources/model";

import { articles } from "./articles";
import { users } from "./users";

export const sourceType = pgEnum("source_type", [
  "webpage",
  "book",
  "paper",
  "interview",
  "video",
  "note",
  "other",
]);

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    type: sourceType("type").$type<SourceType>().notNull(),
    title: text("title").notNull(),
    url: text("url"),
    text: text("text"),
    notes: text("notes"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("sources_user_updated_idx").on(table.userId, table.updatedAt),
    check("sources_title_not_blank", sql`length(btrim(${table.title})) > 0`),
    check("sources_url_http_when_present", sql`${table.url} is null or ${table.url} ~ '^https?://'`),
  ],
);

export const articleSources = pgTable(
  "article_sources",
  {
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    quote: text("quote"),
    context: text("context"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.articleId, table.sourceId] }),
    index("article_sources_article_position_idx").on(table.articleId, table.position),
    index("article_sources_source_idx").on(table.sourceId),
    check("article_sources_position_nonnegative", sql`${table.position} >= 0`),
  ],
);

export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type ArticleSource = typeof articleSources.$inferSelect;
