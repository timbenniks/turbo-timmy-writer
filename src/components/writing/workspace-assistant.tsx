"use client";

import { useEffect, useState } from "react";
import { MessageSquareText, Sparkles, X } from "lucide-react";

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
}: {
  articleId?: string;
  articleStart?: {
    status: "active" | "completed" | "cancelled";
    messages: InterviewMessage[];
  } | null;
  brief?: ArticleBriefSnapshot | null;
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
      {articleId && articleStart && (
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
        {articleId && articleStart ? (
          <InterviewAssistant
            articleId={articleId}
            initialMessages={articleStart.messages}
            initialBrief={brief ?? undefined}
            initialStatus={articleStart.status}
          />
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
