"use client";

import { Check, LoaderCircle, RotateCcw, ShieldCheck, Sparkles, X } from "lucide-react";

import type { ArticleReviewOutput, ReviewKind } from "@/ai/review/model";
import type { ArticleDocument } from "@/editor/document";

export type EditorSuggestionSnapshot = {
  id: string;
  aiRunId: string;
  actionId: string;
  instruction: string | null;
  sourceRevision: number;
  documentVersion: number;
  selectionFrom: number;
  selectionTo: number;
  selectionAnchor: number;
  selectionHead: number;
  originalText: string;
  suggestedText: string;
  status: "pending" | "accepted" | "rejected" | "superseded";
  createdAt: string;
  resolvedAt: string | null;
};

export type ArticleReviewSnapshot = {
  id: string;
  aiRunId: string;
  kind: ReviewKind;
  skillVersion: string;
  sourceRevision: number;
  resultJson: ArticleReviewOutput;
  createdAt: string;
};

export type AiRunSnapshot = {
  id: string;
  skillId: string;
  skillVersion: string;
  model: string;
  status: "running" | "succeeded" | "failed" | "cancelled";
  durationMs: number | null;
  errorCode: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type SuggestionAcceptance = {
  document: ArticleDocument;
  revision: number;
  savedAt: string;
};

type PrecisionAiPanelProps = {
  suggestions: EditorSuggestionSnapshot[];
  reviews: ArticleReviewSnapshot[];
  runs: AiRunSnapshot[];
  busyLabel: string | null;
  message: string;
  canRun: boolean;
  onReview: (kind: ReviewKind) => void;
  onAccept: (suggestion: EditorSuggestionSnapshot) => void;
  onReject: (suggestion: EditorSuggestionSnapshot) => void;
  onRewriteFinding: (review: ArticleReviewSnapshot, findingIndex: number) => void;
};

function actionLabel(value: string) {
  return ({
    tighten: "Tighten",
    clarify: "Clarify",
    sharpen: "Make sharper",
    rhythm: "Fix rhythm",
    alternative: "Alternative",
    custom: "Ask AI",
  } as Record<string, string>)[value] ?? value;
}

export function PrecisionAiPanel({
  suggestions,
  reviews,
  runs,
  busyLabel,
  message,
  canRun,
  onReview,
  onAccept,
  onReject,
  onRewriteFinding,
}: PrecisionAiPanelProps) {
  const pending = suggestions.filter((suggestion) => suggestion.status === "pending");
  const resolved = suggestions.filter((suggestion) => suggestion.status !== "pending");
  const latestReviews = reviews.slice(0, 4);
  return (
    <details className="shrink-0 border-b border-border bg-surface" open={pending.length > 0 || Boolean(message)}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2 text-xs font-semibold sm:px-6">
        <Sparkles className="size-3.5 text-accent" />
        Precision AI
        {pending.length > 0 ? <span className="rounded-full bg-accent-soft px-2 py-0.5 text-accent">{pending.length} pending</span> : null}
        <span className="ml-auto font-normal text-muted-foreground">Review & history</span>
      </summary>
      <div className="max-h-[42vh] overflow-y-auto border-t border-border px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={!canRun || Boolean(busyLabel)} onClick={() => onReview("humanizer")} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-40">
            Humanizer scan
          </button>
          <button type="button" disabled={!canRun || Boolean(busyLabel)} onClick={() => onReview("critic")} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-40">
            Critic review
          </button>
          {busyLabel ? <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><LoaderCircle className="size-3.5 animate-spin" />{busyLabel}</span> : null}
          {message ? <span role="status" className="text-xs text-muted-foreground">{message}</span> : null}
        </div>

        {pending.map((suggestion) => (
          <section key={suggestion.id} aria-label={`${actionLabel(suggestion.actionId)} suggestion`} className="mt-3 rounded-xl border border-border bg-editor p-3">
            <div className="flex items-center gap-2 text-xs font-semibold">
              {actionLabel(suggestion.actionId)}
              <span className="font-normal text-muted-foreground">source revision {suggestion.sourceRevision}</span>
            </div>
            {suggestion.instruction ? <p className="mt-1 text-xs text-muted-foreground">{suggestion.instruction}</p> : null}
            <div className="mt-2 grid gap-2 text-sm md:grid-cols-2">
              <div className="rounded-lg bg-red-50 p-2.5 text-red-950"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider">Original</span><del>{suggestion.originalText}</del></div>
              <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-950"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider">Suggested</span>{suggestion.suggestedText}</div>
            </div>
            <div className="mt-2 flex gap-2">
              <button type="button" disabled={Boolean(busyLabel)} onClick={() => onAccept(suggestion)} className="flex items-center gap-1 rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background disabled:opacity-40"><Check className="size-3.5" />Accept</button>
              <button type="button" disabled={Boolean(busyLabel)} onClick={() => onReject(suggestion)} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-40"><X className="size-3.5" />Reject</button>
            </div>
          </section>
        ))}

        {latestReviews.map((review) => (
          <section key={review.id} aria-label={`${review.kind} review`} className="mt-3 rounded-xl border border-border p-3">
            <div className="flex items-center gap-2 text-xs font-semibold capitalize"><ShieldCheck className="size-3.5 text-accent" />{review.kind}<span className="font-normal text-muted-foreground">{review.skillVersion} · revision {review.sourceRevision}</span></div>
            <p className="mt-2 text-sm">{review.resultJson.summary}</p>
            {review.resultJson.findings.length === 0 ? <p className="mt-2 text-xs text-muted-foreground">No actionable findings.</p> : null}
            <div className="mt-2 space-y-2">
              {review.resultJson.findings.map((finding, index) => (
                <div key={`${finding.categoryId}-${index}`} className="rounded-lg bg-muted/65 p-2.5 text-xs">
                  <div className="font-semibold">{finding.categoryId.replaceAll("-", " ")} · {finding.severity}</div>
                  {finding.quote ? <blockquote className="mt-1 border-l-2 border-border pl-2 text-muted-foreground">{finding.quote}</blockquote> : null}
                  <p className="mt-1 leading-5">{finding.explanation}</p>
                  {review.kind === "humanizer" && finding.quote ? (
                    <button type="button" disabled={Boolean(busyLabel)} onClick={() => onRewriteFinding(review, index)} className="mt-1.5 flex items-center gap-1 font-semibold text-accent disabled:opacity-40"><RotateCcw className="size-3" />Create rewrite suggestion</button>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ))}

        <details className="mt-3 text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground">Suggestion outcomes ({resolved.length})</summary>
          <div className="mt-2 space-y-1">
            {resolved.length === 0 ? <p>No resolved suggestions yet.</p> : resolved.map((suggestion) => (
              <div key={suggestion.id} className="flex gap-2 rounded-md bg-muted/50 px-2 py-1.5">
                <span>{actionLabel(suggestion.actionId)}</span><span>{suggestion.status}</span>
              </div>
            ))}
          </div>
        </details>

        <details className="mt-3 text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground">AI run history ({runs.length})</summary>
          <div className="mt-2 space-y-1">
            {runs.length === 0 ? <p>No AI runs for this article yet.</p> : runs.map((run) => (
              <div key={run.id} className="flex flex-wrap gap-x-2 rounded-md bg-muted/50 px-2 py-1.5">
                <span>{run.skillId}/{run.skillVersion}</span><span>{run.status}</span><span>{run.durationMs === null ? "—" : `${run.durationMs} ms`}</span>{run.errorCode ? <span>{run.errorCode}</span> : null}
              </div>
            ))}
          </div>
        </details>
      </div>
    </details>
  );
}
