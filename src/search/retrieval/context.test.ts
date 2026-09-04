import { describe, expect, it } from "vitest";

import type { ArchiveSearchResult } from "./model";
import { selectArchiveEvidence } from "./context";

function result(documentId: string, chunkId: string, passage = "Useful evidence."): ArchiveSearchResult {
  return {
    chunkId,
    archiveDocumentId: documentId,
    chunkOrdinal: 0,
    title: `Article ${documentId}`,
    url: `https://example.com/${documentId}`,
    publishedAt: new Date("2026-01-01T00:00:00.000Z"),
    tags: [],
    source: "example.com",
    destination: "website",
    passage,
    score: 0.8,
    ranking: {
      literal: { raw: 1, normalized: 1, weight: 0.45 },
      semantic: { raw: 0.6, normalized: 0.8, weight: 0.55 },
    },
  };
}

describe("archive evidence selection", () => {
  it("selects one bounded attributed passage per source document", () => {
    const evidence = selectArchiveEvidence([
      result("one", "one-a", "x".repeat(2_000)),
      result("one", "one-b"),
      result("two", "two-a"),
    ]);

    expect(evidence).toHaveLength(2);
    expect(evidence[0]?.passage).toHaveLength(1_600);
    expect(evidence.map((item) => item.url)).toEqual([
      "https://example.com/one",
      "https://example.com/two",
    ]);
  });
});
