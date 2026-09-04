import { createHash } from "node:crypto";

import { getEncoding } from "js-tiktoken";
import { z } from "zod";

export const ARCHIVE_CHUNKING_VERSION = 1 as const;
export const ARCHIVE_CHUNK_TARGET_TOKENS = 800;
export const ARCHIVE_CHUNK_OVERLAP_TOKENS = 100;
export const ARCHIVE_CHUNK_MIN_TOKENS = 500;
export const ARCHIVE_CHUNK_MAX_TOKENS = 1_000;
export const ARCHIVE_EMBEDDING_DIMENSIONS = 1_024;

const encoding = getEncoding("cl100k_base");

export const archiveChunkMetadataSchema = z.object({
  chunkingVersion: z.literal(ARCHIVE_CHUNKING_VERSION),
  encoding: z.literal("cl100k_base"),
  tokenStart: z.number().int().nonnegative(),
  tokenEnd: z.number().int().positive(),
});

export const archiveChunkCandidateSchema = z.object({
  archiveDocumentId: z.uuid(),
  ordinal: z.number().int().nonnegative(),
  bodyText: z.string().trim().min(1),
  tokenCount: z.number().int().positive().max(ARCHIVE_CHUNK_MAX_TOKENS),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  metadata: archiveChunkMetadataSchema,
});

export type ArchiveChunkMetadata = z.infer<typeof archiveChunkMetadataSchema>;
export type ArchiveChunkCandidate = z.infer<typeof archiveChunkCandidateSchema>;

function contentHash(title: string, bodyText: string) {
  return createHash("sha256")
    .update(JSON.stringify({
      version: ARCHIVE_CHUNKING_VERSION,
      title,
      bodyText,
    }))
    .digest("hex");
}

export function archiveChunkEmbeddingText(input: {
  title: string;
  bodyText: string;
}) {
  return `${input.title.trim()}\n\n${input.bodyText.trim()}`;
}

export function chunkArchiveDocument(input: {
  archiveDocumentId: string;
  title: string;
  bodyText: string;
}): ArchiveChunkCandidate[] {
  const parsed = z.object({
    archiveDocumentId: z.uuid(),
    title: z.string().trim().min(1),
    bodyText: z.string().trim().min(1),
  }).parse(input);
  const tokens = encoding.encode(parsed.bodyText);

  if (tokens.length <= ARCHIVE_CHUNK_MAX_TOKENS) {
    const bodyText = encoding.decode(tokens).trim();
    return [archiveChunkCandidateSchema.parse({
      archiveDocumentId: parsed.archiveDocumentId,
      ordinal: 0,
      bodyText,
      tokenCount: encoding.encode(bodyText).length,
      contentHash: contentHash(parsed.title, bodyText),
      metadata: {
        chunkingVersion: ARCHIVE_CHUNKING_VERSION,
        encoding: "cl100k_base",
        tokenStart: 0,
        tokenEnd: tokens.length,
      },
    })];
  }

  const chunkCount = Math.ceil(
    (tokens.length - ARCHIVE_CHUNK_OVERLAP_TOKENS) /
      (ARCHIVE_CHUNK_TARGET_TOKENS - ARCHIVE_CHUNK_OVERLAP_TOKENS),
  );
  const chunkSize = Math.ceil(
    (tokens.length + ARCHIVE_CHUNK_OVERLAP_TOKENS * (chunkCount - 1)) /
      chunkCount,
  );
  const step = chunkSize - ARCHIVE_CHUNK_OVERLAP_TOKENS;

  return Array.from({ length: chunkCount }, (_, ordinal) => {
    const tokenStart = ordinal * step;
    const tokenEnd = Math.min(tokenStart + chunkSize, tokens.length);
    const bodyText = encoding.decode(tokens.slice(tokenStart, tokenEnd)).trim();
    return archiveChunkCandidateSchema.parse({
      archiveDocumentId: parsed.archiveDocumentId,
      ordinal,
      bodyText,
      tokenCount: encoding.encode(bodyText).length,
      contentHash: contentHash(parsed.title, bodyText),
      metadata: {
        chunkingVersion: ARCHIVE_CHUNKING_VERSION,
        encoding: "cl100k_base",
        tokenStart,
        tokenEnd,
      },
    });
  });
}

type ExistingChunk = {
  archiveDocumentId: string;
  ordinal: number;
  contentHash: string;
};

function chunkKey(chunk: Pick<ExistingChunk, "archiveDocumentId" | "ordinal">) {
  return `${chunk.archiveDocumentId}:${chunk.ordinal}`;
}

export function planArchiveChunkReplacement(
  existing: readonly ExistingChunk[],
  incoming: readonly ArchiveChunkCandidate[],
) {
  const existingByKey = new Map(existing.map((chunk) => [chunkKey(chunk), chunk]));
  const incomingByKey = new Map(incoming.map((chunk) => [chunkKey(chunk), chunk]));
  if (existingByKey.size !== existing.length || incomingByKey.size !== incoming.length) {
    throw new Error("Archive chunks contain duplicate document ordinals.");
  }

  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  let removed = 0;

  for (const chunk of incoming) {
    const current = existingByKey.get(chunkKey(chunk));
    if (!current) inserted += 1;
    else if (current.contentHash === chunk.contentHash) unchanged += 1;
    else updated += 1;
  }
  for (const chunk of existing) {
    if (!incomingByKey.has(chunkKey(chunk))) removed += 1;
  }

  return { inserted, updated, unchanged, removed };
}

export function archiveEmbeddingIsCurrent(input: {
  hasEmbedding: boolean;
  embeddingModel: string | null;
  embeddingDimensions: number | null;
  desiredModel: string;
}) {
  return input.hasEmbedding &&
    input.embeddingModel === input.desiredModel &&
    input.embeddingDimensions === ARCHIVE_EMBEDDING_DIMENSIONS;
}
