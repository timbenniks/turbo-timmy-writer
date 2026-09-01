"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Route } from "next";

import { articleStartPremiseSchema } from "@/ai/conversation/model";
import {
  saveArticleInputSchema,
  type SaveArticleResult,
} from "@/articles/save";
import { getAllowedSession } from "@/auth/session";
import {
  createBlankArticleForUser,
  saveArticleForUser,
} from "@/db/queries/articles";
import { createArticleStartForUser } from "@/db/queries/writing-sessions";
import { articleDocumentToPlainText } from "@/editor/serialization/plain-text";

export async function createBlankArticleAction() {
  const session = await getAllowedSession();
  if (!session) {
    redirect("/sign-in");
  }

  const article = await createBlankArticleForUser(session.user.id);
  redirect(`/articles/${article.id}` as Route);
}

export type CreateGuidedArticleState = {
  error?: string;
};

export async function createGuidedArticleAction(
  _previousState: CreateGuidedArticleState,
  formData: FormData,
): Promise<CreateGuidedArticleState> {
  const session = await getAllowedSession();
  if (!session) {
    redirect("/sign-in");
  }

  const premise = articleStartPremiseSchema.safeParse(formData.get("premise"));
  if (!premise.success) {
    return {
      error:
        premise.error.issues[0]?.message ??
        "Share a premise to start the conversation.",
    };
  }

  const article = await createArticleStartForUser({
    userId: session.user.id,
    premise: premise.data,
  });
  revalidatePath("/");
  redirect(`/articles/${article.articleId}` as Route);
}

export async function saveArticleAction(input: unknown): Promise<SaveArticleResult> {
  const session = await getAllowedSession();
  if (!session) {
    return {
      ok: false,
      code: "unauthorized",
      message: "Your session has expired. Sign in and try again.",
    };
  }

  const parsedInput = saveArticleInputSchema.safeParse(input);
  if (!parsedInput.success) {
    const issuePath = parsedInput.error.issues[0]?.path.join(".");
    return {
      ok: false,
      code: "invalid",
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
    return {
      ok: false,
      code: "not-found",
      message: "This article could not be saved.",
    };
  }

  if (article.status === "conflict") {
    return {
      ok: false,
      code: "conflict",
      currentRevision: article.currentRevision,
      message: "A newer version was saved elsewhere.",
    };
  }

  revalidatePath("/");

  return {
    ok: true,
    revision: article.article.revision,
    savedAt: article.article.updatedAt.toISOString(),
  };
}
