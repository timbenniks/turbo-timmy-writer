"use client";

import { Copy, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import {
  createArticleSourceAction,
  removeArticleSourceAction,
  updateArticleSourceAction,
} from "@/app/actions/sources";
import { Button } from "@/components/ui/button";
import {
  formatSourceCitation,
  sourceTypes,
  type SourceInput,
  type SourceType,
} from "@/sources/model";

export type ArticleSourceSnapshot = {
  id: string;
  type: SourceType;
  title: string;
  url: string | null;
  text: string | null;
  notes: string | null;
  quote: string | null;
  context: string | null;
  position: number;
};

type SourceDraft = {
  type: SourceType;
  title: string;
  url: string;
  text: string;
  notes: string;
  quote: string;
  context: string;
};

const emptyDraft: SourceDraft = {
  type: "webpage",
  title: "",
  url: "",
  text: "",
  notes: "",
  quote: "",
  context: "",
};

function draftFromSource(source: ArticleSourceSnapshot): SourceDraft {
  return {
    type: source.type,
    title: source.title,
    url: source.url ?? "",
    text: source.text ?? "",
    notes: source.notes ?? "",
    quote: source.quote ?? "",
    context: source.context ?? "",
  };
}

function payloadFromDraft(draft: SourceDraft, position: number) {
  const source: SourceInput = {
    type: draft.type,
    title: draft.title,
    url: draft.url || null,
    text: draft.text || null,
    notes: draft.notes || null,
  };
  return {
    source,
    link: {
      quote: draft.quote || null,
      context: draft.context || null,
      position,
    },
  };
}

function snapshotFromPayload(id: string, payload: ReturnType<typeof payloadFromDraft>): ArticleSourceSnapshot {
  return {
    id,
    type: payload.source.type,
    title: payload.source.title,
    url: payload.source.url ?? null,
    text: payload.source.text ?? null,
    notes: payload.source.notes ?? null,
    quote: payload.link.quote ?? null,
    context: payload.link.context ?? null,
    position: payload.link.position,
  };
}

function SourceFields({ draft, setDraft }: { draft: SourceDraft; setDraft: (draft: SourceDraft) => void }) {
  function field(name: Exclude<keyof SourceDraft, "type">, value: string) {
    setDraft({ ...draft, [name]: value });
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <label>Type<select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as SourceType })} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3">
        {sourceTypes.map((type) => <option key={type} value={type}>{type.replace("-", " ")}</option>)}
      </select></label>
      <label>Title<input value={draft.title} maxLength={300} onChange={(event) => field("title", event.target.value)} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3" /></label>
      <label className="sm:col-span-2">URL (optional)<input value={draft.url} onChange={(event) => field("url", event.target.value)} placeholder="https://…" className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3" /></label>
      <label>Quote<textarea value={draft.quote} maxLength={5_000} rows={3} onChange={(event) => field("quote", event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2" /></label>
      <label>Why it matters<textarea value={draft.context} maxLength={2_000} rows={3} onChange={(event) => field("context", event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2" /></label>
      <label>Source text<textarea value={draft.text} maxLength={50_000} rows={3} onChange={(event) => field("text", event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2" /></label>
      <label>Private notes<textarea value={draft.notes} maxLength={20_000} rows={3} onChange={(event) => field("notes", event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2" /></label>
    </div>
  );
}

export function ArticleSourcesPanel({ articleId, initialSources }: { articleId: string; initialSources: ArticleSourceSnapshot[] }) {
  const [sources, setSources] = useState(initialSources);
  const [draft, setDraft] = useState<SourceDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<SourceDraft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function createSource() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    const payload = payloadFromDraft(draft, sources.length);
    const result = await createArticleSourceAction({ articleId, ...payload });
    if (result.ok) {
      setSources((current) => [...current, snapshotFromPayload(result.sourceId, payload)]);
      setDraft(emptyDraft);
      setMessage("Source added. Article prose was not changed.");
    } else setMessage(result.message);
    setBusy(false);
  }

  async function saveSource(source: ArticleSourceSnapshot) {
    if (busy) return;
    setBusy(true);
    const payload = payloadFromDraft(editDraft, source.position);
    const result = await updateArticleSourceAction({ articleId, sourceId: source.id, ...payload });
    if (result.ok) {
      setSources((current) => current.map((item) => item.id === source.id ? snapshotFromPayload(source.id, payload) : item));
      setEditingId(null);
      setMessage("Source updated. Article prose was not changed.");
    } else setMessage(result.message);
    setBusy(false);
  }

  async function unlinkSource(source: ArticleSourceSnapshot) {
    if (busy || !window.confirm(`Unlink “${source.title}” from this article?`)) return;
    setBusy(true);
    const result = await removeArticleSourceAction({ articleId, sourceId: source.id });
    if (result.ok) {
      setSources((current) => current.filter((item) => item.id !== source.id));
      setMessage("Source unlinked. The reusable source was not deleted.");
    } else setMessage(result.message);
    setBusy(false);
  }

  async function copyCitation(source: ArticleSourceSnapshot) {
    try {
      await navigator.clipboard.writeText(formatSourceCitation(source));
      setMessage("Citation copied. Paste it where you choose.");
    } catch {
      setMessage("Citation could not be copied. Check this browser's clipboard permission.");
    }
  }

  return (
    <details className="shrink-0 border-b border-border bg-sidebar px-4 py-2 text-xs sm:px-6">
      <summary className="cursor-pointer font-medium text-foreground">Sources · {sources.length}</summary>
      <div className="mt-3 space-y-3 pb-2">
        {sources.map((source) => (
          <article key={source.id} aria-label={`Source: ${source.title}`} className="rounded-lg border border-border bg-background p-3">
            {editingId === source.id ? <div className="space-y-3"><SourceFields draft={editDraft} setDraft={setEditDraft} /><div className="flex gap-2"><Button size="sm" disabled={busy || !editDraft.title.trim()} onClick={() => void saveSource(source)}>Save source</Button><Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button></div></div> : <>
              <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><p className="font-medium text-foreground">{source.title}</p><p className="mt-1 text-muted-foreground">{source.type}{source.context ? ` · ${source.context}` : ""}</p></div>
                {source.url ? <a href={source.url} target="_blank" rel="noreferrer" aria-label={`Open ${source.title}`} className="p-1 text-muted-foreground hover:text-foreground"><ExternalLink className="size-4" /></a> : null}
                <Button size="icon" variant="ghost" aria-label={`Edit ${source.title}`} onClick={() => { setEditingId(source.id); setEditDraft(draftFromSource(source)); }}><Pencil /></Button>
                <Button size="icon" variant="ghost" aria-label={`Unlink ${source.title}`} onClick={() => void unlinkSource(source)}><Trash2 /></Button>
              </div>
              {source.quote ? <blockquote className="mt-2 border-l-2 border-border pl-3 text-muted-foreground">{source.quote}</blockquote> : null}
              <Button size="sm" variant="ghost" className="mt-2" onClick={() => void copyCitation(source)}><Copy />Copy citation</Button>
            </>}
          </article>
        ))}
        <details className="rounded-lg border border-dashed border-border p-3">
          <summary className="cursor-pointer font-medium"><Plus className="mr-1 inline size-3.5" />Add source</summary>
          <div className="mt-3 space-y-3"><SourceFields draft={draft} setDraft={setDraft} /><Button size="sm" disabled={busy || !draft.title.trim()} onClick={() => void createSource()}>Add source</Button></div>
        </details>
        {message ? <p aria-live="polite" className="text-muted-foreground">{message}</p> : null}
      </div>
    </details>
  );
}
