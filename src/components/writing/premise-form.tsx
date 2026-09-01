"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";

import {
  createGuidedArticleAction,
  type CreateGuidedArticleState,
} from "@/app/actions/articles";
import { Button } from "@/components/ui/button";

const initialState: CreateGuidedArticleState = {};

export function PremiseForm() {
  const [state, action, pending] = useActionState(
    createGuidedArticleAction,
    initialState,
  );

  return (
    <form action={action} className="mt-8">
      <label htmlFor="premise" className="text-sm font-medium">
        What are you thinking about?
      </label>
      <textarea
        id="premise"
        name="premise"
        required
        maxLength={6000}
        autoFocus
        placeholder="There is an argument, experience, or tension I want to explore…"
        className="mt-3 min-h-48 w-full resize-y rounded-xl border border-border bg-editor px-4 py-3 text-base leading-7 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft"
        aria-describedby={state.error ? "premise-error" : "premise-help"}
      />
      {state.error ? (
        <p id="premise-error" role="alert" className="mt-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : (
        <p id="premise-help" className="mt-2 text-sm text-muted-foreground">
          This is saved immediately. It can be rough; the interview will help find the article.
        </p>
      )}
      <div className="mt-6 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Start conversation"}
          {!pending && <ArrowRight />}
        </Button>
      </div>
    </form>
  );
}
