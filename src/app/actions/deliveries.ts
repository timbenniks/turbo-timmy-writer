"use server";

import { z } from "zod";

import { articleIdSchema } from "@/articles/model";
import { getAllowedSession } from "@/auth/session";
import { getArticleForUser } from "@/db/queries/articles";
import {
  createPendingDeliveryForUser,
  failDeliveryForUser,
  succeedDeliveryForUser,
} from "@/db/queries/deliveries";
import { getPublicationVariantForUser } from "@/db/queries/publication-variants";
import { buttondownDraftSnapshot } from "@/delivery/newsletter";
import { deliverySnapshotHash } from "@/delivery/model";
import { readButtondownEnvironment } from "@/lib/env/server";
import {
  ButtondownError,
  createButtondownAdapter,
} from "@/publishing/adapters/buttondown";
import { hashCanonicalArticle } from "@/variants/hashing";
import { variantFreshness, variantIdSchema } from "@/variants/model";

const inputSchema = z.object({
  articleId: articleIdSchema,
  variantId: variantIdSchema,
  expectedRevision: z.number().int().positive(),
  confirmed: z.literal(true),
});

export async function createButtondownDraftAction(input: unknown) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: "Confirm the saved newsletter draft first." };
  }
  const session = await getAllowedSession();
  if (!session) return { ok: false as const, message: "Your session has expired." };
  const [article, variant] = await Promise.all([
    getArticleForUser(parsed.data.articleId, session.user.id),
    getPublicationVariantForUser(parsed.data.variantId, session.user.id),
  ]);
  if (!article || !variant || variant.articleId !== article.id || variant.destination !== "newsletter") {
    return { ok: false as const, message: "The newsletter variant was not found." };
  }
  if (variant.revision !== parsed.data.expectedRevision || variant.status === "draft") {
    return { ok: false as const, message: "Save the current newsletter variant as Ready before delivery." };
  }
  const freshness = variantFreshness({
    sourceArticleRevision: variant.sourceArticleRevision,
    sourceContentHash: variant.sourceContentHash,
  }, {
    sourceArticleRevision: article.revision,
    sourceContentHash: hashCanonicalArticle(article),
  });
  if (freshness.stale) {
    return { ok: false as const, message: "Regenerate the stale newsletter variant before delivery." };
  }
  const environment = readButtondownEnvironment();
  if (!environment) {
    return { ok: false as const, message: "Buttondown draft delivery is not configured." };
  }

  let snapshot: ReturnType<typeof buttondownDraftSnapshot>;
  try {
    snapshot = buttondownDraftSnapshot(variant.contentJson, variant.metadataJson);
  } catch {
    return { ok: false as const, message: "The saved newsletter fields are invalid." };
  }
  const attempt = await createPendingDeliveryForUser({
    userId: session.user.id,
    articleId: article.id,
    variantId: variant.id,
    expectedVariantRevision: variant.revision,
    expectedArticleRevision: article.revision,
    sourceContentHash: variant.sourceContentHash,
    destination: "newsletter",
    provider: "buttondown",
    operation: "create-draft",
    snapshot,
    snapshotHash: deliverySnapshotHash(snapshot),
  });
  if (!attempt) {
    return { ok: false as const, message: "The variant changed or another Buttondown delivery is pending. Reload before retrying." };
  }

  try {
    const draft = await createButtondownAdapter({ apiKey: environment.apiKey }).createDraft({
      subject: snapshot.subject,
      body: snapshot.body,
    });
    const completed = await succeedDeliveryForUser({
      deliveryId: attempt.id,
      userId: session.user.id,
      externalId: draft.id,
      resultMetadata: { status: draft.status, subject: draft.subject },
    });
    return completed
      ? { ok: true as const, message: "Buttondown draft created. Nothing was sent.", externalId: draft.id }
      : { ok: false as const, message: "Buttondown created the draft, but its local audit result needs reconciliation." };
  } catch (error) {
    const code = error instanceof ButtondownError ? error.code : "unavailable";
    await failDeliveryForUser({ deliveryId: attempt.id, userId: session.user.id, errorCode: code });
    return {
      ok: false as const,
      message: error instanceof ButtondownError
        ? error.message
        : "Buttondown could not create the newsletter draft.",
    };
  }
}
