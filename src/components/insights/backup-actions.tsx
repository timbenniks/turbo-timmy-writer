"use client";

import { Download, ExternalLink, GitBranch, LoaderCircle } from "lucide-react";
import { useState } from "react";

import { deliverWritingBackupToGitHubAction } from "@/app/actions/writing-backup";

export function BackupActions({ githubTarget }: { githubTarget: string | null }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  async function deliver() {
    if (!githubTarget || busy) return;
    if (!window.confirm(
      `Commit the complete writing backup to ${githubTarget}? This destination should be private.`,
    )) return;
    setBusy(true);
    setMessage("");
    setResultUrl(null);
    try {
      const result = await deliverWritingBackupToGitHubAction({ confirmed: true });
      setMessage(result.message);
      if (result.ok) setResultUrl(result.url);
    } catch {
      setMessage("The writing backup could not be delivered.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <a href="/api/export/writing" download className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted">
        <Download className="size-4" />
        Download writing backup
      </a>
      <button
        type="button"
        disabled={!githubTarget || busy}
        title={githubTarget ? `Configured for ${githubTarget}` : "Configure a private GitHub backup target first"}
        onClick={() => void deliver()}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : <GitBranch className="size-4" />}
        {busy ? "Backing up…" : "Back up to GitHub"}
      </button>
      {message ? <p aria-live="polite" className="basis-full text-xs text-muted-foreground">
        {message}{resultUrl ? <> <a href={resultUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">View commit <ExternalLink className="size-3" /></a></> : null}
      </p> : null}
    </div>
  );
}
