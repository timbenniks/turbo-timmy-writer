import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import {
  publicationOperations,
  publicationStatuses,
} from "@/publishing/model";
import { websitePublicationTargets } from "@/publishing/website-contract";

import { articleVersions } from "./article-versions";
import { articles } from "./articles";
import { publicationVariants } from "./publication-variants";
import { users } from "./users";

export const publicationTarget = pgEnum("publication_target", websitePublicationTargets);
export const publicationOperation = pgEnum("publication_operation", publicationOperations);
export const publicationStatus = pgEnum("publication_status", publicationStatuses);

export const publications = pgTable(
  "publications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    articleId: uuid("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").notNull().references(() => publicationVariants.id, { onDelete: "cascade" }),
    publishedArticleVersionId: uuid("published_article_version_id").notNull().references(() => articleVersions.id, { onDelete: "restrict" }),
    target: publicationTarget("target").notNull(),
    operation: publicationOperation("operation").notNull(),
    status: publicationStatus("status").default("pending").notNull(),
    repository: text("repository").notNull(),
    path: text("path").notNull(),
    branch: text("branch").notNull(),
    variantRevision: integer("variant_revision").notNull(),
    markdownSnapshot: text("markdown_snapshot").notNull(),
    contentHash: text("content_hash").notNull(),
    expectedBlobSha: text("expected_blob_sha"),
    commitSha: text("commit_sha"),
    blobSha: text("blob_sha"),
    externalUrl: text("external_url"),
    requestMetadataJson: jsonb("request_metadata_json").$type<Record<string, unknown>>().default({}).notNull(),
    resultMetadataJson: jsonb("result_metadata_json").$type<Record<string, unknown>>(),
    errorCode: text("error_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("publications_variant_target_created_idx").on(table.variantId, table.target, table.createdAt),
    index("publications_user_created_idx").on(table.userId, table.createdAt),
    check("publications_positive_variant_revision", sql`${table.variantRevision} > 0`),
    check("publications_content_hash_shape", sql`${table.contentHash} ~ '^[a-f0-9]{64}$'`),
    check("publications_expected_blob_sha_shape", sql`${table.expectedBlobSha} is null or ${table.expectedBlobSha} ~ '^[a-f0-9]{40}$'`),
    check("publications_commit_sha_shape", sql`${table.commitSha} is null or ${table.commitSha} ~ '^[a-f0-9]{40}$'`),
    check("publications_blob_sha_shape", sql`${table.blobSha} is null or ${table.blobSha} ~ '^[a-f0-9]{40}$'`),
    check("publications_operation_sha_consistency", sql`(${table.operation} = 'create' and ${table.expectedBlobSha} is null) or (${table.operation} = 'update' and ${table.expectedBlobSha} is not null)`),
    check("publications_result_consistency", sql`
      (${table.status} = 'pending' and ${table.commitSha} is null and ${table.blobSha} is null and ${table.externalUrl} is null and ${table.errorCode} is null and ${table.completedAt} is null)
      or (${table.status} = 'succeeded' and ${table.commitSha} is not null and ${table.blobSha} is not null and ${table.externalUrl} is not null and ${table.errorCode} is null and ${table.completedAt} is not null)
      or (${table.status} = 'failed' and ${table.commitSha} is null and ${table.blobSha} is null and ${table.externalUrl} is null and ${table.errorCode} is not null and ${table.completedAt} is not null)
    `),
  ],
);
