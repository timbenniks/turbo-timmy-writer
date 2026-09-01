import { z } from "zod";

import { articleTitleSchema } from "@/articles/save";
import {
  ARTICLE_DOCUMENT_VERSION,
  articleDocumentSchema,
  type ArticleDocument,
} from "@/editor/document";

export const ARTICLE_RECOVERY_VERSION = 1 as const;
export const ARTICLE_RECOVERY_STORAGE_PREFIX = "turbo-timmy:article-recovery:";

export const articleRecoveryEnvelopeSchema = z.object({
  version: z.literal(ARTICLE_RECOVERY_VERSION),
  articleId: z.uuid(),
  clientId: z.string().min(1).max(100),
  baseRevision: z.int().positive(),
  changeRevision: z.int().nonnegative(),
  documentVersion: z.literal(ARTICLE_DOCUMENT_VERSION),
  title: articleTitleSchema,
  documentJson: articleDocumentSchema,
  updatedAt: z.iso.datetime(),
});

export type ArticleRecoveryEnvelope = z.infer<
  typeof articleRecoveryEnvelopeSchema
>;

type ServerArticleSnapshot = {
  articleId: string;
  revision: number;
  title: string;
  documentJson: ArticleDocument;
};

export type ArticleRecoveryDecision =
  | { kind: "discard" }
  | { kind: "recover"; envelope: ArticleRecoveryEnvelope }
  | { kind: "conflict"; envelope: ArticleRecoveryEnvelope };

export function articleRecoveryStorageKey(articleId: string, clientId: string) {
  return `${ARTICLE_RECOVERY_STORAGE_PREFIX}${articleId}:${clientId}`;
}

export function parseArticleRecoveryEnvelope(value: string | null) {
  if (!value) return null;

  try {
    const parsed = articleRecoveryEnvelopeSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function hasSameContent(
  envelope: ArticleRecoveryEnvelope,
  server: ServerArticleSnapshot,
) {
  return (
    envelope.title === server.title &&
    JSON.stringify(envelope.documentJson) === JSON.stringify(server.documentJson)
  );
}

export function decideArticleRecovery(
  envelope: ArticleRecoveryEnvelope,
  server: ServerArticleSnapshot,
): ArticleRecoveryDecision {
  if (envelope.articleId !== server.articleId || hasSameContent(envelope, server)) {
    return { kind: "discard" };
  }

  if (envelope.baseRevision === server.revision) {
    return { kind: "recover", envelope };
  }

  return { kind: "conflict", envelope };
}
