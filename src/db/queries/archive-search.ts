import "server-only";

import { sql } from "drizzle-orm";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import { archiveChunks, archiveDocuments } from "@/db/schema";
import {
  ARCHIVE_EMBEDDING_DIMENSIONS,
} from "@/search/chunking/archive-chunks";
import type { ArchiveEmbeddingProvider } from "@/search/embeddings/provider";
import { createArchiveEmbeddings } from "@/search/embeddings/provider";
import {
  archiveSearchInputSchema,
  rankArchiveSearchCandidates,
  type ArchiveSearchCandidate,
  type ArchiveSearchInput,
} from "@/search/retrieval/model";

const rowSchema = z.object({
  chunk_id: z.uuid(),
  archive_document_id: z.uuid(),
  chunk_ordinal: z.coerce.number().int().nonnegative(),
  title: z.string().min(1),
  url: z.url(),
  published_at: z.coerce.date(),
  tags: z.array(z.string()),
  source: z.string().min(1),
  destination: z.string().min(1),
  passage: z.string().min(1),
  score: z.coerce.number().finite(),
});

type SearchDependencies = {
  embeddingProvider?: ArchiveEmbeddingProvider;
  embeddingModel?: string;
};

function vectorLiteral(values: readonly number[]) {
  return `[${values.join(",")}]`;
}

function candidateLimit(limit: number) {
  return Math.min(80, Math.max(20, limit * 4));
}

async function literalCandidates(
  userId: string,
  input: ArchiveSearchInput,
): Promise<ArchiveSearchCandidate[]> {
  const result = await getDatabase().execute(sql`
    with query as (
      select websearch_to_tsquery('english', ${input.query}) as value
    ), ranked as (
      select
        ${archiveChunks.id} as chunk_id,
        ${archiveDocuments.id} as archive_document_id,
        ${archiveChunks.ordinal} as chunk_ordinal,
        ${archiveDocuments.title} as title,
        ${archiveDocuments.url} as url,
        ${archiveDocuments.publishedAt} as published_at,
        ${archiveDocuments.tags} as tags,
        ${archiveDocuments.source} as source,
        ${archiveDocuments.destination} as destination,
        ${archiveChunks.bodyText} as passage,
        ts_rank_cd(
          setweight(to_tsvector('english', ${archiveDocuments.title}), 'A') ||
          setweight(to_tsvector('english', ${archiveChunks.bodyText}), 'B'),
          query.value,
          32
        ) as score
      from ${archiveChunks}
      join ${archiveDocuments}
        on ${archiveDocuments.id} = ${archiveChunks.archiveDocumentId}
      cross join query
      where ${archiveDocuments.userId} = ${userId}
        and (
          ${input.excludeArchiveDocumentId ?? null}::uuid is null
          or ${archiveDocuments.id} <> ${input.excludeArchiveDocumentId ?? null}::uuid
        )
        and (
          ${input.excludeArchiveSlug ?? null}::text is null
          or ${archiveDocuments.metadata}->>'slug' is distinct from ${input.excludeArchiveSlug ?? null}::text
        )
        and (
          setweight(to_tsvector('english', ${archiveDocuments.title}), 'A') ||
          setweight(to_tsvector('english', ${archiveChunks.bodyText}), 'B')
        ) @@ query.value
    )
    select * from ranked
    order by score desc, published_at desc, chunk_ordinal asc
    limit ${candidateLimit(input.limit)}
  `);

  return result.rows.map((row) => {
    const parsed = rowSchema.parse(row);
    return {
      chunkId: parsed.chunk_id,
      archiveDocumentId: parsed.archive_document_id,
      chunkOrdinal: parsed.chunk_ordinal,
      title: parsed.title,
      url: parsed.url,
      publishedAt: parsed.published_at,
      tags: parsed.tags,
      source: parsed.source,
      destination: parsed.destination,
      passage: parsed.passage,
      literalScore: parsed.score,
    };
  });
}

async function semanticCandidates(
  userId: string,
  input: ArchiveSearchInput,
  dependencies: Required<SearchDependencies>,
): Promise<ArchiveSearchCandidate[]> {
  const embedded = await createArchiveEmbeddings(dependencies.embeddingProvider, {
    model: dependencies.embeddingModel,
    values: [input.query],
    signal: AbortSignal.timeout(30_000),
  });
  const vector = vectorLiteral(embedded.embeddings[0] ?? []);
  const result = await getDatabase().execute(sql`
    select
      ${archiveChunks.id} as chunk_id,
      ${archiveDocuments.id} as archive_document_id,
      ${archiveChunks.ordinal} as chunk_ordinal,
      ${archiveDocuments.title} as title,
      ${archiveDocuments.url} as url,
      ${archiveDocuments.publishedAt} as published_at,
      ${archiveDocuments.tags} as tags,
      ${archiveDocuments.source} as source,
      ${archiveDocuments.destination} as destination,
      ${archiveChunks.bodyText} as passage,
      1 - (${archiveChunks.embedding} <=> ${vector}::vector) as score
    from ${archiveChunks}
    join ${archiveDocuments}
      on ${archiveDocuments.id} = ${archiveChunks.archiveDocumentId}
    where ${archiveDocuments.userId} = ${userId}
      and ${archiveChunks.embedding} is not null
      and ${archiveChunks.embeddingModel} = ${dependencies.embeddingModel}
      and ${archiveChunks.embeddingDimensions} = ${ARCHIVE_EMBEDDING_DIMENSIONS}
      and (
        ${input.excludeArchiveDocumentId ?? null}::uuid is null
        or ${archiveDocuments.id} <> ${input.excludeArchiveDocumentId ?? null}::uuid
      )
      and (
        ${input.excludeArchiveSlug ?? null}::text is null
        or ${archiveDocuments.metadata}->>'slug' is distinct from ${input.excludeArchiveSlug ?? null}::text
      )
    order by ${archiveChunks.embedding} <=> ${vector}::vector
    limit ${candidateLimit(input.limit)}
  `);

  return result.rows.map((row) => {
    const parsed = rowSchema.parse(row);
    return {
      chunkId: parsed.chunk_id,
      archiveDocumentId: parsed.archive_document_id,
      chunkOrdinal: parsed.chunk_ordinal,
      title: parsed.title,
      url: parsed.url,
      publishedAt: parsed.published_at,
      tags: parsed.tags,
      source: parsed.source,
      destination: parsed.destination,
      passage: parsed.passage,
      semanticScore: parsed.score,
    };
  });
}

export async function searchArchiveForUser(
  userId: string,
  rawInput: ArchiveSearchInput,
  dependencies: SearchDependencies = {},
) {
  const input = archiveSearchInputSchema.parse(rawInput);
  const literal = input.mode === "semantic"
    ? []
    : await literalCandidates(userId, input);
  let semantic: ArchiveSearchCandidate[] = [];

  if (input.mode !== "literal") {
    if (!dependencies.embeddingProvider || !dependencies.embeddingModel) {
      throw new Error("Semantic archive search is not configured.");
    }
    semantic = await semanticCandidates(userId, input, {
      embeddingProvider: dependencies.embeddingProvider,
      embeddingModel: dependencies.embeddingModel,
    });
  }

  return rankArchiveSearchCandidates([...literal, ...semantic], input.mode, input.limit);
}
