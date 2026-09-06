import "server-only";

import { asc, eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  articles,
  articleTags,
  articleVersions,
  publications,
  publicationVariants,
  tags,
} from "@/db/schema";
import { articleDocumentToMarkdown } from "@/editor/serialization/markdown";
import { portableBackupVersion } from "@/export/model";

export async function getPortableWritingBackupForUser(userId: string, exportedAt = new Date()) {
  const database = getDatabase();
  const [articleRows, tagRows, versionRows, variantRows, publicationRows] = await Promise.all([
    database
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        status: articles.status,
        documentJson: articles.documentJson,
        plainText: articles.plainText,
        metadata: articles.metadata,
        revision: articles.revision,
        publishedAt: articles.publishedAt,
        createdAt: articles.createdAt,
        updatedAt: articles.updatedAt,
      })
      .from(articles)
      .where(eq(articles.userId, userId))
      .orderBy(asc(articles.id)),
    database
      .select({ articleId: articleTags.articleId, label: tags.label })
      .from(articleTags)
      .innerJoin(articles, eq(articles.id, articleTags.articleId))
      .innerJoin(tags, eq(tags.id, articleTags.tagId))
      .where(eq(articles.userId, userId))
      .orderBy(asc(articleTags.articleId), asc(articleTags.position), asc(tags.label)),
    database
      .select({
        id: articleVersions.id,
        articleId: articleVersions.articleId,
        articleRevision: articleVersions.articleRevision,
        title: articleVersions.title,
        documentJson: articleVersions.documentJson,
        plainText: articleVersions.plainText,
        markdown: articleVersions.markdown,
        reason: articleVersions.reason,
        label: articleVersions.label,
        aiRunId: articleVersions.aiRunId,
        createdAt: articleVersions.createdAt,
      })
      .from(articleVersions)
      .innerJoin(articles, eq(articles.id, articleVersions.articleId))
      .where(eq(articles.userId, userId))
      .orderBy(asc(articleVersions.id)),
    database
      .select({
        id: publicationVariants.id,
        articleId: publicationVariants.articleId,
        destination: publicationVariants.destination,
        contentJson: publicationVariants.contentJson,
        metadataJson: publicationVariants.metadataJson,
        generatedFromVersionId: publicationVariants.generatedFromVersionId,
        generatedByAiRunId: publicationVariants.generatedByAiRunId,
        sourceArticleRevision: publicationVariants.sourceArticleRevision,
        sourceContentHash: publicationVariants.sourceContentHash,
        contentHash: publicationVariants.contentHash,
        revision: publicationVariants.revision,
        hasManualEdits: publicationVariants.hasManualEdits,
        status: publicationVariants.status,
        publishedAt: publicationVariants.publishedAt,
        createdAt: publicationVariants.createdAt,
        updatedAt: publicationVariants.updatedAt,
      })
      .from(publicationVariants)
      .where(eq(publicationVariants.userId, userId))
      .orderBy(asc(publicationVariants.id)),
    database
      .select({
        id: publications.id,
        articleId: publications.articleId,
        variantId: publications.variantId,
        publishedArticleVersionId: publications.publishedArticleVersionId,
        target: publications.target,
        operation: publications.operation,
        status: publications.status,
        repository: publications.repository,
        path: publications.path,
        branch: publications.branch,
        variantRevision: publications.variantRevision,
        markdownSnapshot: publications.markdownSnapshot,
        contentHash: publications.contentHash,
        expectedBlobSha: publications.expectedBlobSha,
        commitSha: publications.commitSha,
        blobSha: publications.blobSha,
        externalUrl: publications.externalUrl,
        errorCode: publications.errorCode,
        createdAt: publications.createdAt,
        completedAt: publications.completedAt,
      })
      .from(publications)
      .where(eq(publications.userId, userId))
      .orderBy(asc(publications.id)),
  ]);
  const tagsByArticle = new Map<string, string[]>();
  for (const tag of tagRows) {
    const labels = tagsByArticle.get(tag.articleId) ?? [];
    labels.push(tag.label);
    tagsByArticle.set(tag.articleId, labels);
  }
  return {
    schemaVersion: portableBackupVersion,
    exportedAt: exportedAt.toISOString(),
    scope: "writing" as const,
    articles: articleRows.map((article) => ({
      ...article,
      markdown: articleDocumentToMarkdown(article.documentJson),
      tags: tagsByArticle.get(article.id) ?? [],
    })),
    articleVersions: versionRows,
    publicationVariants: variantRows,
    publications: publicationRows,
  };
}
