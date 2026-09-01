import "server-only";

import { sql } from "drizzle-orm";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import {
  articleVersions,
  articles,
  writingSessions,
} from "@/db/schema";
import type { ArticleDocument } from "@/editor/document";
import { articleDocumentToMarkdown } from "@/editor/serialization/markdown";
import { articleDocumentToPlainText } from "@/editor/serialization/plain-text";

const finalizedDraftSchema = z.object({
  revision: z.coerce.number().int().positive(),
  updated_at: z.coerce.date(),
  version_id: z.uuid(),
});

export async function finalizeInitialDraftForUser(input: {
  articleId: string;
  userId: string;
  expectedRevision: number;
  title: string;
  document: ArticleDocument;
  aiRunId: string;
}) {
  const plainText = articleDocumentToPlainText(input.document);
  const markdown = articleDocumentToMarkdown(input.document);
  if (!plainText) throw new Error("The generated draft is empty.");

  const result = await getDatabase().execute(sql<{
    revision: number;
    updated_at: Date;
    version_id: string;
  }>`
    with updated as (
      update ${articles}
      set
        title = ${input.title},
        document_json = ${JSON.stringify(input.document)}::jsonb,
        plain_text = ${plainText},
        metadata = ${JSON.stringify({ version: 1 })}::jsonb,
        status = 'drafting',
        revision = ${input.expectedRevision + 1},
        updated_at = now()
      where
        ${articles.id} = ${input.articleId}
        and ${articles.userId} = ${input.userId}
        and ${articles.revision} = ${input.expectedRevision}
        and ${articles.status} = 'interviewing'
        and ${articles.plainText} = ''
      returning id, revision, updated_at
    ), versioned as (
      insert into ${articleVersions} (
        article_id,
        article_revision,
        title,
        document_json,
        plain_text,
        markdown,
        reason,
        label,
        ai_run_id
      )
      select
        id,
        revision,
        ${input.title},
        ${JSON.stringify(input.document)}::jsonb,
        ${plainText},
        ${markdown},
        'initial-ai-draft',
        'Initial AI draft',
        ${input.aiRunId}
      from updated
      returning id
    ), completed_session as (
      update ${writingSessions}
      set status = 'completed', completed_at = now(), updated_at = now()
      where
        ${writingSessions.articleId} = ${input.articleId}
        and ${writingSessions.userId} = ${input.userId}
        and ${writingSessions.type} = 'article-start'
        and exists (select 1 from updated)
    )
    select updated.revision, updated.updated_at, versioned.id as version_id
    from updated cross join versioned
  `);

  const row = finalizedDraftSchema.safeParse(result.rows[0]);
  return row.success
    ? {
        revision: row.data.revision,
        updatedAt: row.data.updated_at,
        versionId: row.data.version_id,
        plainText,
        markdown,
      }
    : null;
}
