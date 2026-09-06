"use server";

import { revalidatePath } from "next/cache";

import { getAllowedSession } from "@/auth/session";
import { restoreArticleVersionForUser } from "@/db/queries/article-versions";
import { restoreArticleVersionInputSchema } from "@/versions/model";

export type RestoreArticleVersionResult =
  | { ok: true; revision: number; updatedAt: string }
  | { ok: false; code: "invalid" | "not-found" | "conflict"; message: string };

export async function restoreArticleVersionAction(
  input: unknown,
): Promise<RestoreArticleVersionResult> {
  const session = await getAllowedSession();
  if (!session) {
    return { ok: false, code: "not-found", message: "Your session has expired." };
  }

  const parsed = restoreArticleVersionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid", message: "That version restore is invalid." };
  }

  const result = await restoreArticleVersionForUser({
    ...parsed.data,
    userId: session.user.id,
  });
  if (!result) {
    return { ok: false, code: "not-found", message: "That article version was not found." };
  }
  if (result.status === "conflict") {
    return {
      ok: false,
      code: "conflict",
      message: `The article changed to revision ${result.currentRevision}. Reload before restoring.`,
    };
  }

  revalidatePath(`/articles/${parsed.data.articleId}`);
  revalidatePath(`/articles/${parsed.data.articleId}/history`);
  return {
    ok: true,
    revision: result.revision,
    updatedAt: result.updatedAt.toISOString(),
  };
}
