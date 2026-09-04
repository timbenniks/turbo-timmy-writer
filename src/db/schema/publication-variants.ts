import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type { VariantContent, VariantMetadata } from "@/variants/model";
import { variantDestinations, variantStatuses } from "@/variants/model";

import { aiRuns } from "./ai-runs";
import { articleVersions } from "./article-versions";
import { articles } from "./articles";
import { users } from "./users";

export const variantDestination = pgEnum("variant_destination", variantDestinations);
export const variantStatus = pgEnum("variant_status", variantStatuses);

export const publicationVariants = pgTable(
  "publication_variants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    articleId: uuid("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
    destination: variantDestination("destination").notNull(),
    contentJson: jsonb("content_json").$type<VariantContent>().notNull(),
    metadataJson: jsonb("metadata_json").$type<VariantMetadata>().notNull(),
    generatedFromVersionId: uuid("generated_from_version_id").notNull().references(() => articleVersions.id, { onDelete: "restrict" }),
    generatedByAiRunId: uuid("generated_by_ai_run_id").references(() => aiRuns.id, { onDelete: "set null" }),
    sourceArticleRevision: integer("source_article_revision").notNull(),
    sourceContentHash: text("source_content_hash").notNull(),
    contentHash: text("content_hash").notNull(),
    revision: integer("revision").default(1).notNull(),
    hasManualEdits: boolean("has_manual_edits").default(false).notNull(),
    status: variantStatus("status").default("draft").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("publication_variants_article_destination_unique").on(table.articleId, table.destination),
    index("publication_variants_user_updated_idx").on(table.userId, table.updatedAt),
    check("publication_variants_positive_source_revision", sql`${table.sourceArticleRevision} > 0`),
    check("publication_variants_positive_revision", sql`${table.revision} > 0`),
    check("publication_variants_source_hash_shape", sql`${table.sourceContentHash} ~ '^[a-f0-9]{64}$'`),
    check("publication_variants_content_hash_shape", sql`${table.contentHash} ~ '^[a-f0-9]{64}$'`),
  ],
);

export const publicationVariantVersions = pgTable(
  "publication_variant_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    variantId: uuid("variant_id").notNull().references(() => publicationVariants.id, { onDelete: "cascade" }),
    variantRevision: integer("variant_revision").notNull(),
    contentJson: jsonb("content_json").$type<VariantContent>().notNull(),
    metadataJson: jsonb("metadata_json").$type<VariantMetadata>().notNull(),
    contentHash: text("content_hash").notNull(),
    hasManualEdits: boolean("has_manual_edits").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("publication_variant_versions_revision_unique").on(table.variantId, table.variantRevision),
    index("publication_variant_versions_created_idx").on(table.variantId, table.createdAt),
    check("publication_variant_versions_positive_revision", sql`${table.variantRevision} > 0`),
    check("publication_variant_versions_hash_shape", sql`${table.contentHash} ~ '^[a-f0-9]{64}$'`),
  ],
);

export type PublicationVariant = typeof publicationVariants.$inferSelect;
export type PublicationVariantVersion = typeof publicationVariantVersions.$inferSelect;
