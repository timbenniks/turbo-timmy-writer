"use client";

import { Check, Plus, Search, Tag, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { updateArticleTagsInputSchema } from "@/articles/organization";
import { updateArticleTagsAction } from "@/app/actions/article-organization";
import { Button } from "@/components/ui/button";

type ArticleTagPickerProps = {
  articleId: string;
  initialTags: string[];
  availableTags: string[];
  onMessage: (message: string, isError: boolean) => void;
};

function normalized(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

export function ArticleTagPicker({
  articleId,
  initialTags,
  availableTags: initialAvailableTags,
  onMessage,
}: ArticleTagPickerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState(initialTags);
  const [availableTags, setAvailableTags] = useState(initialAvailableTags);
  const [savedTags, setSavedTags] = useState(initialTags);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedTags(savedTags);
        setQuery("");
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, savedTags]);

  const filteredTags = useMemo(() => {
    const normalizedQuery = normalized(query);
    return availableTags.filter((label) =>
      normalizedQuery ? normalized(label).includes(normalizedQuery) : true,
    );
  }, [availableTags, query]);
  const exactMatch = availableTags.some((label) => normalized(label) === normalized(query));
  const hasChanges = selectedTags.join("\0") !== savedTags.join("\0");

  function closePicker() {
    setSelectedTags(savedTags);
    setQuery("");
    setOpen(false);
  }

  function toggleTag(label: string) {
    const normalizedLabel = normalized(label);
    const isSelected = selectedTags.some((tag) => normalized(tag) === normalizedLabel);
    if (isSelected) {
      setSelectedTags((current) => current.filter((tag) => normalized(tag) !== normalizedLabel));
    } else if (selectedTags.length < 10) {
      setSelectedTags((current) => [...current, label]);
    }
  }

  function addQueryAsTag() {
    const label = query.normalize("NFKC").trim().replace(/\s+/g, " ");
    if (!label || label.length > 40 || selectedTags.length >= 10) return;
    setAvailableTags((current) => [...current, label].sort((left, right) => left.localeCompare(right)));
    setSelectedTags((current) => [...current, label]);
    setQuery("");
  }

  async function saveTags() {
    const parsed = updateArticleTagsInputSchema.safeParse({ articleId, tags: selectedTags });
    if (!parsed.success) {
      onMessage("Choose up to ten tags, each at most 40 characters.", true);
      return;
    }
    setSaving(true);
    try {
      const result = await updateArticleTagsAction(parsed.data);
      if (!result.ok) {
        onMessage(result.message, true);
        return;
      }
      setSavedTags(result.tags);
      setSelectedTags(result.tags);
      setAvailableTags((current) => [...new Set([...current, ...result.tags])].sort((left, right) => left.localeCompare(right)));
      setOpen(false);
      setQuery("");
      onMessage(result.tags.length ? "Tags saved." : "Tags cleared.", false);
      router.refresh();
    } catch {
      onMessage("The tags could not be updated.", true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Choose article tags"
        onClick={() => setOpen(true)}
        className="flex h-7 max-w-[260px] shrink-0 items-center gap-2 rounded-md border border-border bg-surface px-2.5 text-xs text-foreground hover:bg-muted"
      >
        <Tag className="size-3.5" />
        <span className="truncate">
          {selectedTags.length ? selectedTags.join(", ") : "Add tags"}
        </span>
        {selectedTags.length ? <span className="rounded-full bg-muted px-1.5 tabular-nums">{selectedTags.length}</span> : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/25 p-3" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closePicker();
        }}>
          <section role="dialog" aria-modal="true" aria-label="Choose article tags" className="flex max-h-[min(680px,calc(100dvh-1.5rem))] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-surface text-foreground shadow-2xl">
            <header className="flex shrink-0 items-center gap-3 border-b border-border p-4">
              <Tag className="size-5" />
              <div>
                <h2 className="font-semibold">Article tags</h2>
                <p className="text-xs text-muted-foreground">Choose up to ten reusable tags.</p>
              </div>
              <Button className="ml-auto" variant="ghost" size="icon" aria-label="Close tag picker" onClick={closePicker}>
                <X />
              </Button>
            </header>

            <div className="shrink-0 border-b border-border p-4">
              <label className="flex h-9 items-center gap-2 rounded-md border border-border bg-editor px-3">
                <Search className="size-4 text-muted-foreground" />
                <span className="sr-only">Search tags</span>
                <input autoFocus value={query} maxLength={40} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${availableTags.length} tags`} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
              </label>
              {query.trim() && !exactMatch ? (
                <button type="button" disabled={selectedTags.length >= 10} onClick={addQueryAsTag} className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-40">
                  <Plus className="size-4" /> Create “{query.trim()}”
                </button>
              ) : null}
            </div>

            {selectedTags.length ? (
              <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-border p-3">
                {selectedTags.map((tag) => (
                  <button key={normalized(tag)} type="button" aria-label={`Remove ${tag}`} onClick={() => toggleTag(tag)} className="flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs text-accent">
                    {tag}<X className="size-3" />
                  </button>
                ))}
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {filteredTags.length ? filteredTags.map((tag) => {
                const selected = selectedTags.some((selectedTag) => normalized(selectedTag) === normalized(tag));
                return (
                  <button key={normalized(tag)} type="button" aria-label={`${selected ? "Deselect" : "Select"} ${tag}`} onClick={() => toggleTag(tag)} className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm hover:bg-muted">
                    <span className={`grid size-5 place-items-center rounded border ${selected ? "border-accent bg-accent text-background" : "border-border"}`}>
                      {selected ? <Check className="size-3.5" /> : null}
                    </span>
                    <span className="truncate">{tag}</span>
                  </button>
                );
              }) : <p className="px-3 py-10 text-center text-sm text-muted-foreground">No matching tags.</p>}
            </div>

            <footer className="flex shrink-0 items-center border-t border-border p-4">
              <span className="text-xs text-muted-foreground">{selectedTags.length}/10 selected</span>
              <Button className="ml-auto" size="sm" disabled={saving || !hasChanges} onClick={() => void saveTags()}>
                {saving ? "Saving…" : "Save tags"}
              </Button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
