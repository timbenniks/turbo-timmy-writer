"use server";

import { revalidatePath } from "next/cache";

import { canTransitionArticleStatus, type ArticleStatus } from "@/articles/model";
import {
  createCheckpointInputSchema,
  updateArticleStatusInputSchema,
  updateArticleTagsInputSchema,
} from "@/articles/organization";
import { getAllowedSession } from "@/auth/session";
import {
  createManualCheckpointForUser,
  updateArticleStatusForUser,
  updateArticleTagsForUser,
} from "@/db/queries/article-organization";

export type UpdateArticleStatusResult =
  | { ok: true; status: ArticleStatus; updatedAt: string }
  | { ok: false; currentStatus?: ArticleStatus; message: string };

export async function updateArticleStatusAction(
  input: unknown,
): Promise<UpdateArticleStatusResult> {
  const session = await getAllowedSession();
  if (!session) return { ok: false, message: "Your session has expired." };

  const parsed = updateArticleStatusInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "That status change is invalid." };
  if (!canTransitionArticleStatus(parsed.data.expectedStatus, parsed.data.nextStatus)) {
    return { ok: false, message: "That lifecycle transition is not allowed." };
  }

  const result = await updateArticleStatusForUser({
    ...parsed.data,
    userId: session.user.id,
  });
  if (!result) return { ok: false, message: "This article could not be updated." };
  if (result.status === "conflict") {
    return {
      ok: false,
      currentStatus: result.currentStatus,
      message: "The article status changed elsewhere. Review the current status and try again.",
    };
  }

  revalidatePath("/");
  return {
    ok: true,
    status: result.article.status,
    updatedAt: result.article.updatedAt.toISOString(),
  };
}

export type UpdateArticleTagsResult =
  | { ok: true; tags: string[] }
  | { ok: false; message: string };

export async function updateArticleTagsAction(
  input: unknown,
): Promise<UpdateArticleTagsResult> {
  const session = await getAllowedSession();
  if (!session) return { ok: false, message: "Your session has expired." };

  const parsed = updateArticleTagsInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Use up to ten comma-separated tags, each at most 40 characters.",
    };
  }

  const tags = await updateArticleTagsForUser({
    articleId: parsed.data.articleId,
    userId: session.user.id,
    labels: parsed.data.tags,
  });
  return tags
    ? { ok: true, tags }
    : { ok: false, message: "This article's tags could not be updated." };
}

export type CreateManualCheckpointResult =
  | { ok: true; createdAt: string; versionCount: number }
  | { ok: false; code: "conflict"; currentRevision: number; message: string }
  | { ok: false; code: "invalid" | "not-found"; message: string };

export async function createManualCheckpointAction(
  input: unknown,
): Promise<CreateManualCheckpointResult> {
  const session = await getAllowedSession();
  if (!session) {
    return { ok: false, code: "not-found", message: "Your session has expired." };
  }

  const parsed = createCheckpointInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid", message: "That checkpoint is invalid." };
  }

  const result = await createManualCheckpointForUser({
    ...parsed.data,
    userId: session.user.id,
  });
  if (!result) {
    return { ok: false, code: "not-found", message: "This article was not found." };
  }
  if (result.status === "conflict") {
    return {
      ok: false,
      code: "conflict",
      currentRevision: result.currentRevision,
      message: "The article changed before the checkpoint was created.",
    };
  }

  return {
    ok: true,
    createdAt: result.createdAt.toISOString(),
    versionCount: result.versionCount,
  };
}
