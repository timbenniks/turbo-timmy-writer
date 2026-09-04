import "server-only";

import { searchArchiveForUser } from "@/db/queries/archive-search";
import { readArchiveEmbeddingEnvironment } from "@/lib/env/server";
import { createOpenAiArchiveEmbeddingProvider } from "@/search/embeddings/openai-provider";
import { selectArchiveEvidence } from "@/search/retrieval/context";
import {
  relatedArchiveQuery,
  type ArchiveSearchInput,
} from "@/search/retrieval/model";

export async function retrieveArchiveForUser(
  userId: string,
  input: ArchiveSearchInput,
) {
  if (input.mode === "literal") return searchArchiveForUser(userId, input);

  const environment = readArchiveEmbeddingEnvironment();
  if (!environment) {
    throw new Error("Semantic archive search is not configured.");
  }
  return searchArchiveForUser(userId, input, {
    embeddingModel: environment.model,
    embeddingProvider: createOpenAiArchiveEmbeddingProvider({
      apiKey: environment.apiKey,
    }),
  });
}

export async function retrieveArchiveEvidenceForDraft(input: {
  userId: string;
  premise: string;
  thesis?: string | null;
  excludeArchiveSlug?: string;
}) {
  const query = relatedArchiveQuery([input.premise, input.thesis]);
  if (!query) return [];
  const base = {
    query,
    limit: 10,
    excludeArchiveSlug: input.excludeArchiveSlug,
  } as const;

  try {
    const mode = process.env.AI_PROVIDER_MODE === "guided-test"
      ? "literal" as const
      : "hybrid" as const;
    return selectArchiveEvidence(await retrieveArchiveForUser(input.userId, {
      ...base,
      mode,
    }));
  } catch {
    try {
      return selectArchiveEvidence(await retrieveArchiveForUser(input.userId, {
        ...base,
        mode: "literal",
      }));
    } catch {
      return [];
    }
  }
}
