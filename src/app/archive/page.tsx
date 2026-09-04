import { redirect } from "next/navigation";

import { getAllowedSession } from "@/auth/session";
import { ArchiveLibrary } from "@/components/archive/archive-library";
import { AppShell } from "@/components/writing/app-shell";
import { listTaxonomyTagsForUser } from "@/db/queries/article-organization";
import { listArchiveDocumentsForUser } from "@/db/queries/archive-documents";
import { listRecentArticlesForUser } from "@/db/queries/articles";
import { listThemesForUser } from "@/db/queries/themes";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const session = await getAllowedSession();
  if (!session) redirect("/sign-in");
  const [documents, recentArticles, themes, taxonomyTags] = await Promise.all([
    listArchiveDocumentsForUser(session.user.id),
    listRecentArticlesForUser(session.user.id),
    listThemesForUser(session.user.id),
    listTaxonomyTagsForUser(session.user.id),
  ]);

  return (
    <AppShell
      githubLogin={session.user.githubLogin}
      activeFilter="archive"
      articles={[]}
      recentArticles={recentArticles}
      themes={themes}
      taxonomyTags={taxonomyTags}
      content={<ArchiveLibrary documents={documents} />}
    />
  );
}
