"use server";

import { revalidatePath } from "next/cache";

import { getAllowedSession } from "@/auth/session";
import {
  createArticleSourceForUser,
  removeArticleSourceForUser,
  updateArticleSourceForUser,
} from "@/db/queries/sources";
import {
  createArticleSourceInputSchema,
  removeArticleSourceInputSchema,
  updateArticleSourceInputSchema,
} from "@/sources/model";

const invalidResult = {
  ok: false as const,
  code: "invalid" as const,
  message: "Check the source details and use an HTTP(S) URL when one is supplied.",
};

export async function createArticleSourceAction(input: unknown) {
  const session = await getAllowedSession();
  if (!session) return { ok: false as const, code: "unauthorized" as const, message: "Your session has expired." };
  const parsed = createArticleSourceInputSchema.safeParse(input);
  if (!parsed.success) return invalidResult;
  const created = await createArticleSourceForUser({ ...parsed.data, userId: session.user.id });
  if (!created) return { ok: false as const, code: "not-found" as const, message: "This article was not found." };
  revalidatePath(`/articles/${parsed.data.articleId}`);
  return { ok: true as const, sourceId: created.id };
}

export async function updateArticleSourceAction(input: unknown) {
  const session = await getAllowedSession();
  if (!session) return { ok: false as const, code: "unauthorized" as const, message: "Your session has expired." };
  const parsed = updateArticleSourceInputSchema.safeParse(input);
  if (!parsed.success) return invalidResult;
  const updated = await updateArticleSourceForUser({ ...parsed.data, userId: session.user.id });
  if (!updated) return { ok: false as const, code: "not-found" as const, message: "This source was not found." };
  revalidatePath(`/articles/${parsed.data.articleId}`);
  return { ok: true as const };
}

export async function removeArticleSourceAction(input: unknown) {
  const session = await getAllowedSession();
  if (!session) return { ok: false as const, code: "unauthorized" as const, message: "Your session has expired." };
  const parsed = removeArticleSourceInputSchema.safeParse(input);
  if (!parsed.success) return invalidResult;
  const removed = await removeArticleSourceForUser({ ...parsed.data, userId: session.user.id });
  if (!removed) return { ok: false as const, code: "not-found" as const, message: "This source was not found." };
  revalidatePath(`/articles/${parsed.data.articleId}`);
  return { ok: true as const };
}
