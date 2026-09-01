"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Route } from "next";

import {
  saveArticleInputSchema,
  type SaveArticleResult,
} from "@/articles/save";
import { getAllowedSession } from "@/auth/session";
import {
  createBlankArticleForUser,
  saveArticleForUser,
} from "@/db/queries/articles";
import { articleDocumentToPlainText } from "@/editor/serialization/plain-text";

export async function createBlankArticleAction() {
  const session = await getAllowedSession();
  if (!session) {
    redirect("/sign-in");
  }

  const article = await createBlankArticleForUser(session.user.id);
  redirect(`/articles/${article.id}` as Route);
}

export async function saveArticleAction(input: unknown): Promise<SaveArticleResult> {
  const session = await getAllowedSession();
  if (!session) {
    return { ok: false, message: "Your session has expired. Sign in and try again." };
  }

  const parsedInput = saveArticleInputSchema.safeParse(input);
  if (!parsedInput.success) {
    const issuePath = parsedInput.error.issues[0]?.path.join(".");
    return {
      ok: false,
      message: issuePath
        ? `The article contains unsupported content at ${issuePath}.`
        : "The article contains unsupported content.",
    };
  }

  const plainText = articleDocumentToPlainText(parsedInput.data.documentJson);
  const article = await saveArticleForUser({
    ...parsedInput.data,
    userId: session.user.id,
    plainText,
  });

  if (!article) {
    return { ok: false, message: "This article could not be saved." };
  }

  revalidatePath("/");
  revalidatePath(`/articles/${parsedInput.data.articleId}`);

  return {
    ok: true,
    savedAt: article.updatedAt.toISOString(),
  };
}
