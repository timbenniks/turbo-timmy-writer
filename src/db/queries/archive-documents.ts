import "server-only";

import { desc, eq, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { archiveDocuments } from "@/db/schema";

export const ARCHIVE_LIST_PREVIEW_CHARACTERS = 280;

export async function listArchiveDocumentsForUser(userId: string) {
  return getDatabase()
    .select({
      id: archiveDocuments.id,
      title: archiveDocuments.title,
      url: archiveDocuments.url,
      publishedAt: archiveDocuments.publishedAt,
      previewText: sql<string>`left(${archiveDocuments.bodyText}, ${ARCHIVE_LIST_PREVIEW_CHARACTERS})`.as("preview_text"),
      tags: archiveDocuments.tags,
      source: archiveDocuments.source,
      destination: archiveDocuments.destination,
    })
    .from(archiveDocuments)
    .where(eq(archiveDocuments.userId, userId))
    .orderBy(desc(archiveDocuments.publishedAt), archiveDocuments.title);
}

export async function listArchiveGraphDocumentsForUser(userId: string) {
  return getDatabase()
    .select({
      id: archiveDocuments.id,
      title: archiveDocuments.title,
      url: archiveDocuments.url,
      tags: archiveDocuments.tags,
    })
    .from(archiveDocuments)
    .where(eq(archiveDocuments.userId, userId))
    .orderBy(desc(archiveDocuments.publishedAt), archiveDocuments.title);
}
