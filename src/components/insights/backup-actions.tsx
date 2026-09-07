"use client";

import { Download, ExternalLink, GitBranch, LoaderCircle } from "lucide-react";
import { useState } from "react";

import { deliverWritingBackupToGitHubAction } from "@/app/actions/writing-backup";

export function BackupActions({ githubTarget }: { githubTarget: string | null }) {
  const [busy, setBusy] = useState<"download" | "github" | null>(null);
  const [message, setMessage] = useState("");
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  async function download() {
    if (busy) return;
    setBusy("download");
    setMessage("");
    setResultUrl(null);
    try {
      const response = await fetch("/api/export/writing", { method: "POST" });
      if (!response.ok) {
        setMessage(response.status === 401
          ? "Your session has expired."
          : "The writing backup could not be downloaded.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filenameFromDisposition(response.headers.get("content-disposition"));
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setMessage("The writing backup could not be downloaded.");
    } finally {
      setBusy(null);
    }
  }

  async function deliver() {
    if (!githubTarget || busy) return;
    if (!window.confirm(
      `Commit the complete writing backup to ${githubTarget}? This destination should be private.`,
    )) return;
    setBusy("github");
    setMessage("");
    setResultUrl(null);
    try {
      const result = await deliverWritingBackupToGitHubAction({ confirmed: true });
      setMessage(result.message);
      if (result.ok) setResultUrl(result.url);
    } catch {
      setMessage("The writing backup could not be delivered.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => void download()}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy === "download" ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />}
        {busy === "download" ? "Downloading…" : "Download writing backup"}
      </button>
      <button
        type="button"
        disabled={!githubTarget || busy !== null}
        title={githubTarget ? `Configured for ${githubTarget}` : "Configure a private GitHub backup target first"}
        onClick={() => void deliver()}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy === "github" ? <LoaderCircle className="size-4 animate-spin" /> : <GitBranch className="size-4" />}
        {busy === "github" ? "Backing up…" : "Back up to GitHub"}
      </button>
      {message ? <p aria-live="polite" className="basis-full text-xs text-muted-foreground">
        {message}{resultUrl ? <> <a href={resultUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">View commit <ExternalLink className="size-3" /></a></> : null}
      </p> : null}
    </div>
  );
}

function filenameFromDisposition(header: string | null) {
  const filename = header?.match(/filename="([^"]+)"/)?.[1];
  return filename && filename.endsWith(".json") ? filename : "turbo-timmy-writer.json";
}
