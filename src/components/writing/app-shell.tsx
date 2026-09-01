import {
  ChevronDown,
  Command,
  FileText,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import {
  articleDisplayTitle,
  articleStatusLabel,
  type ArticleMetadata,
  type ArticleStatus,
  type LibraryFilter,
} from "@/articles/model";
import { createBlankArticleAction } from "@/app/actions/articles";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ArticleEditor } from "@/components/editor/article-editor";
import { Button } from "@/components/ui/button";
import type { ArticleDocument } from "@/editor/document";
import { libraryDestinations } from "@/lib/navigation";

type ArticleSummary = {
  id: string;
  title: string;
  status: ArticleStatus;
  plainText: string;
  createdAt: Date;
  updatedAt: Date;
};

type SelectedArticle = ArticleSummary & {
  userId: string;
  slug: string;
  documentJson: ArticleDocument;
  metadata: ArticleMetadata;
  revision: number;
  publishedAt: Date | null;
};

type AppShellProps = {
  githubLogin: string;
  activeFilter: LibraryFilter;
  articles: ArticleSummary[];
  recentArticles: ArticleSummary[];
  selectedArticle?: SelectedArticle;
};

const filterTitles: Record<LibraryFilter, string> = {
  all: "Library",
  drafts: "Drafts",
  ideas: "Ideas",
  published: "Published",
  archive: "Archive",
};

function formatUpdatedAt(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function NewArticleButton({ compact = false }: { compact?: boolean }) {
  return (
    <form action={createBlankArticleAction}>
      <Button
        className={compact ? undefined : "w-full justify-start shadow-sm"}
        size={compact ? "sm" : "default"}
        type="submit"
      >
        <Plus />
        Blank article
      </Button>
    </form>
  );
}

export function AppShell({
  githubLogin,
  activeFilter,
  articles,
  recentArticles,
  selectedArticle,
}: AppShellProps) {
  return (
    <main className="min-h-screen bg-background p-2 text-foreground sm:p-3">
      <div className="mx-auto grid min-h-[calc(100vh-1rem)] max-w-[1800px] overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_24px_70px_rgba(37,32,24,0.08)] sm:min-h-[calc(100vh-1.5rem)] lg:grid-cols-[248px_minmax(0,1fr)_320px]">
        <aside className="hidden border-r border-border bg-sidebar lg:flex lg:flex-col">
          <div className="flex h-16 items-center justify-between px-4">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold hover:bg-muted"
            >
              <span className="grid size-7 place-items-center rounded-lg bg-foreground font-serif text-sm text-background">
                T
              </span>
              Turbo Timmy
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </Link>
            <Button variant="ghost" size="icon" aria-label="More options">
              <MoreHorizontal />
            </Button>
          </div>

          <div className="px-3 pb-3">
            <NewArticleButton />
          </div>

          <nav className="space-y-1 px-3" aria-label="Writing library">
            {libraryDestinations.map(({ label, href, icon: Icon, filter }) => (
              <Link
                key={label}
                href={href}
                className={`flex h-9 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
                  !selectedArticle && activeFilter === filter
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="mt-7 px-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Recent writing
          </div>
          <div className="mt-2 space-y-1 px-3">
            {recentArticles.length ? (
              recentArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/articles/${article.id}` as Route}
                  className="block w-full rounded-lg px-3 py-2 text-left hover:bg-muted"
                >
                  <span className="block truncate text-sm text-foreground">
                    {articleDisplayTitle(article.title)}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {articleStatusLabel(article.status)} · {formatUpdatedAt(article.updatedAt)}
                  </span>
                </Link>
              ))
            ) : (
              <p className="px-3 py-2 text-xs leading-5 text-muted-foreground">
                Blank pages will appear here.
              </p>
            )}
          </div>

          <div className="mt-auto space-y-1 border-t border-border p-3">
            <button className="flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
              <Search className="size-4" />
              Search
              <span className="ml-auto rounded border border-border px-1.5 py-0.5 text-[10px]">
                ⌘K
              </span>
            </button>
            <button className="flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
              <Settings className="size-4" />
              <span className="min-w-0 flex-1 truncate text-left">@{githubLogin}</span>
            </button>
            <div className="flex justify-end">
              <SignOutButton />
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col bg-editor">
          {selectedArticle ? (
            <ArticleWorkspace article={selectedArticle} />
          ) : (
            <Library articles={articles} filter={activeFilter} />
          )}
        </section>

        <aside className="hidden border-l border-border bg-assistant xl:flex xl:flex-col">
          <header className="flex h-16 items-center border-b border-border px-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="size-4 text-accent" />
              Assistant
            </div>
            <span className="ml-auto rounded-full bg-accent-soft px-2 py-1 text-[10px] font-medium text-accent">
              Quiet
            </span>
          </header>
          <div className="flex flex-1 items-center px-7">
            <div>
              <p className="font-serif text-xl">Writing first.</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                The assistant stays out of the way until the AI writing phases.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Library({
  articles,
  filter,
}: {
  articles: ArticleSummary[];
  filter: LibraryFilter;
}) {
  const title = filterTitles[filter];

  return (
    <>
      <header className="flex min-h-16 items-center gap-3 border-b border-border px-4 py-3 sm:px-6">
        <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open library">
          <Command />
        </Button>
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">
            {articles.length} {articles.length === 1 ? "article" : "articles"}
          </p>
        </div>
        <div className="ml-auto lg:hidden">
          <NewArticleButton compact />
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-10 sm:py-14">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Writing
            </p>
            <h1 className="mt-3 font-serif text-4xl tracking-[-0.035em] sm:text-5xl">
              {title}
            </h1>
          </div>
          <div className="hidden lg:block">
            <NewArticleButton compact />
          </div>
        </div>

        {articles.length ? (
          <div className="mt-10 divide-y divide-border border-y border-border">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/articles/${article.id}` as Route}
                className="group grid gap-3 py-5 transition-colors hover:bg-sidebar sm:grid-cols-[minmax(0,1fr)_auto] sm:px-4"
              >
                <div className="min-w-0">
                  <h2 className="truncate font-serif text-xl group-hover:text-accent">
                    {articleDisplayTitle(article.title)}
                  </h2>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {article.plainText || "A blank page, ready for a first sentence."}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground sm:justify-end">
                  <span className="rounded-full border border-border bg-surface px-2.5 py-1">
                    {articleStatusLabel(article.status)}
                  </span>
                  <time dateTime={article.updatedAt.toISOString()}>
                    {formatUpdatedAt(article.updatedAt)}
                  </time>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-12 rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
            <FileText className="mx-auto size-6 text-muted-foreground" />
            <h2 className="mt-5 font-serif text-2xl">Nothing here yet.</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              Create a blank article. The editor itself arrives in the next validated slice.
            </p>
            <div className="mt-6 flex justify-center">
              <NewArticleButton compact />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function ArticleWorkspace({ article }: { article: SelectedArticle }) {
  return (
    <ArticleEditor
      articleId={article.id}
      initialTitle={article.title}
      initialDocument={article.documentJson}
      status={article.status}
      revision={article.revision}
      updatedAt={article.updatedAt.toISOString()}
    />
  );
}
