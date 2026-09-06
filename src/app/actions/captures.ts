"use server";

import { revalidatePath } from "next/cache";

import { getAllowedSession } from "@/auth/session";
import { quickCaptureInputSchema } from "@/captures/model";
import { createQuickCaptureForUser } from "@/db/queries/articles";

export type QuickCaptureState = { error?: string; createdId?: string };

export async function createQuickCaptureAction(
  _previousState: QuickCaptureState,
  formData: FormData,
): Promise<QuickCaptureState> {
  const session = await getAllowedSession();
  if (!session) return { error: "Your session has expired." };
  const parsed = quickCaptureInputSchema.safeParse({
    kind: formData.get("kind"),
    title: formData.get("title"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the capture details." };
  }
  const article = await createQuickCaptureForUser(session.user.id, parsed.data);
  revalidatePath("/ideas");
  return { createdId: article.id };
}
