import { z } from "zod";

import { ARCHIVE_EMBEDDING_DIMENSIONS } from "@/search/chunking/archive-chunks";

export type ArchiveEmbeddingRequest = {
  model: string;
  values: string[];
  dimensions: typeof ARCHIVE_EMBEDDING_DIMENSIONS;
  signal?: AbortSignal;
};

export type ArchiveEmbeddingResponse = {
  embeddings: number[][];
  inputTokens?: number;
};

export interface ArchiveEmbeddingProvider {
  embedMany(request: ArchiveEmbeddingRequest): Promise<ArchiveEmbeddingResponse>;
}

export class ArchiveEmbeddingError extends Error {
  constructor(
    public readonly code: string,
    message = "The archive embedding request failed.",
  ) {
    super(message);
    this.name = "ArchiveEmbeddingError";
  }
}

export async function createArchiveEmbeddings(
  provider: ArchiveEmbeddingProvider,
  request: Omit<ArchiveEmbeddingRequest, "dimensions">,
) {
  const model = z.string().trim().regex(/^text-embedding-3-[a-z0-9-]+$/)
    .max(200).parse(request.model);
  const values = z.array(z.string().trim().min(1).max(40_000)).min(1).max(64)
    .parse(request.values);
  const response = await provider.embedMany({
    model,
    values,
    dimensions: ARCHIVE_EMBEDDING_DIMENSIONS,
    signal: request.signal,
  });

  if (response.embeddings.length !== values.length) {
    throw new ArchiveEmbeddingError("embedding_count_mismatch");
  }
  for (const embedding of response.embeddings) {
    if (
      embedding.length !== ARCHIVE_EMBEDDING_DIMENSIONS ||
      embedding.some((value) => !Number.isFinite(value))
    ) {
      throw new ArchiveEmbeddingError("embedding_dimensions_mismatch");
    }
  }

  return {
    embeddings: response.embeddings,
    inputTokens: response.inputTokens,
  };
}
