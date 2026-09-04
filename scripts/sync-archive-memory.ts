import { randomUUID } from "node:crypto";

import { neon } from "@neondatabase/serverless";
import { z } from "zod";

import {
  ARCHIVE_EMBEDDING_DIMENSIONS,
  archiveChunkEmbeddingText,
  chunkArchiveDocument,
  planArchiveChunkReplacement,
} from "../src/search/chunking/archive-chunks";
import { createOpenAiArchiveEmbeddingProvider } from "../src/search/embeddings/openai-provider";
import { createArchiveEmbeddings } from "../src/search/embeddings/provider";

const archiveDocumentsSchema = z.array(z.object({
  id: z.uuid(),
  title: z.string().min(1),
  body_text: z.string().min(1),
}));

const existingChunksSchema = z.array(z.object({
  archive_document_id: z.uuid(),
  ordinal: z.number().int().nonnegative(),
  content_hash: z.string(),
}));

const pendingChunksSchema = z.array(z.object({
  id: z.uuid(),
  title: z.string().min(1),
  body_text: z.string().min(1),
}));

function batches<T>(values: readonly T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

function vectorLiteral(values: readonly number[]) {
  return `[${values.join(",")}]`;
}

async function main() {
  const shouldWrite = process.argv.includes("--write");
  const shouldEmbed = process.argv.includes("--embed");
  if (shouldEmbed && !shouldWrite) {
    throw new Error("Embedding requires --write so cached vectors can be persisted.");
  }

  const databaseUrl = shouldWrite
    ? process.env.DATABASE_URL_UNPOOLED
    : process.env.DATABASE_URL;
  const githubLogin = z.string().trim().min(1).parse(
    process.env.ALLOWED_GITHUB_LOGIN,
  );
  if (!databaseUrl) {
    throw new Error(
      shouldWrite
        ? "DATABASE_URL_UNPOOLED is required for archive-memory writes."
        : "DATABASE_URL is required to inspect archive memory.",
    );
  }

  const sql = neon(databaseUrl);
  const ownerRows = await sql`
    select id from users where lower(github_login) = lower(${githubLogin}) limit 2
  `;
  if (ownerRows.length !== 1 || typeof ownerRows[0]?.id !== "string") {
    throw new Error(`Expected exactly one database user for ${githubLogin}.`);
  }
  const userId = ownerRows[0].id;
  const documents = archiveDocumentsSchema.parse(await sql`
    select id, title, body_text
    from archive_documents
    where user_id = ${userId}
    order by id
  `);
  if (documents.length === 0) {
    throw new Error("No archive documents are available to chunk.");
  }

  const chunks = documents.flatMap((document) =>
    chunkArchiveDocument({
      archiveDocumentId: document.id,
      title: document.title,
      bodyText: document.body_text,
    }),
  );
  const existingRows = existingChunksSchema.parse(await sql`
    select chunk.archive_document_id, chunk.ordinal, chunk.content_hash
    from archive_chunks as chunk
    join archive_documents as document on document.id = chunk.archive_document_id
    where document.user_id = ${userId}
  `);
  const plan = planArchiveChunkReplacement(
    existingRows.map((row) => ({
      archiveDocumentId: row.archive_document_id,
      ordinal: row.ordinal,
      contentHash: row.content_hash,
    })),
    chunks,
  );
  const baseSummary = {
    owner: githubLogin,
    documents: documents.length,
    chunks: chunks.length,
    inserted: plan.inserted,
    updated: plan.updated,
    unchanged: plan.unchanged,
    removed: plan.removed,
  };

  if (!shouldWrite) {
    console.log(JSON.stringify({ mode: "dry-run", ...baseSummary }, null, 2));
    return;
  }

  const now = new Date().toISOString();
  const chunkRows = chunks.map((chunk) => ({
    id: randomUUID(),
    archive_document_id: chunk.archiveDocumentId,
    ordinal: chunk.ordinal,
    body_text: chunk.bodyText,
    token_count: chunk.tokenCount,
    content_hash: chunk.contentHash,
    metadata: chunk.metadata,
    created_at: now,
    updated_at: now,
  }));
  const chunkCounts = new Map<string, number>();
  for (const chunk of chunks) {
    chunkCounts.set(
      chunk.archiveDocumentId,
      (chunkCounts.get(chunk.archiveDocumentId) ?? 0) + 1,
    );
  }
  const documentChunkCounts = documents.map((document) => ({
    archive_document_id: document.id,
    chunk_count: chunkCounts.get(document.id) ?? 0,
  }));

  await sql.transaction([
    sql`
      delete from archive_chunks as chunk
      using jsonb_to_recordset(${JSON.stringify(documentChunkCounts)}::jsonb) as desired(
        archive_document_id uuid, chunk_count integer
      )
      where chunk.archive_document_id = desired.archive_document_id
        and chunk.ordinal >= desired.chunk_count
    `,
    sql`
      insert into archive_chunks (
        id, archive_document_id, ordinal, body_text, token_count, content_hash,
        metadata, created_at, updated_at
      )
      select id, archive_document_id, ordinal, body_text, token_count,
        content_hash, metadata, created_at, updated_at
      from jsonb_to_recordset(${JSON.stringify(chunkRows)}::jsonb) as imported(
        id uuid, archive_document_id uuid, ordinal integer, body_text text,
        token_count integer, content_hash text, metadata jsonb,
        created_at timestamptz, updated_at timestamptz
      )
      on conflict (archive_document_id, ordinal) do update set
        body_text = excluded.body_text,
        token_count = excluded.token_count,
        content_hash = excluded.content_hash,
        metadata = excluded.metadata,
        embedding = null,
        embedding_model = null,
        embedding_dimensions = null,
        embedded_at = null,
        updated_at = excluded.updated_at
      where archive_chunks.content_hash is distinct from excluded.content_hash
    `,
  ]);

  if (!shouldEmbed) {
    console.log(JSON.stringify({ mode: "chunks-written", ...baseSummary }, null, 2));
    return;
  }

  const apiKey = z.string().min(1).parse(process.env.OPENAI_API_KEY);
  const model = z.string().trim().regex(/^text-embedding-3-[a-z0-9-]+$/)
    .max(200).parse(process.env.OPENAI_MODEL_EMBEDDING);
  const pending = pendingChunksSchema.parse(await sql`
    select chunk.id, document.title, chunk.body_text
    from archive_chunks as chunk
    join archive_documents as document on document.id = chunk.archive_document_id
    where document.user_id = ${userId}
      and (
        chunk.embedding is null
        or chunk.embedding_model is distinct from ${model}
        or chunk.embedding_dimensions is distinct from ${ARCHIVE_EMBEDDING_DIMENSIONS}
      )
    order by chunk.archive_document_id, chunk.ordinal
  `);
  const provider = createOpenAiArchiveEmbeddingProvider({ apiKey });
  let inputTokens = 0;

  for (const batch of batches(pending, 64)) {
    const result = await createArchiveEmbeddings(provider, {
      model,
      values: batch.map((chunk) => archiveChunkEmbeddingText({
        title: chunk.title,
        bodyText: chunk.body_text,
      })),
      signal: AbortSignal.timeout(60_000),
    });
    inputTokens += result.inputTokens ?? 0;
    const embeddedAt = new Date().toISOString();
    const embeddedRows = batch.map((chunk, index) => ({
      id: chunk.id,
      embedding: vectorLiteral(result.embeddings[index] ?? []),
    }));
    await sql`
      update archive_chunks as chunk set
        embedding = embedded.embedding::vector,
        embedding_model = ${model},
        embedding_dimensions = ${ARCHIVE_EMBEDDING_DIMENSIONS},
        embedded_at = ${embeddedAt},
        updated_at = ${embeddedAt}
      from jsonb_to_recordset(${JSON.stringify(embeddedRows)}::jsonb) as embedded(
        id uuid, embedding text
      )
      where chunk.id = embedded.id
    `;
  }

  console.log(JSON.stringify({
    mode: "embedded",
    ...baseSummary,
    model,
    dimensions: ARCHIVE_EMBEDDING_DIMENSIONS,
    embedded: pending.length,
    inputTokens,
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Archive-memory sync failed.");
  process.exitCode = 1;
});
