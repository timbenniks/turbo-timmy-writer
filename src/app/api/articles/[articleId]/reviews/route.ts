import { z } from "zod";

import { executeStructuredSkill } from "@/ai/runtime/executor";
import { createWritingProvider } from "@/ai/runtime/provider-factory";
import { reviewKinds, type ArticleReviewOutput } from "@/ai/review/model";
import { criticSkill } from "@/ai/skills/critic";
import { humanizerSkill } from "@/ai/skills/humanizer";
import { articleIdSchema } from "@/articles/model";
import { getAllowedSession } from "@/auth/session";
import { databaseAiRunStore } from "@/db/queries/ai-runs";
import { createArticleReviewForUser } from "@/db/queries/article-reviews";
import { getArticleForUser } from "@/db/queries/articles";
import { readAiEnvironment } from "@/lib/env/server";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ articleId: string }> };
const reviewRequestSchema = z.object({
  kind: z.enum(reviewKinds),
  sourceRevision: z.number().int().positive(),
});

function keepAnchoredFindings(result: ArticleReviewOutput, article: string) {
  return {
    ...result,
    findings: result.findings.filter((finding) => finding.quote === null || article.includes(finding.quote)),
  } as ArticleReviewOutput;
}

export async function POST(request: Request, context: RouteContext) {
  const session = await getAllowedSession();
  if (!session) return Response.json({ error: "Your session has expired." }, { status: 401 });
  const articleId = articleIdSchema.safeParse((await context.params).articleId);
  const body = reviewRequestSchema.safeParse(await request.json().catch(() => null));
  if (!articleId.success) return Response.json({ error: "Article not found." }, { status: 404 });
  if (!body.success) return Response.json({ error: "The review request is invalid." }, { status: 400 });
  const article = await getArticleForUser(articleId.data, session.user.id);
  if (!article) return Response.json({ error: "Article not found." }, { status: 404 });
  if (article.revision !== body.data.sourceRevision) {
    return Response.json({ error: "Save the latest article before reviewing it." }, { status: 409 });
  }
  if (!article.plainText.trim()) return Response.json({ error: "Write some prose before requesting a review." }, { status: 400 });
  const environment = readAiEnvironment();
  if (!environment) return Response.json({ error: "AI is not configured for this environment." }, { status: 503 });
  const skill = body.data.kind === "humanizer" ? humanizerSkill : criticSkill;
  try {
    const dependencies = {
      provider: createWritingProvider(environment.apiKey),
      runStore: databaseAiRunStore,
      models: environment.models,
    };
    const skillInput = { title: article.title, plainText: article.plainText, sourceRevision: article.revision };
    const generated = body.data.kind === "humanizer"
      ? await executeStructuredSkill(dependencies, {
          userId: session.user.id,
          articleId: articleId.data,
          skill: humanizerSkill,
          input: skillInput,
          signal: request.signal,
        })
      : await executeStructuredSkill(dependencies, {
          userId: session.user.id,
          articleId: articleId.data,
          skill: criticSkill,
          input: skillInput,
          signal: request.signal,
        });
    const result = keepAnchoredFindings(generated.output, article.plainText);
    const created = await createArticleReviewForUser({
      userId: session.user.id,
      articleId: articleId.data,
      runId: generated.runId,
      kind: body.data.kind,
      skillVersion: skill.version,
      sourceRevision: article.revision,
      result,
    });
    if (created.status !== "created") {
      return Response.json({ error: "The article changed while the review was running. No review was saved." }, { status: 409 });
    }
    return Response.json({
      review: {
        ...created.review,
        createdAt: created.review.createdAt.toISOString(),
        resultJson: result,
      },
    }, { status: 201 });
  } catch {
    return Response.json({ error: "The review could not be completed. Your article was not changed." }, { status: 502 });
  }
}
