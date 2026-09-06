import { ArrowLeft, Bot, GitCompareArrows } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { articleDisplayTitle, articleIdSchema } from "@/articles/model";
import { getAllowedSession } from "@/auth/session";
import { AppShell } from "@/components/writing/app-shell";
import { listTaxonomyTagsForUser } from "@/db/queries/article-organization";
import { getArticleForUser, listRecentArticlesForUser } from "@/db/queries/articles";
import { listArticleVersionsForUser } from "@/db/queries/article-versions";
import { listThemesForUser } from "@/db/queries/themes";
import { articleDocumentToMarkdown } from "@/editor/serialization/markdown";
import { diffVersionText } from "@/versions/diff";

export const dynamic = "force-dynamic";

const comparisonIdSchema = z.union([z.literal("current"), z.uuid()]);

type HistorySnapshot = {
  id: string;
  articleRevision: number;
  title: string;
  plainText: string;
  markdown: string;
  reason: string;
  label: string | null;
  createdAt: Date;
  aiRunId: string | null;
  aiSkillId: string | null;
  aiSkillVersion: string | null;
  aiModel: string | null;
  aiStatus: "running" | "succeeded" | "failed" | "cancelled" | null;
  aiDurationMs: number | null;
};

function formatTimestamp(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function snapshotName(snapshot: HistorySnapshot) {
  return snapshot.id === "current"
    ? "Current document"
    : snapshot.label || snapshot.reason.replaceAll("-", " ");
}

export default async function ArticleHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ articleId: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await getAllowedSession();
  if (!session) redirect("/sign-in");

  const articleId = articleIdSchema.safeParse((await params).articleId);
  if (!articleId.success) notFound();

  const [article, versions, recentArticles, themes, taxonomyTags] = await Promise.all([
    getArticleForUser(articleId.data, session.user.id),
    listArticleVersionsForUser(articleId.data, session.user.id),
    listRecentArticlesForUser(session.user.id),
    listThemesForUser(session.user.id),
    listTaxonomyTagsForUser(session.user.id),
  ]);
  if (!article) notFound();

  const current: HistorySnapshot = {
    id: "current",
    articleRevision: article.revision,
    title: article.title,
    plainText: article.plainText,
    markdown: articleDocumentToMarkdown(article.documentJson),
    reason: "current",
    label: "Current document",
    createdAt: article.updatedAt,
    aiRunId: null,
    aiSkillId: null,
    aiSkillVersion: null,
    aiModel: null,
    aiStatus: null,
    aiDurationMs: null,
  };
  const snapshots: HistorySnapshot[] = [current, ...versions];
  const requested = await searchParams;
  const parsedFrom = comparisonIdSchema.safeParse(requested.from);
  const parsedTo = comparisonIdSchema.safeParse(requested.to);
  const toId = parsedTo.success ? parsedTo.data : "current";
  const fromId = parsedFrom.success ? parsedFrom.data : versions[0]?.id;
  const before = snapshots.find(({ id }) => id === fromId);
  const after = snapshots.find(({ id }) => id === toId);
  if ((fromId && !before) || !after) notFound();
  const comparison = before ? diffVersionText(before.plainText, after.plainText) : null;

  return (
    <AppShell
      githubLogin={session.user.githubLogin}
      activeFilter="all"
      articles={[]}
      recentArticles={recentArticles}
      themes={themes}
      taxonomyTags={taxonomyTags}
      content={(
        <main className="min-w-0 flex-1 overflow-y-auto bg-background px-4 py-6 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-6xl">
            <Link
              href={`/articles/${article.id}` as Route}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back to article
            </Link>

            <div className="mt-6 flex items-start gap-3">
              <GitCompareArrows className="mt-1 size-5 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Version history</p>
                <h1 className="mt-1 font-serif text-3xl">{articleDisplayTitle(article.title)}</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Compare immutable checkpoints with each other or with revision {article.revision}.
                </p>
              </div>
            </div>

            {versions.length === 0 ? (
              <div className="mt-8 rounded-xl border border-dashed border-border bg-surface px-6 py-12 text-center">
                <p className="font-medium">No checkpoints yet.</p>
                <p className="mt-2 text-sm text-muted-foreground">Create a checkpoint from the article toolbar to start its history.</p>
              </div>
            ) : (
              <>
                <form className="mt-8 grid gap-4 rounded-xl border border-border bg-surface p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                    Earlier version
                    <select name="from" defaultValue={before?.id} className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
                      {snapshots.map((snapshot) => (
                        <option key={snapshot.id} value={snapshot.id}>
                          {snapshotName(snapshot)} · r{snapshot.articleRevision}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                    Later version
                    <select name="to" defaultValue={after.id} className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
                      {snapshots.map((snapshot) => (
                        <option key={snapshot.id} value={snapshot.id}>
                          {snapshotName(snapshot)} · r{snapshot.articleRevision}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="submit" className="h-10 rounded-lg bg-foreground px-4 text-sm font-medium text-background hover:bg-foreground/88">
                    Compare
                  </button>
                </form>

                {before && comparison ? (
                  <>
                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      {[before, after].map((snapshot) => (
                        <section key={snapshot.id} className="rounded-xl border border-border bg-surface p-4">
                          <p className="font-medium">{snapshotName(snapshot)}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Revision {snapshot.articleRevision} · {formatTimestamp(snapshot.createdAt)}
                          </p>
                          {snapshot.aiRunId ? (
                            <div className="mt-3 flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                              <Bot className="mt-0.5 size-3.5 shrink-0" />
                              <span>
                                {snapshot.aiSkillId}@{snapshot.aiSkillVersion} · {snapshot.aiModel} · {snapshot.aiStatus}
                                {snapshot.aiDurationMs === null ? "" : ` · ${snapshot.aiDurationMs} ms`}
                              </span>
                            </div>
                          ) : null}
                        </section>
                      ))}
                    </div>

                    {before.title !== after.title ? (
                      <section aria-label="Title change" className="mt-4 rounded-xl border border-border bg-surface p-4 text-sm">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Title changed</p>
                        <p className="mt-2 text-red-800 line-through">{articleDisplayTitle(before.title)}</p>
                        <p className="mt-1 text-emerald-800">{articleDisplayTitle(after.title)}</p>
                      </section>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-3 text-xs font-medium">
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-900">+{comparison.added} lines</span>
                      <span className="rounded-full bg-red-100 px-3 py-1 text-red-900">−{comparison.removed} lines</span>
                      <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">{comparison.unchanged} unchanged</span>
                    </div>

                    <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface py-2 font-mono text-xs leading-6">
                      {comparison.lines.length === 0 ? (
                        <p className="px-4 py-8 text-center font-sans text-muted-foreground">Both snapshots are empty.</p>
                      ) : comparison.lines.map((line, index) => (
                        <div
                          key={`${index}-${line.kind}`}
                          className={`grid grid-cols-[2rem_1fr] px-3 ${
                            line.kind === "added"
                              ? "bg-emerald-50 text-emerald-950"
                              : line.kind === "removed"
                                ? "bg-red-50 text-red-950"
                                : "text-muted-foreground"
                          }`}
                        >
                          <span aria-hidden="true" className="select-none text-center opacity-60">
                            {line.kind === "added" ? "+" : line.kind === "removed" ? "−" : " "}
                          </span>
                          <span className="whitespace-pre-wrap break-words">{line.text || " "}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
              </>
            )}
          </div>
        </main>
      )}
    />
  );
}
