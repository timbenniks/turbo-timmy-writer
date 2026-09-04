import { notFound, redirect } from "next/navigation";

import { articleIdSchema } from "@/articles/model";
import { getAllowedSession } from "@/auth/session";
import { AppShell } from "@/components/writing/app-shell";
import {
  getArticleForUser,
  listRecentArticlesForUser,
} from "@/db/queries/articles";
import {
  getArticleOrganizationForUser,
  listTaxonomyTagsForUser,
} from "@/db/queries/article-organization";
import { listThemesForUser } from "@/db/queries/themes";
import { getArticleStartForUser } from "@/db/queries/writing-sessions";
import { getCurrentArticleBriefForUser } from "@/db/queries/article-briefs";
import { listEditorSuggestionsForUser } from "@/db/queries/editor-suggestions";
import { listArticleReviewsForUser } from "@/db/queries/article-reviews";
import { listAiRunsForArticleForUser } from "@/db/queries/ai-runs";

export const dynamic = "force-dynamic";

type ArticlePageProps = {
  params: Promise<{ articleId: string }>;
};

export default async function ArticlePage({ params }: ArticlePageProps) {
  const session = await getAllowedSession();
  if (!session) {
    redirect("/sign-in");
  }

  const parsedArticleId = articleIdSchema.safeParse((await params).articleId);
  if (!parsedArticleId.success) {
    notFound();
  }

  const articleId = parsedArticleId.data;
  const [article, recentArticles, organization, themes, taxonomyTags, articleStart, articleBrief, suggestions, reviews, aiRuns] = await Promise.all([
    getArticleForUser(articleId, session.user.id),
    listRecentArticlesForUser(session.user.id),
    getArticleOrganizationForUser(articleId, session.user.id),
    listThemesForUser(session.user.id),
    listTaxonomyTagsForUser(session.user.id),
    getArticleStartForUser(articleId, session.user.id),
    getCurrentArticleBriefForUser(articleId, session.user.id),
    listEditorSuggestionsForUser(articleId, session.user.id),
    listArticleReviewsForUser(articleId, session.user.id),
    listAiRunsForArticleForUser(articleId, session.user.id),
  ]);

  if (!article) {
    notFound();
  }

  return (
    <AppShell
      githubLogin={session.user.githubLogin}
      activeFilter="all"
      articles={[]}
      recentArticles={recentArticles}
      selectedArticle={article}
      selectedArticleOrganization={organization}
      selectedArticleStart={
        articleStart
          ? {
              status: articleStart.session.status,
              messages: articleStart.messages.map((message) => ({
                id: message.id,
                role: message.role,
                text: message.plainText,
              })),
            }
          : null
      }
      selectedArticleBrief={
        articleBrief
          ? {
              revision: articleBrief.revision,
              brief: articleBrief.briefJson,
              source: articleBrief.source,
              savedAt: articleBrief.createdAt.toISOString(),
            }
          : null
      }
      selectedArticleSuggestions={suggestions.map((suggestion) => ({
        id: suggestion.id,
        aiRunId: suggestion.aiRunId,
        actionId: suggestion.actionId,
        instruction: suggestion.instruction,
        sourceRevision: suggestion.sourceRevision,
        documentVersion: suggestion.documentVersion,
        selectionFrom: suggestion.selectionFrom,
        selectionTo: suggestion.selectionTo,
        selectionAnchor: suggestion.selectionAnchor,
        selectionHead: suggestion.selectionHead,
        originalText: suggestion.originalText,
        suggestedText: suggestion.suggestedText,
        status: suggestion.status,
        createdAt: suggestion.createdAt.toISOString(),
        resolvedAt: suggestion.resolvedAt?.toISOString() ?? null,
      }))}
      selectedArticleReviews={reviews.map((review) => ({
        id: review.id,
        aiRunId: review.aiRunId,
        kind: review.kind,
        skillVersion: review.skillVersion,
        sourceRevision: review.sourceRevision,
        resultJson: review.resultJson,
        createdAt: review.createdAt.toISOString(),
      }))}
      selectedArticleAiRuns={aiRuns.map((run) => ({
        ...run,
        createdAt: run.createdAt.toISOString(),
        completedAt: run.completedAt?.toISOString() ?? null,
      }))}
      themes={themes}
      taxonomyTags={taxonomyTags}
    />
  );
}
