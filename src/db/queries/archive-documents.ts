import "server-only";

import { desc, eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { archiveDocuments } from "@/db/schema";

export async function listArchiveDocumentsForUser(userId: string) {
  return getDatabase()
    .select({
      id: archiveDocuments.id,
      title: archiveDocuments.title,
      url: archiveDocuments.url,
      publishedAt: archiveDocuments.publishedAt,
      bodyText: archiveDocuments.bodyText,
      tags: archiveDocuments.tags,
      source: archiveDocuments.source,
      destination: archiveDocuments.destination,
    })
    .from(archiveDocuments)
    .where(eq(archiveDocuments.userId, userId))
    .orderBy(desc(archiveDocuments.publishedAt), archiveDocuments.title);
}
