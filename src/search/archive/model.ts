import { createHash } from "node:crypto";

import { z } from "zod";

export const ARCHIVE_IMPORT_VERSION = 1 as const;
export const TIMBENNIKS_ARCHIVE_SOURCE = "timbenniks.dev" as const;
export const WEBSITE_ARCHIVE_DESTINATION = "website" as const;

const isoTimestampSchema = z.iso.datetime({ offset: true });

export const archiveDocumentMetadataSchema = z.object({
  importVersion: z.literal(ARCHIVE_IMPORT_VERSION),
  sourceFile: z.string().trim().min(1),
  sourceId: z.string().trim().min(1).nullable(),
  slug: z.string().trim().min(1),
  frontmatter: z.record(z.string(), z.unknown()),
});

export const archiveDocumentImportSchema = z.object({
  sourceKey: z.string().trim().min(1),
  title: z.string().trim().min(1),
  url: z.url(),
  publishedAt: isoTimestampSchema,
  bodyText: z.string().trim().min(1),
  sourceMarkup: z.string().trim().min(1),
  tags: z.array(z.string().trim().min(1)),
  source: z.literal(TIMBENNIKS_ARCHIVE_SOURCE),
  destination: z.literal(WEBSITE_ARCHIVE_DESTINATION),
  metadata: archiveDocumentMetadataSchema,
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
});

export type ArchiveDocumentImport = z.infer<typeof archiveDocumentImportSchema>;
export type ArchiveDocumentMetadata = z.infer<
  typeof archiveDocumentMetadataSchema
>;

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export function normalizeJsonValue(value: unknown): JsonValue {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Archive metadata contains a non-finite number.");
    }
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalizeJsonValue);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, child]) => child !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, normalizeJsonValue(child)]),
    );
  }
  throw new Error(`Archive metadata contains unsupported ${typeof value} data.`);
}

export function archiveDocumentContentHash(
  document: Omit<ArchiveDocumentImport, "contentHash">,
) {
  const normalized = normalizeJsonValue(document);
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

type ExistingArchiveDocument = Pick<
  ArchiveDocumentImport,
  "sourceKey" | "contentHash"
>;

export function planArchiveDocumentImport(
  existing: readonly ExistingArchiveDocument[],
  incoming: readonly ArchiveDocumentImport[],
) {
  const existingByKey = new Map(existing.map((item) => [item.sourceKey, item]));
  const incomingByKey = new Map(incoming.map((item) => [item.sourceKey, item]));

  if (existingByKey.size !== existing.length) {
    throw new Error("Existing archive documents contain duplicate source keys.");
  }
  if (incomingByKey.size !== incoming.length) {
    throw new Error("Incoming archive documents contain duplicate source keys.");
  }

  const inserted: string[] = [];
  const updated: string[] = [];
  const unchanged: string[] = [];
  const removed: string[] = [];

  for (const document of incoming) {
    const current = existingByKey.get(document.sourceKey);
    if (!current) inserted.push(document.sourceKey);
    else if (current.contentHash === document.contentHash) {
      unchanged.push(document.sourceKey);
    }
    else updated.push(document.sourceKey);
  }
  for (const document of existing) {
    if (!incomingByKey.has(document.sourceKey)) removed.push(document.sourceKey);
  }

  return { inserted, updated, unchanged, removed };
}
