"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { articleIdSchema } from "@/articles/model";
import { getAllowedSession } from "@/auth/session";
import { savePublicationVariantForUser } from "@/db/queries/publication-variants";
import {
  variantIdSchema,
  variantPayloadSchema,
  variantStatuses,
} from "@/variants/model";

const saveVariantInputSchema = z.object({
  articleId: articleIdSchema,
  variantId: variantIdSchema,
  expectedRevision: z.number().int().positive(),
  payload: variantPayloadSchema,
  status: z.enum(variantStatuses),
});

export type SaveVariantResult =
  | { ok: true; revision: number; savedAt: string }
  | {
      ok: false;
      code: "unauthorized" | "invalid" | "not-found" | "conflict";
      message: string;
      currentRevision?: number;
    };

export async function savePublicationVariantAction(input: unknown): Promise<SaveVariantResult> {
  const session = await getAllowedSession();
  if (!session) return { ok: false, code: "unauthorized", message: "Your session has expired." };

  const parsed = saveVariantInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid", message: "The variant contains invalid destination content." };
  }
  try {
    const result = await savePublicationVariantForUser({
      variantId: parsed.data.variantId,
      userId: session.user.id,
      expectedRevision: parsed.data.expectedRevision,
      content: parsed.data.payload.content,
      metadata: parsed.data.payload.metadata,
      status: parsed.data.status,
    });
    if (!result) return { ok: false, code: "not-found", message: "This variant was not found." };
    if (result.status === "conflict") {
      return {
        ok: false,
        code: "conflict",
        currentRevision: result.currentRevision,
        message: "This variant changed elsewhere. Reload before saving.",
      };
    }
    revalidatePath(`/articles/${parsed.data.articleId}/variants`);
    return {
      ok: true,
      revision: result.variant.revision,
      savedAt: result.variant.updatedAt.toISOString(),
    };
  } catch {
    return { ok: false, code: "invalid", message: "The variant does not match its destination." };
  }
}
