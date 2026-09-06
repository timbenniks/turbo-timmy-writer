import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import { articles, deliveries, publicationVariants } from "@/db/schema";
import type { DeliveryOperation, DeliveryProvider } from "@/delivery/model";
import type { VariantDestination } from "@/variants/model";

const pendingRowSchema = z.object({ id: z.uuid() });

export async function listDeliveriesForArticleUser(articleId: string, userId: string) {
  return getDatabase().select({
    id: deliveries.id,
    variantId: deliveries.variantId,
    provider: deliveries.provider,
    operation: deliveries.operation,
    status: deliveries.status,
    variantRevision: deliveries.variantRevision,
    externalId: deliveries.externalId,
    externalUrl: deliveries.externalUrl,
    errorCode: deliveries.errorCode,
    createdAt: deliveries.createdAt,
    completedAt: deliveries.completedAt,
  }).from(deliveries).where(and(
    eq(deliveries.articleId, articleId),
    eq(deliveries.userId, userId),
  )).orderBy(desc(deliveries.createdAt));
}

export async function createPendingDeliveryForUser(input: {
  userId: string;
  articleId: string;
  variantId: string;
  expectedVariantRevision: number;
  expectedArticleRevision: number;
  sourceContentHash: string;
  destination: VariantDestination;
  provider: DeliveryProvider;
  operation: DeliveryOperation;
  snapshot: Record<string, unknown>;
  snapshotHash: string;
}) {
  const result = await getDatabase().execute(sql`
    insert into ${deliveries} (
      user_id, article_id, variant_id, source_article_version_id,
      provider, operation, variant_revision, snapshot_json, snapshot_hash,
      request_metadata_json
    )
    select
      variant.user_id, variant.article_id, variant.id, variant.generated_from_version_id,
      ${input.provider}, ${input.operation}, variant.revision,
      ${JSON.stringify(input.snapshot)}::jsonb, ${input.snapshotHash},
      ${JSON.stringify({ confirmed: true })}::jsonb
    from ${publicationVariants} as variant
    join ${articles} as article on article.id = variant.article_id
      and article.user_id = variant.user_id
    where variant.id = ${input.variantId}
      and variant.user_id = ${input.userId}
      and variant.article_id = ${input.articleId}
      and variant.revision = ${input.expectedVariantRevision}
      and variant.destination = ${input.destination}
      and variant.status in ('ready', 'published')
      and article.revision = ${input.expectedArticleRevision}
      and variant.source_article_revision = article.revision
      and variant.source_content_hash = ${input.sourceContentHash}
    on conflict do nothing
    returning id
  `);
  const parsed = pendingRowSchema.safeParse(result.rows[0]);
  return parsed.success ? parsed.data : null;
}

export async function succeedDeliveryForUser(input: {
  deliveryId: string;
  userId: string;
  externalId: string;
  externalUrl?: string | null;
  resultMetadata?: Record<string, unknown>;
}) {
  const [row] = await getDatabase().update(deliveries).set({
    status: "succeeded",
    externalId: input.externalId,
    externalUrl: input.externalUrl ?? null,
    resultMetadataJson: input.resultMetadata ?? {},
    completedAt: new Date(),
  }).where(and(
    eq(deliveries.id, input.deliveryId),
    eq(deliveries.userId, input.userId),
    eq(deliveries.status, "pending"),
  )).returning({ id: deliveries.id });
  return row ?? null;
}

export async function failDeliveryForUser(input: {
  deliveryId: string;
  userId: string;
  errorCode: string;
}) {
  const [row] = await getDatabase().update(deliveries).set({
    status: "failed",
    errorCode: input.errorCode,
    completedAt: new Date(),
  }).where(and(
    eq(deliveries.id, input.deliveryId),
    eq(deliveries.userId, input.userId),
    eq(deliveries.status, "pending"),
  )).returning({ id: deliveries.id });
  return row ?? null;
}
