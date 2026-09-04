import { executeStructuredSkill } from "@/ai/runtime/executor";
import { createWritingProvider } from "@/ai/runtime/provider-factory";
import { editorSuggestionRequestSchema } from "@/ai/editor/model";
import { editorSkill } from "@/ai/skills/editor";
import { articleIdSchema } from "@/articles/model";
import { getAllowedSession } from "@/auth/session";
import { databaseAiRunStore } from "@/db/queries/ai-runs";
import { getArticleForUser } from "@/db/queries/articles";
import { createEditorSuggestionForUser } from "@/db/queries/editor-suggestions";
import { textAtBookmark } from "@/editor/suggestion";
import { readAiEnvironment } from "@/lib/env/server";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ articleId: string }> };

function suggestionJson(suggestion: Awaited<ReturnType<typeof createEditorSuggestionForUser>> & { status: "created" }) {
  return {
    ...suggestion.suggestion,
    createdAt: suggestion.suggestion.createdAt.toISOString(),
    resolvedAt: suggestion.suggestion.resolvedAt?.toISOString() ?? null,
  };
}

export async function POST(request: Request, context: RouteContext) {
  const session = await getAllowedSession();
  if (!session) return Response.json({ error: "Your session has expired." }, { status: 401 });
  const articleId = articleIdSchema.safeParse((await context.params).articleId);
  if (!articleId.success) return Response.json({ error: "Article not found." }, { status: 404 });
  const body = await request.json().catch(() => null);
  const parsed = editorSuggestionRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "The selected passage is invalid." }, { status: 400 });

  const article = await getArticleForUser(articleId.data, session.user.id);
  if (!article) return Response.json({ error: "Article not found." }, { status: 404 });
  if (
    article.revision !== parsed.data.selection.sourceRevision ||
    textAtBookmark(article.documentJson, parsed.data.selection.bookmark) !== parsed.data.selection.originalText
  ) {
    return Response.json({ error: "The selected passage changed. Select it again." }, { status: 409 });
  }
  const environment = readAiEnvironment();
  if (!environment) return Response.json({ error: "AI is not configured for this environment." }, { status: 503 });

  const selectedIndex = article.plainText.indexOf(parsed.data.selection.originalText);
  const before = selectedIndex < 0 ? "" : article.plainText.slice(Math.max(0, selectedIndex - 2_000), selectedIndex);
  const after = selectedIndex < 0 ? "" : article.plainText.slice(
    selectedIndex + parsed.data.selection.originalText.length,
    selectedIndex + parsed.data.selection.originalText.length + 2_000,
  );
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
        skill: editorSkill,
        input: {
          actionId: parsed.data.actionId,
          instruction: parsed.data.instruction,
          originalText: parsed.data.selection.originalText,
          before,
          after,
        },
        signal: request.signal,
      },
    );
    const created = await createEditorSuggestionForUser({
      userId: session.user.id,
      articleId: articleId.data,
      runId: generated.runId,
      request: parsed.data,
      suggestedText: generated.output.suggestedText,
    });
    if (created.status !== "created") {
      return Response.json({ error: "The article changed while AI was working. Nothing was saved." }, { status: 409 });
    }
    return Response.json({ suggestion: suggestionJson(created) }, { status: 201 });
  } catch {
    return Response.json({ error: "The suggestion could not be generated. Your article was not changed." }, { status: 502 });
  }
}
