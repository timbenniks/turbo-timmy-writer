import { notFound, redirect } from "next/navigation";

import { articleIdSchema } from "@/articles/model";
import { getAllowedSession } from "@/auth/session";
import { VariantsWorkspace } from "@/components/variants/variants-workspace";
import { AppShell } from "@/components/writing/app-shell";
import { listTaxonomyTagsForUser } from "@/db/queries/article-organization";
import { getArticleForUser, listRecentArticlesForUser } from "@/db/queries/articles";
import { listDeliveriesForArticleUser } from "@/db/queries/deliveries";
import { listPublicationsForArticleUser } from "@/db/queries/publications";
import { listPublicationVariantsForUser } from "@/db/queries/publication-variants";
import { listThemesForUser } from "@/db/queries/themes";
import { readButtondownEnvironment, readLinkedInEnvironment } from "@/lib/env/server";

export const dynamic = "force-dynamic";

export default async function ArticleVariantsPage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const session = await getAllowedSession();
  if (!session) redirect("/sign-in");
  const articleId = articleIdSchema.safeParse((await params).articleId);
  if (!articleId.success) notFound();

  const [article, variants, publications, deliveries, recentArticles, themes, taxonomyTags] = await Promise.all([
    getArticleForUser(articleId.data, session.user.id),
    listPublicationVariantsForUser(articleId.data, session.user.id),
    listPublicationsForArticleUser(articleId.data, session.user.id),
    listDeliveriesForArticleUser(articleId.data, session.user.id),
    listRecentArticlesForUser(session.user.id),
    listThemesForUser(session.user.id),
    listTaxonomyTagsForUser(session.user.id),
  ]);
  if (!article) notFound();

  return (
    <AppShell
      githubLogin={session.user.githubLogin}
      activeFilter="all"
      articles={[]}
      commandArticle={{ id: article.id, title: article.title }}
      recentArticles={recentArticles}
      themes={themes}
      taxonomyTags={taxonomyTags}
      content={(
        <VariantsWorkspace
          articleId={article.id}
          articleTitle={article.title}
          articleRevision={article.revision}
          buttondownConfigured={Boolean(readButtondownEnvironment())}
          linkedInConfigured={Boolean(readLinkedInEnvironment())}
          publications={publications.map((publication) => ({
            ...publication,
            createdAt: publication.createdAt.toISOString(),
            completedAt: publication.completedAt?.toISOString() ?? null,
          }))}
          deliveries={deliveries.map((delivery) => ({
            ...delivery,
            createdAt: delivery.createdAt.toISOString(),
            completedAt: delivery.completedAt?.toISOString() ?? null,
          }))}
          variants={variants.map((variant) => ({
            id: variant.id,
            destination: variant.destination,
            contentJson: variant.contentJson,
            metadataJson: variant.metadataJson,
            sourceArticleRevision: variant.sourceArticleRevision,
            revision: variant.revision,
            hasManualEdits: variant.hasManualEdits,
            status: variant.status,
            publishedAt: variant.publishedAt?.toISOString() ?? null,
            updatedAt: variant.updatedAt.toISOString(),
            freshness: variant.freshness,
          }))}
        />
      )}
    />
  );
}
