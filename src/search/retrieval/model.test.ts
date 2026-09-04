import { describe, expect, it } from "vitest";

import {
  archiveSearchInputSchema,
  rankArchiveSearchCandidates,
  relatedArchiveQuery,
  type ArchiveSearchCandidate,
} from "./model";

const base: Omit<ArchiveSearchCandidate, "chunkId" | "literalScore" | "semanticScore"> = {
  archiveDocumentId: "00000000-0000-4000-8000-000000000001",
  chunkOrdinal: 0,
  title: "Article",
  url: "https://example.com/article",
  publishedAt: new Date("2026-01-01T00:00:00.000Z"),
  tags: ["performance"],
  source: "example.com",
  destination: "website",
  passage: "A useful attributed passage.",
};

describe("archive retrieval ranking", () => {
  it("validates bounded search input", () => {
    expect(archiveSearchInputSchema.parse({ query: "  web performance  " })).toEqual({
      query: "web performance",
      mode: "hybrid",
      limit: 10,
    });
    expect(() => archiveSearchInputSchema.parse({ query: "x" })).toThrow();
    expect(() => archiveSearchInputSchema.parse({ query: "valid", limit: 21 })).toThrow();
  });

  it("merges channels and exposes understandable hybrid components", () => {
    const results = rankArchiveSearchCandidates([
      { ...base, chunkId: "literal", literalScore: 2 },
      { ...base, chunkId: "both", literalScore: 1 },
      { ...base, chunkId: "both", semanticScore: 0.9 },
      { ...base, chunkId: "semantic", semanticScore: 0.7 },
    ], "hybrid", 3);

    expect(results.map((result) => result.chunkId)).toEqual([
      "both",
      "semantic",
      "literal",
    ]);
    expect(results[0]?.ranking).toEqual({
      literal: { raw: 1, normalized: 0.5, weight: 0.45 },
      semantic: { raw: 0.9, normalized: 0.95, weight: 0.55 },
    });
  });

  it("uses only the requested channel and applies a stable result limit", () => {
    const candidates = [
      { ...base, chunkId: "one", literalScore: 0.2, semanticScore: 0.99 },
      { ...base, chunkId: "two", literalScore: 0.8, semanticScore: 0.1 },
    ];

    expect(rankArchiveSearchCandidates(candidates, "literal", 1)[0]?.chunkId)
      .toBe("two");
    expect(rankArchiveSearchCandidates(candidates, "semantic", 1)[0]?.chunkId)
      .toBe("one");
  });

  it("derives a bounded literal related-writing query", () => {
    expect(relatedArchiveQuery([
      "What I learned about composable architecture and developer experience",
      "Developer experience should stay concrete.",
    ])).toBe("learned OR composable OR architecture OR developer OR experience OR stay OR concrete");
  });
});
