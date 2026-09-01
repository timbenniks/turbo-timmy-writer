import "server-only";

import { randomUUID } from "node:crypto";

import { and, asc, eq, sql } from "drizzle-orm";

import {
  articleStartPremiseSchema,
  createWritingMessageText,
  writingMessageTextSchema,
} from "@/ai/conversation/model";
import { createPremiseBrief } from "@/ai/brief/model";
import { emptyArticleMetadata, untitledArticleSlug } from "@/articles/model";
import { getDatabase } from "@/db/client";
import {
  articles,
  articleBriefs,
  writingMessages,
  writingSessions,
} from "@/db/schema";
import { emptyArticleDocument } from "@/editor/document";

export async function createArticleStartForUser(input: {
  userId: string;
  premise: string;
}) {
  const premise = articleStartPremiseSchema.parse(input.premise);
  const database = getDatabase();
  const articleId = randomUUID();
  const sessionId = randomUUID();
  const messageId = randomUUID();
  const now = new Date();

  await database.batch([
    database.insert(articles).values({
      id: articleId,
      userId: input.userId,
      title: "",
      slug: untitledArticleSlug(articleId),
      status: "interviewing",
      documentJson: emptyArticleDocument,
      plainText: "",
      metadata: emptyArticleMetadata,
      createdAt: now,
      updatedAt: now,
    }),
    database.insert(writingSessions).values({
      id: sessionId,
      userId: input.userId,
      articleId,
      type: "article-start",
      status: "active",
      nextSequence: 2,
      createdAt: now,
      updatedAt: now,
    }),
    database.insert(writingMessages).values({
      id: messageId,
      sessionId,
      role: "user",
      contentJson: createWritingMessageText(premise),
      plainText: premise,
      sequence: 1,
      createdAt: now,
    }),
    database.insert(articleBriefs).values({
      articleId,
      revision: 1,
      briefJson: createPremiseBrief(premise),
      source: "system",
      createdAt: now,
    }),
  ]);

  return { articleId, sessionId };
}

export async function getArticleStartForUser(articleId: string, userId: string) {
  const database = getDatabase();
  const [session] = await database
    .select()
    .from(writingSessions)
    .where(
      and(
        eq(writingSessions.articleId, articleId),
        eq(writingSessions.userId, userId),
        eq(writingSessions.type, "article-start"),
      ),
    )
    .limit(1);

  if (!session) return null;

  const rows = await database
    .select()
    .from(writingMessages)
    .where(eq(writingMessages.sessionId, session.id))
    .orderBy(asc(writingMessages.sequence));

  return {
    session,
    messages: rows.map((message) => ({
      ...message,
      contentJson: writingMessageTextSchema.parse(message.contentJson),
    })),
  };
}

export async function appendWritingMessageForUser(input: {
  sessionId: string;
  userId: string;
  role: "user" | "assistant";
  text: string;
  aiRunId?: string;
}) {
  const content = createWritingMessageText(input.text.trim());
  const database = getDatabase();
  const now = new Date();
  const [updatedSession] = await database
    .update(writingSessions)
    .set({
      nextSequence: sql`${writingSessions.nextSequence} + 1`,
      updatedAt: now,
    })
    .where(
      and(
        eq(writingSessions.id, input.sessionId),
        eq(writingSessions.userId, input.userId),
        eq(writingSessions.status, "active"),
      ),
    )
    .returning({ sequence: writingSessions.nextSequence });

  if (!updatedSession) return null;

  const [message] = await database
    .insert(writingMessages)
    .values({
      sessionId: input.sessionId,
      role: input.role,
      contentJson: content,
      plainText: content.text,
      aiRunId: input.aiRunId,
      sequence: updatedSession.sequence - 1,
      createdAt: now,
    })
    .returning();

  return message ?? null;
}
