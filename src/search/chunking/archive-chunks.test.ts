import { describe, expect, it } from "vitest";

import {
  ARCHIVE_CHUNK_MAX_TOKENS,
  ARCHIVE_CHUNK_MIN_TOKENS,
  ARCHIVE_CHUNK_OVERLAP_TOKENS,
  archiveChunkEmbeddingText,
  archiveEmbeddingIsCurrent,
  chunkArchiveDocument,
  planArchiveChunkReplacement,
} from "./archive-chunks";

const documentId = "00000000-0000-4000-8000-000000000001";

describe("archive chunking", () => {
  it("keeps a short document as one attributed chunk", () => {
    const [chunk] = chunkArchiveDocument({
      archiveDocumentId: documentId,
      title: "Small article",
      bodyText: "A concrete paragraph with useful evidence.",
    });

    expect(chunk).toMatchObject({
      archiveDocumentId: documentId,
      ordinal: 0,
      bodyText: "A concrete paragraph with useful evidence.",
      metadata: { chunkingVersion: 1, encoding: "cl100k_base", tokenStart: 0 },
    });
    expect(chunk?.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("creates deterministic bounded windows with the configured overlap", () => {
    const bodyText = Array.from(
      { length: 2_500 },
      (_, index) => `specific-${index}`,
    ).join(" ");
    const first = chunkArchiveDocument({
      archiveDocumentId: documentId,
      title: "Long article",
      bodyText,
    });
    const second = chunkArchiveDocument({
      archiveDocumentId: documentId,
      title: "Long article",
      bodyText,
    });

    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(1);
    for (const chunk of first) {
      expect(chunk.tokenCount).toBeGreaterThanOrEqual(ARCHIVE_CHUNK_MIN_TOKENS);
      expect(chunk.tokenCount).toBeLessThanOrEqual(ARCHIVE_CHUNK_MAX_TOKENS);
    }
    for (let index = 1; index < first.length; index += 1) {
      expect(first[index]?.metadata.tokenStart).toBe(
        (first[index - 1]?.metadata.tokenEnd ?? 0) -
          ARCHIVE_CHUNK_OVERLAP_TOKENS,
      );
    }
  });

  it("includes the title in embedding identity and input", () => {
    const first = chunkArchiveDocument({
      archiveDocumentId: documentId,
      title: "Original title",
      bodyText: "Same body.",
    })[0];
    const renamed = chunkArchiveDocument({
      archiveDocumentId: documentId,
      title: "Changed title",
      bodyText: "Same body.",
    })[0];

    expect(first?.contentHash).not.toBe(renamed?.contentHash);
    expect(archiveChunkEmbeddingText({
      title: "Original title",
      bodyText: "Same body.",
    })).toBe("Original title\n\nSame body.");
  });

  it("plans replacements and invalidates stale embedding configurations", () => {
    const chunks = chunkArchiveDocument({
      archiveDocumentId: documentId,
      title: "Article",
      bodyText: "A useful passage.",
    });
    const contentHash = chunks[0]?.contentHash ?? "";

    expect(planArchiveChunkReplacement([
      { archiveDocumentId: documentId, ordinal: 0, contentHash },
      { archiveDocumentId: documentId, ordinal: 1, contentHash: "a".repeat(64) },
    ], chunks)).toEqual({ inserted: 0, updated: 0, unchanged: 1, removed: 1 });
    expect(archiveEmbeddingIsCurrent({
      hasEmbedding: true,
      embeddingModel: "text-embedding-3-small",
      embeddingDimensions: 1_024,
      desiredModel: "text-embedding-3-small",
    })).toBe(true);
    expect(archiveEmbeddingIsCurrent({
      hasEmbedding: true,
      embeddingModel: "old-model",
      embeddingDimensions: 1_024,
      desiredModel: "text-embedding-3-small",
    })).toBe(false);
  });
});
