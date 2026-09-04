import { z } from "zod";

import { articleIdSchema } from "@/articles/model";
import { getAllowedSession } from "@/auth/session";
import {
  acceptEditorSuggestionForUser,
  rejectEditorSuggestionForUser,
} from "@/db/queries/editor-suggestions";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ articleId: string; suggestionId: string }> };
const resolutionSchema = z.object({ action: z.enum(["accept", "reject"]) });

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getAllowedSession();
  if (!session) return Response.json({ error: "Your session has expired." }, { status: 401 });
  const params = await context.params;
  const articleId = articleIdSchema.safeParse(params.articleId);
  const suggestionId = z.uuid().safeParse(params.suggestionId);
  const body = resolutionSchema.safeParse(await request.json().catch(() => null));
  if (!articleId.success || !suggestionId.success) {
    return Response.json({ error: "Suggestion not found." }, { status: 404 });
  }
  if (!body.success) return Response.json({ error: "The suggestion action is invalid." }, { status: 400 });

  if (body.data.action === "reject") {
    const rejected = await rejectEditorSuggestionForUser({
      suggestionId: suggestionId.data,
      articleId: articleId.data,
      userId: session.user.id,
    });
    return rejected
      ? Response.json({ status: "rejected" })
      : Response.json({ error: "The suggestion is no longer pending." }, { status: 409 });
  }

  const accepted = await acceptEditorSuggestionForUser({
    suggestionId: suggestionId.data,
    articleId: articleId.data,
    userId: session.user.id,
  });
  if (accepted.status !== "accepted" || !("document" in accepted)) {
    return Response.json(
      { error: accepted.status === "superseded" ? "The source passage changed. The suggestion was not applied." : "The suggestion is no longer pending.", status: accepted.status },
      { status: 409 },
    );
  }
  const updatedAt = "updatedAt" in accepted ? accepted.updatedAt : null;
  if (!updatedAt) {
    return Response.json({ error: "The suggestion is no longer pending." }, { status: 409 });
  }
  return Response.json({
    status: "accepted",
    document: accepted.document,
    revision: accepted.revision,
    savedAt: updatedAt.toISOString(),
  });
}
