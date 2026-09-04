import { z } from "zod";

import { httpUrlSchema } from "@/lib/validation/http-url";

import type { ArchiveSearchResult } from "./model";

export const archiveEvidenceSchema = z.array(z.object({
  title: z.string().trim().min(1).max(500),
  url: httpUrlSchema,
  passage: z.string().trim().min(1).max(1_600),
})).max(4);

export type ArchiveEvidence = z.infer<typeof archiveEvidenceSchema>;

export function selectArchiveEvidence(
  results: readonly ArchiveSearchResult[],
): ArchiveEvidence {
  const seenDocuments = new Set<string>();
  const evidence = [];
  for (const result of results) {
    if (seenDocuments.has(result.archiveDocumentId)) continue;
    seenDocuments.add(result.archiveDocumentId);
    evidence.push({
      title: result.title,
      url: result.url,
      passage: result.passage.slice(0, 1_600).trim(),
    });
    if (evidence.length === 4) break;
  }
  return archiveEvidenceSchema.parse(evidence);
}
