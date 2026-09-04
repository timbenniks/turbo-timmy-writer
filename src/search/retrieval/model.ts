import { z } from "zod";

const archiveSearchModes = ["literal", "semantic", "hybrid"] as const;
export const archiveSearchModeSchema = z.enum(archiveSearchModes);
export type ArchiveSearchMode = z.infer<typeof archiveSearchModeSchema>;

export const archiveSearchInputSchema = z.object({
  query: z.string().trim().min(2).max(500),
  mode: archiveSearchModeSchema.default("hybrid"),
  limit: z.number().int().min(1).max(20).default(10),
  excludeArchiveDocumentId: z.uuid().optional(),
  excludeArchiveSlug: z.string().trim().min(1).max(200).optional(),
});

export type ArchiveSearchInput = z.infer<typeof archiveSearchInputSchema>;

export type ArchiveSearchCandidate = {
  chunkId: string;
  archiveDocumentId: string;
  chunkOrdinal: number;
  title: string;
  url: string;
  publishedAt: Date;
  tags: string[];
  source: string;
  destination: string;
  passage: string;
  literalScore?: number;
  semanticScore?: number;
};

export type ArchiveSearchResult = ArchiveSearchCandidate & {
  score: number;
  ranking: {
    literal: { raw: number | null; normalized: number; weight: number };
    semantic: { raw: number | null; normalized: number; weight: number };
  };
};

const HYBRID_LITERAL_WEIGHT = 0.45;
const HYBRID_SEMANTIC_WEIGHT = 0.55;

const relatedStopWords = new Set([
  "about", "after", "again", "also", "and", "are", "been", "before", "being", "between",
  "could", "from", "have", "into", "just", "more", "most", "only", "other",
  "for", "not", "should", "some", "than", "that", "the", "their", "there", "these", "they", "this",
  "through", "very", "what", "when", "where", "which", "while", "with", "would",
  "was", "were", "your",
]);

export function relatedArchiveQuery(values: readonly (string | null | undefined)[]) {
  const words = values
    .join(" ")
    .toLocaleLowerCase("en")
    .match(/[\p{L}\p{N}][\p{L}\p{N}'’-]{2,}/gu) ?? [];
  const unique = [...new Set(words)]
    .filter((word) => !relatedStopWords.has(word))
    .slice(0, 8);
  return unique.join(" OR ");
}

function literalMaximum(candidates: readonly ArchiveSearchCandidate[]) {
  return Math.max(0, ...candidates.map((candidate) => candidate.literalScore ?? 0));
}

function normalizedLiteral(score: number | undefined, maximum: number) {
  return score === undefined || maximum <= 0 ? 0 : Math.min(1, score / maximum);
}

function normalizedSemantic(score: number | undefined) {
  return score === undefined ? 0 : Math.min(1, Math.max(0, (score + 1) / 2));
}

export function rankArchiveSearchCandidates(
  candidates: readonly ArchiveSearchCandidate[],
  mode: ArchiveSearchMode,
  limit: number,
): ArchiveSearchResult[] {
  const byChunk = new Map<string, ArchiveSearchCandidate>();
  for (const candidate of candidates) {
    const current = byChunk.get(candidate.chunkId);
    byChunk.set(candidate.chunkId, {
      ...(current ?? candidate),
      literalScore: candidate.literalScore ?? current?.literalScore,
      semanticScore: candidate.semanticScore ?? current?.semanticScore,
    });
  }

  const combined = [...byChunk.values()];
  const maximumLiteral = literalMaximum(combined);
  const weights = mode === "literal"
    ? { literal: 1, semantic: 0 }
    : mode === "semantic"
      ? { literal: 0, semantic: 1 }
      : { literal: HYBRID_LITERAL_WEIGHT, semantic: HYBRID_SEMANTIC_WEIGHT };

  return combined
    .map((candidate) => {
      const literal = normalizedLiteral(candidate.literalScore, maximumLiteral);
      const semantic = normalizedSemantic(candidate.semanticScore);
      return {
        ...candidate,
        score: literal * weights.literal + semantic * weights.semantic,
        ranking: {
          literal: {
            raw: candidate.literalScore ?? null,
            normalized: literal,
            weight: weights.literal,
          },
          semantic: {
            raw: candidate.semanticScore ?? null,
            normalized: semantic,
            weight: weights.semantic,
          },
        },
      };
    })
    .sort((left, right) =>
      right.score - left.score ||
      right.publishedAt.getTime() - left.publishedAt.getTime() ||
      left.chunkId.localeCompare(right.chunkId))
    .slice(0, limit);
}
