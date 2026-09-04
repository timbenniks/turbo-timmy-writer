import "server-only";

import { randomUUID } from "node:crypto";

import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import {
  articleVersions,
  articles,
  publicationVariants,
} from "@/db/schema";
import { articleDocumentToMarkdown } from "@/editor/serialization/markdown";
import { hashCanonicalArticle, hashVariant } from "@/variants/hashing";
import {
  variantFreshness,
  variantPayloadSchema,
  type VariantContent,
  type VariantDestination,
  type VariantMetadata,
  type VariantStatus,
} from "@/variants/model";

const mutationRowSchema = z.object({
  id: z.uuid(),
  revision: z.coerce.number().int().positive(),
  updated_at: z.coerce.date(),
});

function validatedPayload(content: VariantContent, metadata: VariantMetadata) {
  return variantPayloadSchema.parse({ content, metadata });
}

export async function listPublicationVariantsForUser(articleId: string, userId: string) {
  const rows = await getDatabase()
    .select({
      id: publicationVariants.id,
      articleId: publicationVariants.articleId,
      destination: publicationVariants.destination,
      contentJson: publicationVariants.contentJson,
      metadataJson: publicationVariants.metadataJson,
      sourceArticleRevision: publicationVariants.sourceArticleRevision,
      sourceContentHash: publicationVariants.sourceContentHash,
      revision: publicationVariants.revision,
      hasManualEdits: publicationVariants.hasManualEdits,
      status: publicationVariants.status,
      publishedAt: publicationVariants.publishedAt,
      createdAt: publicationVariants.createdAt,
      updatedAt: publicationVariants.updatedAt,
      currentArticleRevision: articles.revision,
      currentTitle: articles.title,
      currentDocument: articles.documentJson,
    })
    .from(publicationVariants)
    .innerJoin(articles, eq(articles.id, publicationVariants.articleId))
    .where(
      and(
        eq(publicationVariants.articleId, articleId),
        eq(publicationVariants.userId, userId),
        eq(articles.userId, userId),
      ),
    )
    .orderBy(asc(publicationVariants.destination));

  return rows.map((row) => {
    const payload = validatedPayload(row.contentJson, row.metadataJson);
    const currentSource = {
      sourceArticleRevision: row.currentArticleRevision,
      sourceContentHash: hashCanonicalArticle({
        title: row.currentTitle,
        documentJson: row.currentDocument,
      }),
    };
    return {
      ...row,
      contentJson: payload.content,
      metadataJson: payload.metadata,
      freshness: variantFreshness({
        sourceArticleRevision: row.sourceArticleRevision,
        sourceContentHash: row.sourceContentHash,
      }, currentSource),
    };
  });
}

export async function getPublicationVariantForUser(variantId: string, userId: string) {
  const [row] = await getDatabase()
    .select()
    .from(publicationVariants)
    .where(and(eq(publicationVariants.id, variantId), eq(publicationVariants.userId, userId)))
    .limit(1);
  if (!row) return null;
  const payload = validatedPayload(row.contentJson, row.metadataJson);
  return { ...row, contentJson: payload.content, metadataJson: payload.metadata };
}

export async function createPublicationVariantForUser(input: {
  articleId: string;
  userId: string;
  expectedArticleRevision: number;
  sourceContentHash: string;
  canonicalMarkdown: string;
  destination: VariantDestination;
  content: VariantContent;
  metadata: VariantMetadata;
  aiRunId: string;
}) {
  const payload = validatedPayload(input.content, input.metadata);
  if (payload.content.destination !== input.destination) {
    throw new Error("Variant destination mismatch.");
  }
  const versionId = randomUUID();
  const variantId = randomUUID();
  const contentHash = hashVariant(payload);
  const result = await getDatabase().execute(sql`
    with source as materialized (
      select id, revision, title, document_json, plain_text
      from ${articles}
      where ${articles.id} = ${input.articleId}
        and ${articles.userId} = ${input.userId}
        and ${articles.revision} = ${input.expectedArticleRevision}
        and not exists (
          select 1 from ${publicationVariants}
          where ${publicationVariants.articleId} = ${input.articleId}
            and ${publicationVariants.destination} = ${input.destination}
        )
      for update
    ), versioned as (
      insert into ${articleVersions} (
        id, article_id, article_revision, title, document_json, plain_text,
        markdown, reason, label, ai_run_id
      )
      select
        ${versionId}, id, revision, title, document_json, plain_text,
        ${input.canonicalMarkdown}, 'variant-source', ${`Variant source: ${input.destination}`}, ${input.aiRunId}
      from source
      returning id
    ), created as (
      insert into ${publicationVariants} (
        id, user_id, article_id, destination, content_json, metadata_json,
        generated_from_version_id, generated_by_ai_run_id, source_article_revision,
        source_content_hash, content_hash
      )
      select
        ${variantId}, ${input.userId}, source.id, ${input.destination},
        ${JSON.stringify(payload.content)}::jsonb, ${JSON.stringify(payload.metadata)}::jsonb,
        versioned.id, ${input.aiRunId}, source.revision,
        ${input.sourceContentHash}, ${contentHash}
      from source cross join versioned
      on conflict (${publicationVariants.articleId}, ${publicationVariants.destination}) do nothing
      returning id, revision, updated_at
    )
    select * from created
  `);
  const parsed = mutationRowSchema.safeParse(result.rows[0]);
  if (parsed.success) return { status: "created" as const, variant: parsed.data };

  const [currentArticle, existingVariant] = await Promise.all([
    getDatabase().select({ revision: articles.revision }).from(articles)
      .where(and(eq(articles.id, input.articleId), eq(articles.userId, input.userId))).limit(1),
    getDatabase().select({ id: publicationVariants.id }).from(publicationVariants)
      .where(and(
        eq(publicationVariants.articleId, input.articleId),
        eq(publicationVariants.userId, input.userId),
        eq(publicationVariants.destination, input.destination),
      )).limit(1),
  ]);
  if (existingVariant[0]) return { status: "exists" as const };
  if (currentArticle[0]) {
    return { status: "article-conflict" as const, currentRevision: currentArticle[0].revision };
  }
  return { status: "not-found" as const };
}

