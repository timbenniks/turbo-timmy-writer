import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type { ArchiveDocumentMetadata } from "@/search/archive/model";

import { users } from "./users";

export const archiveDocuments = pgTable(
  "archive_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    sourceKey: text("source_key").notNull(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    bodyText: text("body_text").notNull(),
    sourceMarkup: text("source_markup"),
    tags: jsonb("tags").$type<string[]>().notNull(),
    source: text("source").notNull(),
    destination: text("destination").notNull(),
    contentHash: text("content_hash").notNull(),
    metadata: jsonb("metadata").$type<ArchiveDocumentMetadata>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("archive_documents_user_source_key_unique").on(
      table.userId,
      table.source,
      table.sourceKey,
    ),
    index("archive_documents_user_published_idx").on(
      table.userId,
      table.publishedAt,
    ),
  ],
);

export type ArchiveDocument = typeof archiveDocuments.$inferSelect;
export type NewArchiveDocument = typeof archiveDocuments.$inferInsert;
