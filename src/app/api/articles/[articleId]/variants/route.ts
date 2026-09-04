import { z } from "zod";

import { executeStructuredSkill } from "@/ai/runtime/executor";
import { createWritingProvider } from "@/ai/runtime/provider-factory";
import { repurposeSkillFor, validateRepurposeDestination } from "@/ai/skills/repurpose";
import { selectArticleVoiceGuidance } from "@/ai/voice/article-profile";
import { articleIdSchema } from "@/articles/model";
import { getAllowedSession } from "@/auth/session";
import { databaseAiRunStore } from "@/db/queries/ai-runs";
import { getArticleForUser } from "@/db/queries/articles";
import {
  articleVariantSource,
  createPublicationVariantForUser,
  getPublicationVariantForUser,
  listPublicationVariantsForUser,
  regeneratePublicationVariantForUser,
} from "@/db/queries/publication-variants";
import { readAiEnvironment } from "@/lib/env/server";
import { getDestinationProfile } from "@/variants/destinations";
import {
  regenerationDecision,
  variantDestinations,
  variantIdSchema,
} from "@/variants/model";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ articleId: string }> };

const generationRequestSchema = z.object({
  destination: z.enum(variantDestinations),
  expectedArticleRevision: z.number().int().positive(),
  variantId: variantIdSchema.nullable(),
  expectedVariantRevision: z.number().int().positive().nullable(),
  confirmManualEdits: z.boolean().default(false),
});

export async function POST(request: Request, context: RouteContext) {
  const session = await getAllowedSession();
  if (!session) return Response.json({ error: "Your session has expired." }, { status: 401 });
  const articleId = articleIdSchema.safeParse((await context.params).articleId);
  const body = generationRequestSchema.safeParse(await request.json().catch(() => null));
  if (!articleId.success) return Response.json({ error: "Article not found." }, { status: 404 });
  if (!body.success) return Response.json({ error: "The generation request is invalid." }, { status: 400 });

  const article = await getArticleForUser(articleId.data, session.user.id);
  if (!article) return Response.json({ error: "Article not found." }, { status: 404 });
  if (article.revision !== body.data.expectedArticleRevision) {
    return Response.json({ error: "Save and reload the current article before generating." }, { status: 409 });
  }
  const source = articleVariantSource(article);
  if (!source.canonicalMarkdown.trim()) {
    return Response.json({ error: "Write and save the article before creating a variant." }, { status: 400 });
  }

  let existing = null;
  if (body.data.variantId) {
    existing = await getPublicationVariantForUser(body.data.variantId, session.user.id);
    if (
      !existing ||
      existing.articleId !== articleId.data ||
      existing.destination !== body.data.destination
    ) {
      return Response.json({ error: "Variant not found." }, { status: 404 });
    }
    const decision = regenerationDecision({
      expectedArticleRevision: body.data.expectedArticleRevision,
      currentArticleRevision: article.revision,
      expectedVariantRevision: body.data.expectedVariantRevision ?? 0,
      currentVariantRevision: existing.revision,
      hasManualEdits: existing.hasManualEdits,
      confirmed: body.data.confirmManualEdits,
    });
    if (decision === "variant-conflict") {
      return Response.json({ error: "The variant changed elsewhere. Reload before regenerating." }, { status: 409 });
    }
    if (decision === "confirmation-required") {
      return Response.json({
        error: "Confirm regeneration to preserve the edited variant in history and replace the current copy.",
        confirmationRequired: true,
      }, { status: 409 });
    }
  } else {
    const variants = await listPublicationVariantsForUser(articleId.data, session.user.id);
    if (variants.some(({ destination }) => destination === body.data.destination)) {
      return Response.json({ error: "This destination already has a variant." }, { status: 409 });
    }
  }

  const environment = readAiEnvironment();
  if (!environment) return Response.json({ error: "AI is not configured for this environment." }, { status: 503 });
  const destinationProfile = getDestinationProfile(body.data.destination);

  try {
    const generated = await executeStructuredSkill(
      {
        provider: createWritingProvider(environment.apiKey),
        runStore: databaseAiRunStore,
        models: environment.models,
      },
      {
        userId: session.user.id,
        articleId: articleId.data,
        skill: repurposeSkillFor(body.data.destination),
        input: {
          canonicalTitle: article.title,
          canonicalMarkdown: source.canonicalMarkdown,
          destinationProfile,
          voiceGuidance: selectArticleVoiceGuidance(),
        },
        signal: request.signal,
      },
    );
    const output = validateRepurposeDestination(body.data.destination, generated.output);
    const result = existing
      ? await regeneratePublicationVariantForUser({
          variantId: existing.id,
          articleId: articleId.data,
          userId: session.user.id,
          expectedVariantRevision: existing.revision,
          expectedArticleRevision: article.revision,
          sourceContentHash: source.sourceContentHash,
          canonicalMarkdown: source.canonicalMarkdown,
          content: output.content,
          metadata: output.metadata,
          aiRunId: generated.runId,
        })
      : await createPublicationVariantForUser({
          articleId: articleId.data,
          userId: session.user.id,
          expectedArticleRevision: article.revision,
          sourceContentHash: source.sourceContentHash,
          canonicalMarkdown: source.canonicalMarkdown,
          destination: body.data.destination,
          content: output.content,
          metadata: output.metadata,
          aiRunId: generated.runId,
        });

    if (result.status === "conflict" || result.status === "article-conflict") {
      return Response.json({ error: "The article or variant changed while AI was working. Nothing was replaced." }, { status: 409 });
    }
    if (result.status === "not-found") {
      return Response.json({ error: "The article or variant was not found." }, { status: 404 });
    }
    if (result.status === "exists") {
      return Response.json({ error: "This destination already has a variant." }, { status: 409 });
    }
    return Response.json({ variant: result.variant }, { status: existing ? 200 : 201 });
  } catch {
    return Response.json({ error: "The variant could not be generated. The canonical article and existing variant were not changed." }, { status: 502 });
  }
}
