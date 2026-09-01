"use server";

import { redirect } from "next/navigation";
import type { Route } from "next";

import { getAllowedSession } from "@/auth/session";
import { createBlankArticleForUser } from "@/db/queries/articles";

export async function createBlankArticleAction() {
  const session = await getAllowedSession();
  if (!session) {
    redirect("/sign-in");
  }

  const article = await createBlankArticleForUser(session.user.id);
  redirect(`/articles/${article.id}` as Route);
}
