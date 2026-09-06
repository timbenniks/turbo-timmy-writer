import { redirect } from "next/navigation";

import { getAllowedSession } from "@/auth/session";
import { UsageInsights } from "@/components/insights/usage-insights";
import { AppShell } from "@/components/writing/app-shell";
import { listTaxonomyTagsForUser } from "@/db/queries/article-organization";
import { listRecentArticlesForUser } from "@/db/queries/articles";
import { getUsageSummaryForUser } from "@/db/queries/insights";
import { listThemesForUser } from "@/db/queries/themes";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const session = await getAllowedSession();
  if (!session) redirect("/sign-in");
  const [summary, recentArticles, themes, taxonomyTags] = await Promise.all([
    getUsageSummaryForUser(session.user.id),
    listRecentArticlesForUser(session.user.id),
    listThemesForUser(session.user.id),
    listTaxonomyTagsForUser(session.user.id),
  ]);
  return (
    <AppShell
      githubLogin={session.user.githubLogin}
      activeFilter="all"
      activeUtility="insights"
      articles={[]}
      recentArticles={recentArticles}
      themes={themes}
      taxonomyTags={taxonomyTags}
      content={<UsageInsights summary={summary} />}
    />
  );
}
