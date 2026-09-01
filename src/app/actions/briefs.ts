"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { articleBriefSchema } from "@/ai/brief/model";
import { articleIdSchema } from "@/articles/model";
import { getAllowedSession } from "@/auth/session";
import { createArticleBriefRevisionForUser } from "@/db/queries/article-briefs";

const saveArticleBriefInputSchema = z.object({
  articleId: articleIdSchema,
  expectedRevision: z.number().int().positive(),
  brief: articleBriefSchema,
});

export type SaveArticleBriefResult =
  | { ok: true; revision: number; savedAt: string }
  | {
      ok: false;
      code: "unauthorized" | "invalid" | "not-found" | "conflict";
      message: string;
      currentRevision?: number;
    };

export async function saveArticleBriefAction(
  input: unknown,
): Promise<SaveArticleBriefResult> {
  const session = await getAllowedSession();
  if (!session) {
    return { ok: false, code: "unauthorized", message: "Your session has expired." };
  }

  const parsed = saveArticleBriefInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid", message: "The brief contains invalid content." };
  }

  const result = await createArticleBriefRevisionForUser({
    articleId: parsed.data.articleId,
    userId: session.user.id,
    expectedRevision: parsed.data.expectedRevision,
    brief: parsed.data.brief,
    source: "user",
  });
  if (!result) {
    return { ok: false, code: "not-found", message: "This brief could not be found." };
  }
  if (result.status === "conflict") {
    return {
      ok: false,
      code: "conflict",
      currentRevision: result.current.revision,
      message: "The brief changed while you were editing it. Reload before saving.",
    };
  }

  revalidatePath(`/articles/${parsed.data.articleId}`);
  return {
    ok: true,
    revision: result.brief.revision,
    savedAt: result.brief.createdAt.toISOString(),
  };
}