export async function savePublicationVariantForUser(input: {
  variantId: string;
  userId: string;
  expectedRevision: number;
  content: VariantContent;
  metadata: VariantMetadata;
  status: VariantStatus;
}) {
  const payload = validatedPayload(input.content, input.metadata);
  const current = await getPublicationVariantForUser(input.variantId, input.userId);
  if (!current) return null;
  if (current.destination !== payload.content.destination) {
    throw new Error("Variant destination mismatch.");
  }
  const [saved] = await getDatabase().update(publicationVariants).set({
    contentJson: payload.content,
    metadataJson: payload.metadata,
    contentHash: hashVariant(payload),
    hasManualEdits: true,
    status: input.status,
    publishedAt: input.status === "published" ? current.publishedAt ?? new Date() : current.publishedAt,
    revision: input.expectedRevision + 1,
    updatedAt: new Date(),
  }).where(and(
    eq(publicationVariants.id, input.variantId),
    eq(publicationVariants.userId, input.userId),
    eq(publicationVariants.revision, input.expectedRevision),
  )).returning({
    id: publicationVariants.id,
    revision: publicationVariants.revision,
    updatedAt: publicationVariants.updatedAt,
  });
  if (saved) return { status: "saved" as const, variant: saved };

  const latest = await getPublicationVariantForUser(input.variantId, input.userId);
  return latest
    ? { status: "conflict" as const, currentRevision: latest.revision }
    : null;
}

export async function regeneratePublicationVariantForUser(input: {
  variantId: string;
  articleId: string;
  userId: string;
  expectedVariantRevision: number;
  expectedArticleRevision: number;
  sourceContentHash: string;
  canonicalMarkdown: string;
  content: VariantContent;
  metadata: VariantMetadata;
  aiRunId: string;
}) {
  const payload = validatedPayload(input.content, input.metadata);
  const contentHash = hashVariant(payload);
  const versionId = randomUUID();
  const snapshotId = randomUUID();
  const result = await getDatabase().execute(sql`
    with locked as materialized (
      select
        variant.id as variant_id,
        variant.destination,
        variant.revision as variant_revision,
        variant.content_json,
        variant.metadata_json,
        variant.content_hash,
        variant.has_manual_edits,
        article.id as article_id,
        article.revision as article_revision,
        article.title,
        article.document_json,
        article.plain_text
      from ${publicationVariants} as variant
      join ${articles} as article on article.id = variant.article_id
      where variant.id = ${input.variantId}
        and variant.user_id = ${input.userId}
        and article.id = ${input.articleId}
        and article.user_id = ${input.userId}
        and variant.revision = ${input.expectedVariantRevision}
        and article.revision = ${input.expectedArticleRevision}
      for update of variant, article
    ), snapshotted as (
      insert into publication_variant_versions (
        id, variant_id, variant_revision, content_json, metadata_json,
        content_hash, has_manual_edits, reason
      )
      select
        ${snapshotId}, variant_id, variant_revision, content_json, metadata_json,
        content_hash, has_manual_edits, 'pre-regeneration'
      from locked
      returning id
    ), versioned as (
      insert into ${articleVersions} (
        id, article_id, article_revision, title, document_json, plain_text,
        markdown, reason, label, ai_run_id
      )
      select
        ${versionId}, article_id, article_revision, title, document_json, plain_text,
        ${input.canonicalMarkdown}, 'variant-regeneration-source',
        ${"Variant regeneration source"}, ${input.aiRunId}
      from locked
      returning id
    ), updated as (
      update ${publicationVariants} as variant
      set
        content_json = ${JSON.stringify(payload.content)}::jsonb,
        metadata_json = ${JSON.stringify(payload.metadata)}::jsonb,
        generated_from_version_id = versioned.id,
        generated_by_ai_run_id = ${input.aiRunId},
        source_article_revision = locked.article_revision,
        source_content_hash = ${input.sourceContentHash},
        content_hash = ${contentHash},
        revision = locked.variant_revision + 1,
        has_manual_edits = false,
        status = 'draft',
        published_at = null,
        updated_at = now()
      from locked cross join versioned cross join snapshotted
      where variant.id = locked.variant_id
      returning variant.id, variant.revision, variant.updated_at
    )
    select * from updated
  `);
  const parsed = mutationRowSchema.safeParse(result.rows[0]);
  if (parsed.success) return { status: "regenerated" as const, variant: parsed.data };

  const [article, variant] = await Promise.all([
    getDatabase().select({ revision: articles.revision }).from(articles)
      .where(and(eq(articles.id, input.articleId), eq(articles.userId, input.userId))).limit(1),
    getPublicationVariantForUser(input.variantId, input.userId),
  ]);
  if (!article[0] || !variant) return { status: "not-found" as const };
  return {
    status: "conflict" as const,
    currentArticleRevision: article[0].revision,
    currentVariantRevision: variant.revision,
  };
}

export function articleVariantSource(article: {
  revision: number;
  title: string;
  documentJson: Parameters<typeof articleDocumentToMarkdown>[0];
}) {
  return {
    sourceArticleRevision: article.revision,
    sourceContentHash: hashCanonicalArticle(article),
    canonicalMarkdown: articleDocumentToMarkdown(article.documentJson),
  };
}
