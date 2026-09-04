import { describe, expect, it } from "vitest";

import { ARCHIVE_EMBEDDING_DIMENSIONS } from "@/search/chunking/archive-chunks";

import {
  ArchiveEmbeddingError,
  createArchiveEmbeddings,
  type ArchiveEmbeddingProvider,
} from "./provider";

describe("archive embedding boundary", () => {
  it("requests fixed dimensions and validates provider output", async () => {
    const requests: number[] = [];
    const provider: ArchiveEmbeddingProvider = {
      async embedMany(request) {
        requests.push(request.dimensions);
        return {
          embeddings: request.values.map(() =>
            Array.from({ length: request.dimensions }, () => 0.25),
          ),
          inputTokens: 42,
        };
      },
    };

    const result = await createArchiveEmbeddings(provider, {
      model: "text-embedding-3-small",
      values: ["Title\n\nPassage"],
    });

    expect(requests).toEqual([ARCHIVE_EMBEDDING_DIMENSIONS]);
    expect(result.embeddings[0]).toHaveLength(ARCHIVE_EMBEDDING_DIMENSIONS);
    expect(result.inputTokens).toBe(42);
  });

  it("rejects malformed vectors before persistence", async () => {
    const provider: ArchiveEmbeddingProvider = {
      async embedMany() {
        return { embeddings: [[0.1, 0.2]] };
      },
    };

    await expect(createArchiveEmbeddings(provider, {
      model: "text-embedding-3-small",
      values: ["Passage"],
    })).rejects.toMatchObject({
      code: "embedding_dimensions_mismatch",
    } satisfies Partial<ArchiveEmbeddingError>);
  });
});
