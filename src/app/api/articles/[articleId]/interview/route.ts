import { z } from "zod";

import { executeStructuredSkill, streamTextSkill } from "@/ai/runtime/executor";
import { createWritingProvider } from "@/ai/runtime/provider-factory";
import {
  interviewSkill,
  isCompleteInterviewResponse,
} from "@/ai/skills/interview";
import { briefUpdateSkill } from "@/ai/skills/brief";
import { articleIdSchema } from "@/articles/model";
import { getAllowedSession } from "@/auth/session";
import { databaseAiRunStore } from "@/db/queries/ai-runs";
import {
  createArticleBriefRevisionForUser,
  getCurrentArticleBriefForUser,
} from "@/db/queries/article-briefs";
import {
  appendWritingMessageForUser,
  getArticleStartForUser,
} from "@/db/queries/writing-sessions";
import { readAiEnvironment } from "@/lib/env/server";

export const runtime = "nodejs";

const interviewRequestSchema = z.object({
  answer: z.string().trim().min(1).max(10_000).optional(),
});

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function streamLine(value: unknown) {
  return new TextEncoder().encode(`${JSON.stringify(value)}\n`);
}

type RouteContext = { params: Promise<{ articleId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const session = await getAllowedSession();
  if (!session) return jsonError("Your session has expired.", 401);

  const articleId = articleIdSchema.safeParse((await context.params).articleId);
  if (!articleId.success) return jsonError("Article not found.", 404);

  const body = interviewRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return jsonError("That response is not valid.", 400);

  let articleStart = await getArticleStartForUser(
    articleId.data,
    session.user.id,
  );
  if (!articleStart || articleStart.session.status !== "active") {
    return jsonError("This interview is not active.", 404);
  }

  const currentLastMessage = articleStart.messages.at(-1);
  if (body.data.answer) {
    if (currentLastMessage?.role !== "assistant") {
      return jsonError("A response is already being generated.", 409);
    }
    const appended = await appendWritingMessageForUser({
      sessionId: articleStart.session.id,
      userId: session.user.id,
      role: "user",
      text: body.data.answer,
    });
    if (!appended) return jsonError("This interview is no longer active.", 409);
    articleStart = await getArticleStartForUser(articleId.data, session.user.id);
  } else if (currentLastMessage?.role !== "user") {
    return jsonError("The interview is waiting for your response.", 409);
  }

  if (!articleStart) return jsonError("This interview is not active.", 404);

  const environment = readAiEnvironment();
  if (!environment) {
    return jsonError("AI is not configured for this environment.", 503);
  }

  const premise = articleStart.messages[0]?.plainText;
  if (!premise) return jsonError("The saved premise is missing.", 500);

  const abortController = new AbortController();
  const signal = AbortSignal.any([request.signal, abortController.signal]);
  const provider = createWritingProvider(environment.apiKey);
  const sessionId = articleStart.session.id;
  const userId = session.user.id;
  const messages = articleStart.messages.map((message) => ({
    role: message.role,
    text: message.plainText,
  }));

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let assistantText = "";
      try {
        const generation = streamTextSkill(
          {
            provider,
            runStore: databaseAiRunStore,
            models: environment.models,
          },
          {
            userId,
            articleId: articleId.data,
            skill: interviewSkill,
            input: { premise, messages },
            signal,
          },
        );

        let step = await generation.next();
        while (!step.done) {
          assistantText += step.value;
          controller.enqueue(streamLine({ type: "delta", text: step.value }));
          step = await generation.next();
        }

        if (!isCompleteInterviewResponse(assistantText)) {
          throw new Error("The interview response was incomplete.");
        }

        const savedMessage = await appendWritingMessageForUser({
          sessionId,
          userId,
          role: "assistant",
          text: assistantText,
          aiRunId: step.value.runId,
        });
        if (!savedMessage) throw new Error("The interview message could not be saved.");

        controller.enqueue(
          streamLine({
            type: "done",
            message: {
              id: savedMessage.id,
              role: savedMessage.role,
              text: savedMessage.plainText,
            },
          }),
        );

        if (body.data.answer) {
          try {
            const currentBrief = await getCurrentArticleBriefForUser(
              articleId.data,
              userId,
            );
            if (!currentBrief) throw new Error("The working brief is missing.");

            const updated = await executeStructuredSkill(
              {
                provider,
                runStore: databaseAiRunStore,
                models: environment.models,
              },
              {
                userId,
                articleId: articleId.data,
                skill: briefUpdateSkill,
                input: {
                  currentBrief: currentBrief.briefJson,
                  messages: [
                    ...messages,
                    { role: "assistant" as const, text: assistantText },
                  ],
                },
                signal,
              },
            );
            const savedBrief = await createArticleBriefRevisionForUser({
              articleId: articleId.data,
              userId,
              expectedRevision: currentBrief.revision,
              brief: updated.output,
              source: "ai",
              aiRunId: updated.runId,
            });
            const brief =
              savedBrief?.status === "created"
                ? savedBrief.brief
                : savedBrief?.status === "conflict"
                  ? savedBrief.current
                  : null;
            if (!brief) throw new Error("The working brief could not be saved.");
            controller.enqueue(
              streamLine({
                type: "brief",
                brief: {
                  revision: brief.revision,
                  brief: brief.briefJson,
                  source: brief.source,
                  savedAt: brief.createdAt.toISOString(),
                },
              }),
            );
          } catch {
            controller.enqueue(
              streamLine({
                type: "brief-error",
                error: "The question was saved, but the brief could not be refreshed.",
              }),
            );
          }
        }
        controller.close();
      } catch {
        if (!signal.aborted) {
          controller.enqueue(
            streamLine({
              type: "error",
              error: "The assistant could not respond. Your words are safely stored; try again.",
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
