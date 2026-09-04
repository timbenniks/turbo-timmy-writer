import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

import {
  ARCHIVE_EMBEDDING_DIMENSIONS,
  type ArchiveChunkMetadata,
} from "@/search/chunking/archive-chunks";

import { archiveDocuments } from "./archive-documents";

export const archiveChunks = pgTable(
  "archive_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    archiveDocumentId: uuid("archive_document_id")
      .notNull()
      .references(() => archiveDocuments.id, { onDelete: "cascade" }),
    ordinal: integer("ordinal").notNull(),
    bodyText: text("body_text").notNull(),
    tokenCount: integer("token_count").notNull(),
    embedding: vector("embedding", {
      dimensions: ARCHIVE_EMBEDDING_DIMENSIONS,
    }),
    embeddingModel: text("embedding_model"),
    embeddingDimensions: integer("embedding_dimensions"),
    contentHash: text("content_hash").notNull(),
    metadata: jsonb("metadata").$type<ArchiveChunkMetadata>().notNull(),
    embeddedAt: timestamp("embedded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("archive_chunks_document_ordinal_unique").on(
      table.archiveDocumentId,
      table.ordinal,
    ),
    index("archive_chunks_document_idx").on(table.archiveDocumentId),
    index("archive_chunks_content_hash_idx").on(table.contentHash),
    check("archive_chunks_ordinal_check", sql`${table.ordinal} >= 0`),
    check("archive_chunks_token_count_check", sql`${table.tokenCount} > 0`),
    check(
      "archive_chunks_embedding_metadata_check",
      sql`(
        (${table.embedding} is null and ${table.embeddingModel} is null and ${table.embeddingDimensions} is null and ${table.embeddedAt} is null)
        or
        (${table.embedding} is not null and ${table.embeddingModel} is not null and ${table.embeddingDimensions} = 1024 and ${table.embeddedAt} is not null)
      )`,
    ),
  ],
);

export type ArchiveChunk = typeof archiveChunks.$inferSelect;
export type NewArchiveChunk = typeof archiveChunks.$inferInsert;
