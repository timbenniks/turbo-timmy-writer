import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import { articles, publications, publicationVariants } from "@/db/schema";
import type { WebsitePublicationTarget } from "@/publishing/website-contract";

const pendingRowSchema = z.object({ id: z.uuid() });

export async function listPublicationsForArticleUser(articleId: string, userId: string) {
  return getDatabase().select({
    id: publications.id,
    variantId: publications.variantId,
    target: publications.target,
    operation: publications.operation,
    status: publications.status,
    repository: publications.repository,
    path: publications.path,
    branch: publications.branch,
    commitSha: publications.commitSha,
    externalUrl: publications.externalUrl,
    errorCode: publications.errorCode,
    createdAt: publications.createdAt,
    completedAt: publications.completedAt,
  }).from(publications).where(and(
    eq(publications.articleId, articleId),
    eq(publications.userId, userId),
  )).orderBy(desc(publications.createdAt));
}

export async function latestSuccessfulPublicationForTarget(input: {
  variantId: string;
  userId: string;
  target: WebsitePublicationTarget;
}) {
  const [row] = await getDatabase().select({
    path: publications.path,
    repository: publications.repository,
    branch: publications.branch,
    commitSha: publications.commitSha,
    blobSha: publications.blobSha,
    externalUrl: publications.externalUrl,
  }).from(publications).where(and(
    eq(publications.variantId, input.variantId),
    eq(publications.userId, input.userId),
    eq(publications.target, input.target),
    eq(publications.status, "succeeded"),
  )).orderBy(desc(publications.completedAt)).limit(1);
  return row ?? null;
}

export async function createPendingPublicationForUser(input: {
  userId: string;
  articleId: string;
  variantId: string;
  expectedVariantRevision: number;
  expectedArticleRevision: number;
  sourceContentHash: string;
  target: WebsitePublicationTarget;
  operation: "create" | "update";
  repository: string;
  path: string;
  branch: string;
  markdownSnapshot: string;
  contentHash: string;
  expectedBlobSha: string | null;
}) {
  const result = await getDatabase().execute(sql`
    insert into ${publications} (
      user_id, article_id, variant_id, published_article_version_id,
      target, operation, repository, path, branch, variant_revision,
      markdown_snapshot, content_hash, expected_blob_sha, request_metadata_json
    )
    select
      variant.user_id, variant.article_id, variant.id, variant.generated_from_version_id,
      ${input.target}, ${input.operation}, ${input.repository}, ${input.path},
      ${input.branch}, variant.revision, ${input.markdownSnapshot}, ${input.contentHash},
      ${input.expectedBlobSha}, ${JSON.stringify({ confirmed: true })}::jsonb
    from ${publicationVariants} as variant
    join ${articles} as article on article.id = variant.article_id
      and article.user_id = variant.user_id
    where variant.id = ${input.variantId}
      and variant.user_id = ${input.userId}
      and variant.article_id = ${input.articleId}
      and variant.revision = ${input.expectedVariantRevision}
      and variant.destination = 'website'
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

export async function succeedPublicationForUser(input: {
  publicationId: string;
  userId: string;
  commitSha: string;
  blobSha: string;
  externalUrl: string;
  resultMetadata: Record<string, unknown>;
}) {
  const [row] = await getDatabase().update(publications).set({
    status: "succeeded",
    commitSha: input.commitSha,
    blobSha: input.blobSha,
    externalUrl: input.externalUrl,
    resultMetadataJson: input.resultMetadata,
    completedAt: new Date(),
  }).where(and(
    eq(publications.id, input.publicationId),
    eq(publications.userId, input.userId),
    eq(publications.status, "pending"),
  )).returning({ id: publications.id, completedAt: publications.completedAt });
  return row ?? null;
}

export async function failPublicationForUser(input: {
  publicationId: string;
  userId: string;
  errorCode: string;
  resultMetadata?: Record<string, unknown>;
}) {
  const [row] = await getDatabase().update(publications).set({
    status: "failed",
    errorCode: input.errorCode,
    resultMetadataJson: input.resultMetadata ?? null,
    completedAt: new Date(),
  }).where(and(
    eq(publications.id, input.publicationId),
    eq(publications.userId, input.userId),
    eq(publications.status, "pending"),
  )).returning({ id: publications.id, completedAt: publications.completedAt });
  return row ?? null;
}
