import { redirect } from "next/navigation";

import type { LibraryFilter } from "@/articles/model";
import { getAllowedSession } from "@/auth/session";
import { AppShell } from "@/components/writing/app-shell";
import {
  listArticlesForUser,
  listRecentArticlesForUser,
} from "@/db/queries/articles";
import { listTaxonomyTagsForUser } from "@/db/queries/article-organization";
import { listThemesForUser } from "@/db/queries/themes";

type LibraryPageProps = {
  filter: LibraryFilter;
};

export async function LibraryPage({ filter }: LibraryPageProps) {
  const session = await getAllowedSession();
  if (!session) {
    redirect("/sign-in");
  }

  const [articles, recentArticles, themes, taxonomyTags] = await Promise.all([
    listArticlesForUser(session.user.id, filter),
    listRecentArticlesForUser(session.user.id),
    listThemesForUser(session.user.id),
    listTaxonomyTagsForUser(session.user.id),
  ]);

  return (
    <AppShell
      githubLogin={session.user.githubLogin}
      activeFilter={filter}
      articles={articles}
      recentArticles={recentArticles}
      themes={themes}
      taxonomyTags={taxonomyTags}
    />
  );
}
