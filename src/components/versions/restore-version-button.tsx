"use client";

import { RotateCcw } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { restoreArticleVersionAction } from "@/app/actions/article-versions";

export function RestoreVersionButton({
  articleId,
  versionId,
  expectedRevision,
  versionName,
}: {
  articleId: string;
  versionId: string;
  expectedRevision: number;
  versionName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function restore() {
    if (busy) return;
    const confirmed = window.confirm(
      `Restore “${versionName}”? The current document will be checkpointed first.`,
    );
    if (!confirmed) return;

    setBusy(true);
    setMessage(null);
    try {
      const result = await restoreArticleVersionAction({
        articleId,
        versionId,
        expectedRevision,
      });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      router.push(`/articles/${articleId}` as Route);
      router.refresh();
    } catch {
      setMessage("The version could not be restored.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        disabled={busy}
        onClick={() => void restore()}
        className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
      >
        <RotateCcw className="size-3.5" />
        {busy ? "Restoring…" : "Restore this version"}
      </button>
      {message ? <p role="alert" className="mt-2 text-xs text-amber-800">{message}</p> : null}
    </div>
  );
}
