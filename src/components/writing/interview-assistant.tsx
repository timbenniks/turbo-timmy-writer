"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ArticleBriefEditor,
  type ArticleBriefSnapshot,
} from "@/components/writing/article-brief-editor";

export type InterviewMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; message: InterviewMessage }
  | { type: "brief"; brief: ArticleBriefSnapshot }
  | { type: "brief-error"; error: string }
  | { type: "error"; error: string };

type DraftStreamEvent =
  | { type: "delta"; text: string }
  | {
      type: "done";
      title: string;
      document: unknown;
      revision: number;
      savedAt: string;
    }
  | { type: "error"; error: string };

export function InterviewAssistant({
  articleId,
  initialMessages,
  initialBrief,
  initialStatus,
}: {
  articleId: string;
  initialMessages: InterviewMessage[];
  initialBrief?: ArticleBriefSnapshot;
  initialStatus: "active" | "completed" | "cancelled";
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [answer, setAnswer] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [activeTab, setActiveTab] = useState<"conversation" | "brief">("conversation");
  const [brief, setBrief] = useState(initialBrief);
  const [briefNotice, setBriefNotice] = useState<string>();
  const [draftPending, setDraftPending] = useState(false);
  const [draftComplete, setDraftComplete] = useState(initialStatus === "completed");
  const initialRequestStarted = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const askAssistant = useCallback(
    async (nextAnswer?: string) => {
      setPending(true);
      setError(undefined);
      setStreamingText("");
      try {
        const response = await fetch(`/api/articles/${articleId}/interview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nextAnswer ? { answer: nextAnswer } : {}),
        });
        if (!response.ok || !response.body) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(payload?.error ?? "The assistant could not respond.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";
        while (true) {
          const { done, value } = await reader.read();
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line) continue;
            const event = JSON.parse(line) as StreamEvent;
            if (event.type === "delta") {
              accumulated += event.text;
              setStreamingText(accumulated);
            } else if (event.type === "done") {
              setMessages((current) => [...current, event.message]);
              setStreamingText("");
            } else if (event.type === "brief") {
              setBrief(event.brief);
              setBriefNotice("Brief updated from this answer.");
            } else if (event.type === "brief-error") {
              setBriefNotice(event.error);
            } else {
              throw new Error(event.error);
            }
          }
          if (done) break;
        }
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "The assistant could not respond.",
        );
      } finally {
        setPending(false);
      }
    },
    [articleId],
  );

  useEffect(() => {
    if (
      !initialRequestStarted.current &&
      messages.length === 1 &&
      messages[0]?.role === "user"
    ) {
      initialRequestStarted.current = true;
      void askAssistant();
    }
  }, [askAssistant, messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, streamingText]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = answer.trim();
    if (!text || pending) return;
    setMessages((current) => [
      ...current,
      { id: `optimistic-${Date.now()}`, role: "user", text },
    ]);
    setAnswer("");
    void askAssistant(text);
  }

  async function generateDraft() {
    if (pending || draftPending || draftComplete) return;
    const canStart = window.dispatchEvent(
      new CustomEvent("turbo-timmy:draft-start", { cancelable: true }),
    );
    if (!canStart) {
      setError("Save or clear editor changes before generating the first draft.");
      return;
    }

    setActiveTab("conversation");
    setDraftPending(true);
    setError(undefined);
    let markdown = "";
    try {
      const response = await fetch(`/api/articles/${articleId}/draft`, {
        method: "POST",
      });
      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "The draft could not be generated.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line) continue;
          const event = JSON.parse(line) as DraftStreamEvent;
          if (event.type === "delta") {
            markdown += event.text;
            window.dispatchEvent(
              new CustomEvent("turbo-timmy:draft-preview", {
                detail: { markdown },
              }),
            );
          } else if (event.type === "done") {
            window.dispatchEvent(
              new CustomEvent("turbo-timmy:draft-complete", {
                detail: event,
              }),
            );
            setDraftComplete(true);
            setBriefNotice("Initial AI draft saved. The conversation and brief remain here.");
          } else {
            throw new Error(event.error);
          }
        }
        if (done) break;
      }
    } catch (caught) {
      window.dispatchEvent(new CustomEvent("turbo-timmy:draft-error"));
      setError(
        caught instanceof Error ? caught.message : "The draft could not be generated.",
      );
    } finally {
      setDraftPending(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 border-b border-border px-4" role="tablist" aria-label="Assistant workspace">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "conversation"}
          onClick={() => setActiveTab("conversation")}
          className={`border-b-2 px-2 py-2.5 text-xs font-medium ${
            activeTab === "conversation"
              ? "border-accent text-foreground"
              : "border-transparent text-muted-foreground"
          }`}
        >
          Conversation
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "brief"}
          onClick={() => setActiveTab("brief")}
          className={`border-b-2 px-2 py-2.5 text-xs font-medium ${
            activeTab === "brief"
              ? "border-accent text-foreground"
              : "border-transparent text-muted-foreground"
          }`}
        >
          Brief{brief ? ` · ${brief.revision}` : ""}
        </button>
        <Button
          className="ml-auto self-center"
          size="sm"
          onClick={() => void generateDraft()}
          disabled={pending || draftPending || draftComplete || !brief}
        >
          {draftPending ? "Drafting…" : draftComplete ? "Draft saved" : "Draft article"}
        </Button>
      </div>
      {activeTab === "conversation" ? (
        <>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-6">
            {messages.map((message, index) => (
              <article
                key={message.id}
                className={message.role === "user" ? "ml-6" : "mr-4"}
              >
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {message.role === "user" ? (index === 0 ? "Premise" : "You") : "Assistant"}
                </p>
                <p
                  className={`whitespace-pre-wrap text-sm leading-6 ${
                    message.role === "user"
                      ? "rounded-xl bg-muted px-3 py-2.5"
                      : "text-foreground"
                  }`}
                >
                  {message.text}
                </p>
              </article>
            ))}
            {pending && (
              <article className="mr-4" aria-live="polite">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
                  Assistant
                </p>
                <p className="whitespace-pre-wrap text-sm leading-6">
                  {streamingText || "Thinking…"}
                </p>
              </article>
            )}
            {draftPending && (
              <p className="rounded-lg bg-accent-soft px-3 py-2 text-xs leading-5 text-accent" role="status">
                Drafting into the editor…
              </p>
            )}
            {briefNotice && (
              <p className="rounded-lg bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground" role="status">
                {briefNotice}
              </p>
            )}
            {error && (
              <div className="rounded-xl border border-border bg-surface p-3 text-sm leading-5">
                <p role="alert">{error}</p>
                <Button
                  className="mt-2"
                  size="sm"
                  variant="ghost"
                  onClick={() => void askAssistant()}
                >
                  <RotateCcw /> Try again
                </Button>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          {!draftComplete && (
          <form onSubmit={submit} className="shrink-0 border-t border-border p-4">
            <label htmlFor="interview-answer" className="sr-only">
              Your response
            </label>
            <div className="flex items-end gap-2 rounded-xl border border-border bg-surface p-2 focus-within:ring-2 focus-within:ring-ring">
              <textarea
                id="interview-answer"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={2}
                maxLength={10_000}
                disabled={pending}
                placeholder="Answer, or say “Enough. Draft it.”"
                className="min-h-12 flex-1 resize-none bg-transparent px-1 py-1.5 text-sm leading-5 outline-none placeholder:text-muted-foreground"
              />
              <Button size="icon" type="submit" disabled={pending || !answer.trim()} aria-label="Send response">
                <ArrowUp />
              </Button>
            </div>
          </form>
          )}
        </>
      ) : brief ? (
        <div className="flex min-h-0 flex-1 flex-col">
          {briefNotice && (
            <p className="mx-4 mt-4 rounded-lg bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground" role="status">
              {briefNotice}
            </p>
          )}
          <ArticleBriefEditor
            key={brief.revision}
            articleId={articleId}
            snapshot={brief}
            onSaved={(saved) => {
              setBrief(saved);
              setBriefNotice("Manual brief revision saved.");
            }}
          />
        </div>
      ) : (
        <p className="px-5 py-8 text-sm leading-6 text-muted-foreground">
          The working brief will appear after the premise is saved.
        </p>
      )}
    </div>
  );
}
