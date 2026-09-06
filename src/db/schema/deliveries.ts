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
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import {
  deliveryOperations,
  deliveryProviders,
  deliveryStatuses,
} from "@/delivery/model";

import { articleVersions } from "./article-versions";
import { articles } from "./articles";
import { publicationVariants } from "./publication-variants";
import { users } from "./users";

export const deliveryProvider = pgEnum("delivery_provider", deliveryProviders);
export const deliveryOperation = pgEnum("delivery_operation", deliveryOperations);
export const deliveryStatus = pgEnum("delivery_status", deliveryStatuses);

export const deliveries = pgTable(
  "deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    articleId: uuid("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").notNull().references(() => publicationVariants.id, { onDelete: "cascade" }),
    sourceArticleVersionId: uuid("source_article_version_id").notNull().references(() => articleVersions.id, { onDelete: "restrict" }),
    provider: deliveryProvider("provider").notNull(),
    operation: deliveryOperation("operation").notNull(),
    status: deliveryStatus("status").default("pending").notNull(),
    variantRevision: integer("variant_revision").notNull(),
    snapshotJson: jsonb("snapshot_json").$type<Record<string, unknown>>().notNull(),
    snapshotHash: text("snapshot_hash").notNull(),
    externalId: text("external_id"),
    externalUrl: text("external_url"),
    requestMetadataJson: jsonb("request_metadata_json").$type<Record<string, unknown>>().default({}).notNull(),
    resultMetadataJson: jsonb("result_metadata_json").$type<Record<string, unknown>>(),
    errorCode: text("error_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("deliveries_variant_provider_created_idx").on(table.variantId, table.provider, table.createdAt),
    index("deliveries_user_created_idx").on(table.userId, table.createdAt),
    uniqueIndex("deliveries_one_pending_provider_unique")
      .on(table.variantId, table.provider)
      .where(sql`${table.status} = 'pending'`),
    check("deliveries_positive_variant_revision", sql`${table.variantRevision} > 0`),
    check("deliveries_snapshot_hash_shape", sql`${table.snapshotHash} ~ '^[a-f0-9]{64}$'`),
    check("deliveries_result_consistency", sql`
      (${table.status} = 'pending' and ${table.externalId} is null and ${table.externalUrl} is null and ${table.errorCode} is null and ${table.completedAt} is null)
      or (${table.status} = 'succeeded' and ${table.externalId} is not null and ${table.errorCode} is null and ${table.completedAt} is not null)
      or (${table.status} = 'failed' and ${table.externalId} is null and ${table.externalUrl} is null and ${table.errorCode} is not null and ${table.completedAt} is not null)
    `),
  ],
);

export type Delivery = typeof deliveries.$inferSelect;
