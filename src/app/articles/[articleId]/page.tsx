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
  const [article, recentArticles, organization, themes, taxonomyTags, articleStart, articleBrief] = await Promise.all([
    getArticleForUser(articleId, session.user.id),
    listRecentArticlesForUser(session.user.id),
    getArticleOrganizationForUser(articleId, session.user.id),
    listThemesForUser(session.user.id),
    listTaxonomyTagsForUser(session.user.id),
    getArticleStartForUser(articleId, session.user.id),
    getCurrentArticleBriefForUser(articleId, session.user.id),
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
      themes={themes}
      taxonomyTags={taxonomyTags}
    />
  );
}
