"use client";

import { Check, Pencil, Plus, Settings, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import type { TagTaxonomyItem } from "@/articles/organization";
import {
  createTaxonomyTagAction,
  deleteTaxonomyTagAction,
  renameTaxonomyTagAction,
} from "@/app/actions/article-organization";
import { Button } from "@/components/ui/button";

export function TagManager({ initialTags }: { initialTags: TagTaxonomyItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState(initialTags);
  const [search, setSearch] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const filteredTags = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("en-US");
    return query
      ? tags.filter((tag) => tag.label.toLocaleLowerCase("en-US").includes(query))
      : tags;
  }, [search, tags]);

  function applyResult(result: { ok: true; tags: TagTaxonomyItem[]; message: string } | { ok: false; message: string }) {
    setMessage(result.message);
    if (!result.ok) return;
    setTags(result.tags);
    setEditingId(null);
    setEditingLabel("");
    router.refresh();
  }

  function createTag() {
    const label = newLabel.trim();
    if (!label) return;
    startTransition(async () => {
      const result = await createTaxonomyTagAction({ label });
      applyResult(result);
      if (result.ok) setNewLabel("");
    });
  }

  function renameTag() {
    if (!editingId || !editingLabel.trim()) return;
    startTransition(async () => {
      applyResult(await renameTaxonomyTagAction({
        tagId: editingId,
        label: editingLabel.trim(),
      }));
    });
  }

  function deleteTag(tag: TagTaxonomyItem) {
    const usage = tag.usageCount === 1 ? "one article" : `${tag.usageCount} articles`;
    if (!window.confirm(`Delete “${tag.label}” from the taxonomy and ${usage}?`)) return;
    startTransition(async () => {
      applyResult(await deleteTaxonomyTagAction({ tagId: tag.id }));
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="workspace-footer-action"
        aria-label="Manage tags"
        title="Manage tags"
        onClick={() => {
          setTags(initialTags);
          setOpen(true);
        }}
      >
        <Settings />
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/25"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Manage tag taxonomy"
            className="flex h-full w-full max-w-md flex-col border-l border-border bg-surface text-foreground shadow-2xl"
          >
            <header className="flex shrink-0 items-center gap-3 border-b border-border p-5">
              <Settings className="size-5" />
              <div>
                <h2 className="font-semibold">Tag taxonomy</h2>
                <p className="text-xs text-muted-foreground">Reusable labels across every article.</p>
              </div>
              <Button className="ml-auto" variant="ghost" size="icon" aria-label="Close tag manager" onClick={() => setOpen(false)}>
                <X />
              </Button>
            </header>

            <div className="shrink-0 space-y-3 border-b border-border p-5">
              <label className="block text-xs font-medium">
                Find tags
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={`Search ${tags.length} tags`}
                  className="mt-1 h-9 w-full rounded-md border border-border bg-editor px-3 text-sm outline-none focus:border-foreground"
                />
              </label>
              <div className="flex gap-2">
                <input
                  value={newLabel}
                  maxLength={40}
                  onChange={(event) => setNewLabel(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      createTag();
                    }
                  }}
                  placeholder="Create a reusable tag"
                  aria-label="New tag name"
                  className="h-9 min-w-0 flex-1 rounded-md border border-border bg-editor px-3 text-sm outline-none focus:border-foreground"
                />
                <Button size="sm" disabled={isPending || !newLabel.trim()} onClick={createTag}>
                  <Plus /> Add
                </Button>
              </div>
              {message ? <p aria-live="polite" className="text-xs text-muted-foreground">{message}</p> : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {filteredTags.length ? (
                <ul className="space-y-1">
                  {filteredTags.map((tag) => (
                    <li key={tag.id} className="flex min-h-11 items-center gap-2 rounded-lg px-2 hover:bg-muted">
                      {editingId === tag.id ? (
                        <input
                          autoFocus
                          value={editingLabel}
                          maxLength={40}
                          aria-label={`Rename ${tag.label}`}
                          onChange={(event) => setEditingLabel(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") renameTag();
                            if (event.key === "Escape") setEditingId(null);
                          }}
                          className="h-8 min-w-0 flex-1 rounded-md border border-border bg-editor px-2 text-sm outline-none focus:border-foreground"
                        />
                      ) : (
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{tag.label}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {tag.usageCount} {tag.usageCount === 1 ? "article" : "articles"}
                          </span>
                        </div>
                      )}
                      {editingId === tag.id ? (
                        <Button variant="ghost" size="icon" disabled={isPending || !editingLabel.trim()} aria-label={`Save ${tag.label}`} onClick={renameTag}>
                          <Check />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" disabled={isPending} aria-label={`Rename ${tag.label}`} onClick={() => {
                          setEditingId(tag.id);
                          setEditingLabel(tag.label);
                          setMessage("");
                        }}>
                          <Pencil />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" disabled={isPending} aria-label={`Delete ${tag.label}`} onClick={() => deleteTag(tag)}>
                        <Trash2 />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 py-10 text-center text-sm text-muted-foreground">No matching tags.</p>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
