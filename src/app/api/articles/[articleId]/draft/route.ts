import { streamTextSkill } from "@/ai/runtime/executor";
import { createWritingProvider } from "@/ai/runtime/provider-factory";
import { draftSkill } from "@/ai/skills/draft";
import { articleIdSchema } from "@/articles/model";
import { getAllowedSession } from "@/auth/session";
import { getCurrentArticleBriefForUser } from "@/db/queries/article-briefs";
import { databaseAiRunStore } from "@/db/queries/ai-runs";
import { getArticleForUser } from "@/db/queries/articles";
import { finalizeInitialDraftForUser } from "@/db/queries/drafts";
import { getArticleStartForUser } from "@/db/queries/writing-sessions";
import { generatedMarkdownToArticle } from "@/editor/serialization/markdown-to-document";
import { readAiEnvironment } from "@/lib/env/server";
import { retrieveArchiveEvidenceForDraft } from "@/search/retrieval/service";

export const runtime = "nodejs";

function streamLine(value: unknown) {
  return new TextEncoder().encode(`${JSON.stringify(value)}\n`);
}

type RouteContext = { params: Promise<{ articleId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const session = await getAllowedSession();
  if (!session) return Response.json({ error: "Your session has expired." }, { status: 401 });
  const articleId = articleIdSchema.safeParse((await context.params).articleId);
  if (!articleId.success) return Response.json({ error: "Article not found." }, { status: 404 });

  const [article, articleStart, currentBrief] = await Promise.all([
    getArticleForUser(articleId.data, session.user.id),
    getArticleStartForUser(articleId.data, session.user.id),
    getCurrentArticleBriefForUser(articleId.data, session.user.id),
  ]);
  if (!article || !articleStart || !currentBrief) {
    return Response.json({ error: "The guided article is incomplete." }, { status: 404 });
  }
  if (
    article.status !== "interviewing" ||
    article.plainText !== "" ||
    articleStart.session.status !== "active"
  ) {
    return Response.json(
      { error: "Drafting is available only before article prose has been written." },
      { status: 409 },
    );
  }

  const environment = readAiEnvironment();
  if (!environment) {
    return Response.json({ error: "AI is not configured for this environment." }, { status: 503 });
  }

  const abortController = new AbortController();
  const signal = AbortSignal.any([request.signal, abortController.signal]);
  const provider = createWritingProvider(environment.apiKey);
  const userId = session.user.id;
  const archiveEvidence = await retrieveArchiveEvidenceForDraft({
    userId,
    premise: currentBrief.briefJson.premise,
    thesis: currentBrief.briefJson.thesis,
    excludeArchiveSlug: article.slug,
  });
  const messages = articleStart.messages.map((message) => ({
    role: message.role,
    text: message.plainText,
  }));

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let markdown = "";
      try {
        const generation = streamTextSkill(
          { provider, runStore: databaseAiRunStore, models: environment.models },
          {
            userId,
            articleId: articleId.data,
            skill: draftSkill,
            input: { brief: currentBrief.briefJson, messages, archiveEvidence },
            signal,
          },
        );
        let step = await generation.next();
        while (!step.done) {
          markdown += step.value;
          controller.enqueue(streamLine({ type: "delta", text: step.value }));
          step = await generation.next();
        }

        const generated = generatedMarkdownToArticle(markdown);
        const saved = await finalizeInitialDraftForUser({
          articleId: articleId.data,
          userId,
          expectedRevision: article.revision,
          title: generated.title,
          document: generated.document,
          aiRunId: step.value.runId,
        });
        if (!saved) throw new Error("The article changed while the draft was generated.");

        controller.enqueue(
          streamLine({
            type: "done",
            title: generated.title,
            document: generated.document,
            revision: saved.revision,
            savedAt: saved.updatedAt.toISOString(),
          }),
        );
        controller.close();
      } catch {
        if (!signal.aborted) {
          controller.enqueue(
            streamLine({
              type: "error",
              error: "The draft could not be completed. The article was not changed.",
            }),
          );
          controller.close();
        }
      }
    },
    cancel() {
      abortController.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
