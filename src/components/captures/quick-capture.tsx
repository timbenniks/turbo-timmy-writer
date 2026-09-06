"use client";

import { useActionState, useEffect, useRef } from "react";

import { createQuickCaptureAction } from "@/app/actions/captures";
import { Button } from "@/components/ui/button";

export function QuickCapture() {
  const [state, action, pending] = useActionState(createQuickCaptureAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.createdId) formRef.current?.reset();
  }, [state.createdId]);

  return (
    <details className="rounded-xl border border-border bg-card p-4">
      <summary className="cursor-pointer text-sm font-medium">Quick capture</summary>
      <form ref={formRef} action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-muted-foreground">
          Kind
          <select name="kind" defaultValue="idea" className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground">
            <option value="idea">Idea</option>
            <option value="fragment">Fragment</option>
            <option value="research-note">Research note</option>
          </select>
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Title (optional)
          <input name="title" maxLength={200} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground" />
        </label>
        <label className="text-xs font-medium text-muted-foreground sm:col-span-2">
          Capture
          <textarea name="body" required maxLength={20_000} rows={4} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
        </label>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Save to ideas"}</Button>
          {state.error ? <p className="text-xs text-destructive" role="alert">{state.error}</p> : null}
          {state.createdId ? <p className="text-xs text-muted-foreground" aria-live="polite">Captured as a canonical idea.</p> : null}
        </div>
      </form>
    </details>
  );
}
