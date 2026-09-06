import { redirect } from "next/navigation";

import { getAllowedSession } from "@/auth/session";
import { ArchiveGraphExplorer } from "@/components/archive/archive-graph-explorer";
import { AppShell } from "@/components/writing/app-shell";
import { listTaxonomyTagsForUser } from "@/db/queries/article-organization";
import { listArchiveDocumentsForUser } from "@/db/queries/archive-documents";
import { listRecentArticlesForUser } from "@/db/queries/articles";
import { listThemesForUser } from "@/db/queries/themes";
import { buildArchiveRelationshipGraph } from "@/search/archive/relationships";

export const dynamic = "force-dynamic";

export default async function ArchiveGraphPage() {
  const session = await getAllowedSession();
  if (!session) redirect("/sign-in");
  const [documents, recentArticles, themes, taxonomyTags] = await Promise.all([
    listArchiveDocumentsForUser(session.user.id),
    listRecentArticlesForUser(session.user.id),
    listThemesForUser(session.user.id),
    listTaxonomyTagsForUser(session.user.id),
  ]);
  const graph = buildArchiveRelationshipGraph(documents);
  return (
    <AppShell
      githubLogin={session.user.githubLogin}
      activeFilter="archive"
      articles={[]}
      recentArticles={recentArticles}
      themes={themes}
      taxonomyTags={taxonomyTags}
      content={(
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-10 sm:px-10 sm:py-14">
          <div className="mx-auto max-w-5xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Writing memory</p>
            <h1 className="mt-3 font-serif text-4xl tracking-[-0.035em] sm:text-5xl">Archive relationships</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">Explore deterministic shared-tag connections. Edge strength reflects tag overlap, not AI similarity or factual dependence.</p>
            <div className="mt-8"><ArchiveGraphExplorer nodes={graph.nodes} edges={graph.edges} /></div>
          </div>
        </div>
      )}
    />
  );
}
