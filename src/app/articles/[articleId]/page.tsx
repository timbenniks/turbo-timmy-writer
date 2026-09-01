import { notFound, redirect } from "next/navigation";

import { articleIdSchema } from "@/articles/model";
import { getAllowedSession } from "@/auth/session";
import { AppShell } from "@/components/writing/app-shell";
import {
  getArticleForUser,
  listRecentArticlesForUser,
} from "@/db/queries/articles";
import { getArticleOrganizationForUser } from "@/db/queries/article-organization";
import { listThemesForUser } from "@/db/queries/themes";

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
  const [article, recentArticles, organization, themes] = await Promise.all([
    getArticleForUser(articleId, session.user.id),
    listRecentArticlesForUser(session.user.id),
    getArticleOrganizationForUser(articleId, session.user.id),
    listThemesForUser(session.user.id),
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
      themes={themes}
    />
  );
}
