import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import type { EditorSuggestionRequest } from "@/ai/editor/model";
import { getDatabase } from "@/db/client";
import { articleVersions, articles, editorSuggestions } from "@/db/schema";
import { applyTextSuggestion, textAtBookmark } from "@/editor/suggestion";
import { articleDocumentToMarkdown } from "@/editor/serialization/markdown";
import { articleDocumentToPlainText } from "@/editor/serialization/plain-text";

export async function listEditorSuggestionsForUser(articleId: string, userId: string) {
  return getDatabase()
    .select()
    .from(editorSuggestions)
    .where(and(eq(editorSuggestions.articleId, articleId), eq(editorSuggestions.userId, userId)))
    .orderBy(desc(editorSuggestions.createdAt))
    .limit(30);
}

export async function createEditorSuggestionForUser(input: {
  userId: string;
  articleId: string;
  runId: string;
  request: EditorSuggestionRequest;
  suggestedText: string;
}) {
  const [article] = await getDatabase()
    .select({ revision: articles.revision, documentJson: articles.documentJson })
    .from(articles)
    .where(and(eq(articles.id, input.articleId), eq(articles.userId, input.userId)))
    .limit(1);
  if (!article) return { status: "not-found" as const };
  if (
    article.revision !== input.request.selection.sourceRevision ||
    textAtBookmark(article.documentJson, input.request.selection.bookmark) !== input.request.selection.originalText
  ) {
    return { status: "superseded" as const };
  }

  const [suggestion] = await getDatabase().insert(editorSuggestions).values({
    userId: input.userId,
    articleId: input.articleId,
    aiRunId: input.runId,
    actionId: input.request.actionId,
    instruction: input.request.instruction,
    sourceRevision: input.request.selection.sourceRevision,
    documentVersion: input.request.selection.documentVersion,
    selectionFrom: input.request.selection.bookmark.from,
    selectionTo: input.request.selection.bookmark.to,
    selectionAnchor: input.request.selection.bookmark.anchor,
    selectionHead: input.request.selection.bookmark.head,
    originalText: input.request.selection.originalText,
    suggestedText: input.suggestedText,
  }).returning();
  return suggestion
    ? { status: "created" as const, suggestion }
    : { status: "not-found" as const };
}

const acceptanceResultSchema = z.object({
  revision: z.coerce.number().int().positive(),
  updated_at: z.coerce.date(),
});

export async function acceptEditorSuggestionForUser(input: {
  suggestionId: string;
  articleId: string;
  userId: string;
}) {
  const database = getDatabase();
  const [row] = await database
    .select({ suggestion: editorSuggestions, article: articles })
    .from(editorSuggestions)
    .innerJoin(articles, eq(articles.id, editorSuggestions.articleId))
    .where(and(
      eq(editorSuggestions.id, input.suggestionId),
      eq(editorSuggestions.articleId, input.articleId),
      eq(editorSuggestions.userId, input.userId),
      eq(articles.userId, input.userId),
    ))
    .limit(1);
  if (!row) return { status: "not-found" as const };
  if (row.suggestion.status !== "pending") {
    return { status: row.suggestion.status as "accepted" | "rejected" | "superseded" };
  }

  const bookmark = { from: row.suggestion.selectionFrom, to: row.suggestion.selectionTo };
  const nextDocument = row.article.revision === row.suggestion.sourceRevision
    ? applyTextSuggestion(
        row.article.documentJson,
        bookmark,
        row.suggestion.originalText,
        row.suggestion.suggestedText,
      )
    : null;
  if (!nextDocument) {
    await database.update(editorSuggestions).set({ status: "superseded", resolvedAt: new Date() })
      .where(and(eq(editorSuggestions.id, input.suggestionId), eq(editorSuggestions.status, "pending")));
    return { status: "superseded" as const };
  }

  const nextPlainText = articleDocumentToPlainText(nextDocument);
  const snapshotLargeEdit = Math.max(
    row.suggestion.originalText.length,
    row.suggestion.suggestedText.length,
  ) >= 1_000;
  const result = await database.execute(sql<{
    revision: number;
    updated_at: Date;
  }>`
    with snapshot as (
      insert into ${articleVersions} (
        article_id, article_revision, title, document_json, plain_text, markdown,
        reason, label, ai_run_id
      )
      select
        ${row.article.id}, ${row.article.revision}, ${row.article.title},
        ${JSON.stringify(row.article.documentJson)}::jsonb, ${row.article.plainText},
        ${articleDocumentToMarkdown(row.article.documentJson)},
        'before-ai-replacement', 'Before accepted AI edit', ${row.suggestion.aiRunId}
      where ${snapshotLargeEdit}
        and exists (
          select 1 from ${editorSuggestions}
          where ${editorSuggestions.id} = ${input.suggestionId}
            and ${editorSuggestions.status} = 'pending'
        )
    ), updated as (
      update ${articles}
      set document_json = ${JSON.stringify(nextDocument)}::jsonb,
          plain_text = ${nextPlainText},
          revision = ${row.article.revision + 1},
          updated_at = now()
      where ${articles.id} = ${input.articleId}
        and ${articles.userId} = ${input.userId}
        and ${articles.revision} = ${row.article.revision}
        and exists (
          select 1 from ${editorSuggestions}
          where ${editorSuggestions.id} = ${input.suggestionId}
            and ${editorSuggestions.status} = 'pending'
        )
      returning revision, updated_at
    ), resolved as (
      update ${editorSuggestions}
      set status = 'accepted', resolved_at = now()
      where ${editorSuggestions.id} = ${input.suggestionId}
        and ${editorSuggestions.userId} = ${input.userId}
        and ${editorSuggestions.status} = 'pending'
        and exists (select 1 from updated)
      returning id
    )
    select updated.revision, updated.updated_at
    from updated cross join resolved
  `);
  const accepted = acceptanceResultSchema.safeParse(result.rows[0]);
  if (!accepted.success) {
    await database.update(editorSuggestions).set({ status: "superseded", resolvedAt: new Date() })
      .where(and(eq(editorSuggestions.id, input.suggestionId), eq(editorSuggestions.status, "pending")));
    return { status: "superseded" as const };
  }
  return {
    status: "accepted" as const,
    document: nextDocument,
    revision: accepted.data.revision,
    updatedAt: accepted.data.updated_at,
  };
}

export async function rejectEditorSuggestionForUser(input: {
  suggestionId: string;
  articleId: string;
  userId: string;
}) {
  const [rejected] = await getDatabase().update(editorSuggestions)
    .set({ status: "rejected", resolvedAt: new Date() })
    .where(and(
      eq(editorSuggestions.id, input.suggestionId),
      eq(editorSuggestions.articleId, input.articleId),
      eq(editorSuggestions.userId, input.userId),
      eq(editorSuggestions.status, "pending"),
    ))
    .returning({ id: editorSuggestions.id });
  return Boolean(rejected);
}
