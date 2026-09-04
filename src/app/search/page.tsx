import { redirect } from "next/navigation";

import { getAllowedSession } from "@/auth/session";
import { ArchiveSearch } from "@/components/archive/archive-search";
import { AppShell } from "@/components/writing/app-shell";
import { listTaxonomyTagsForUser } from "@/db/queries/article-organization";
import { listRecentArticlesForUser } from "@/db/queries/articles";
import { listThemesForUser } from "@/db/queries/themes";
import {
  archiveSearchInputSchema,
  archiveSearchModeSchema,
  type ArchiveSearchResult,
} from "@/search/retrieval/model";
import { retrieveArchiveForUser } from "@/search/retrieval/service";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getAllowedSession();
  if (!session) redirect("/sign-in");
  const params = await searchParams;
  const query = first(params.q)?.trim() ?? "";
  const parsedMode = archiveSearchModeSchema.safeParse(first(params.mode));
  const mode = parsedMode.success ? parsedMode.data : "hybrid";
  let results: ArchiveSearchResult[] = [];
  let error: string | undefined;

  if (query) {
    const input = archiveSearchInputSchema.safeParse({ query, mode, limit: 10 });
    if (!input.success) {
      error = "Enter between 2 and 500 characters to search the archive.";
    } else {
      try {
        results = await retrieveArchiveForUser(session.user.id, input.data);
      } catch {
        error = "Archive search is temporarily unavailable.";
      }
    }
  }

  const [recentArticles, themes, taxonomyTags] = await Promise.all([
    listRecentArticlesForUser(session.user.id),
    listThemesForUser(session.user.id),
    listTaxonomyTagsForUser(session.user.id),
  ]);

  return (
    <AppShell
      githubLogin={session.user.githubLogin}
      activeFilter="all"
      articles={[]}
      recentArticles={recentArticles}
      themes={themes}
      taxonomyTags={taxonomyTags}
      content={<ArchiveSearch query={query} mode={mode} results={results} error={error} />}
    />
  );
}
