"use client";

import { useEffect, useState } from "react";
import { BookOpenText, ExternalLink, MessageSquareText, Sparkles, X } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import type { ArticleBriefSnapshot } from "@/components/writing/article-brief-editor";
import {
  InterviewAssistant,
  type InterviewMessage,
} from "@/components/writing/interview-assistant";
import { Button } from "@/components/ui/button";

export function WorkspaceAssistant({
  articleId,
  articleStart,
  brief,
  relatedWriting = [],
  memoryQuery = "",
}: {
  articleId?: string;
  articleStart?: {
    status: "active" | "completed" | "cancelled";
    messages: InterviewMessage[];
  } | null;
  brief?: ArticleBriefSnapshot | null;
  relatedWriting?: {
    archiveDocumentId: string;
    title: string;
    url: string;
    passage: string;
  }[];
  memoryQuery?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <>
      {articleId && (
        <Button
          className="fixed bottom-4 right-4 z-40 shadow-lg xl:hidden"
          onClick={() => setOpen(true)}
          aria-label="Open assistant"
        >
          <MessageSquareText />
          Assistant
        </Button>
      )}
      {open && (
        <button
          type="button"
          aria-label="Close assistant overlay"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/30 xl:hidden"
        />
      )}
      <aside
        aria-label="Writing assistant"
        className={`workspace-assistant min-h-0 border-l border-border bg-assistant xl:static xl:z-auto xl:flex xl:w-auto xl:flex-col xl:rounded-none xl:border-y-0 xl:border-r-0 xl:shadow-none ${
          open
            ? "fixed inset-y-3 right-3 z-50 flex w-[min(380px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border shadow-2xl"
            : "hidden"
        }`}
      >
        <header className="flex h-16 shrink-0 items-center border-b border-border px-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-accent" />
            Assistant
          </div>
          <span className="ml-auto rounded-full bg-accent-soft px-2 py-1 text-[10px] font-medium text-accent">
            Quiet
          </span>
          <Button
            className="ml-2 xl:hidden"
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            aria-label="Close assistant"
          >
            <X />
          </Button>
        </header>
        {articleId ? (
          <>
            {articleStart ? (
              <InterviewAssistant
                articleId={articleId}
                initialMessages={articleStart.messages}
                initialBrief={brief ?? undefined}
                initialStatus={articleStart.status}
              />
            ) : null}
            <WritingMemoryPanel items={relatedWriting} query={memoryQuery} />
          </>
        ) : (
          <div className="flex flex-1 items-center px-7">
            <div>
              <p className="font-serif text-xl">Writing first.</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Start with a premise when you want a focused editorial conversation.
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

function WritingMemoryPanel({
  items,
  query,
}: {
  items: {
    archiveDocumentId: string;
    title: string;
    url: string;
    passage: string;
  }[];
  query: string;
}) {
  const searchHref = query
    ? `/search?q=${encodeURIComponent(query)}&mode=hybrid`
    : "/search";

  return (
    <section className="max-h-[42%] shrink-0 overflow-y-auto border-t border-border px-5 py-5">
      <div className="flex items-center gap-2">
        <BookOpenText className="size-4 text-accent" />
        <h2 className="text-sm font-semibold">Have I written this before?</h2>
      </div>
      {items.length ? (
        <div className="mt-3 space-y-3">
          {items.slice(0, 3).map((item) => (
            <a
              key={item.archiveDocumentId}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg border border-border bg-surface px-3 py-2 hover:border-accent/40"
            >
              <span className="flex items-start gap-2 text-sm font-medium">
                <span className="line-clamp-2 flex-1">{item.title}</span>
                <ExternalLink className="mt-0.5 size-3 shrink-0" />
              </span>
              <span className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                {item.passage}
              </span>
            </a>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Add a premise or title to surface related published work.
        </p>
      )}
      <Link href={searchHref as Route} className="mt-4 inline-block text-xs font-medium text-accent hover:underline">
        Search writing memory →
      </Link>
    </section>
  );
}
