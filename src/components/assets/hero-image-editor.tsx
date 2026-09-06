"use client";

import { ImageIcon, Trash2 } from "lucide-react";
import { useState } from "react";

import { updateArticleHeroImageAction } from "@/app/actions/articles";
import { externalHeroImageSchema, type ExternalHeroImage } from "@/assets/model";
import { Button } from "@/components/ui/button";

const emptyHero = { url: "", alt: "", caption: "", credit: "" };

export function HeroImageEditor({
  articleId,
  initialHeroImage,
  canSave,
  expectedRevision,
  onSaved,
}: {
  articleId: string;
  initialHeroImage: ExternalHeroImage | null;
  canSave: boolean;
  expectedRevision: () => number;
  onSaved: (result: { revision: number; savedAt: string; heroImage: ExternalHeroImage | null }) => void;
}) {
  const [hero, setHero] = useState(() => initialHeroImage ?? emptyHero);
  const [savedHero, setSavedHero] = useState(initialHeroImage);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const parsed = externalHeroImageSchema.safeParse(hero);
  const dirty = JSON.stringify(hero) !== JSON.stringify(savedHero ?? emptyHero);

  async function persist(heroImage: ExternalHeroImage | null) {
    if (!canSave || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await updateArticleHeroImageAction({
        articleId,
        expectedRevision: expectedRevision(),
        heroImage,
      });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setSavedHero(result.heroImage);
      setHero(result.heroImage ?? emptyHero);
      setMessage(result.heroImage ? "Hero image saved." : "Hero image removed.");
      onSaved(result);
    } catch {
      setMessage("The hero image could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File) {
    if (!canSave || busy) return;
    setBusy(true);
    setMessage("Uploading image…");
    const form = new FormData();
    form.set("file", file);
    try {
      const response = await fetch("/api/assets/cloudinary", { method: "POST", body: form });
      const payload = await response.json() as { upload?: { url?: string }; error?: string };
      if (!response.ok || !payload.upload?.url) {
        setMessage(payload.error ?? "The image could not be uploaded.");
        return;
      }
      setHero((current) => ({ ...current, url: payload.upload!.url! }));
      setMessage("Upload complete. Add alternative text, then save the hero image.");
    } catch {
      setMessage("The image could not be uploaded.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="shrink-0 border-b border-border bg-sidebar px-4 py-2 text-xs sm:px-6">
      <summary className="cursor-pointer font-medium text-foreground">Hero image{savedHero ? " · added" : ""}</summary>
      <div className="mt-3 grid gap-3 pb-2 lg:grid-cols-[12rem_1fr]">
        <div
          aria-label="Hero image preview"
          className="aspect-[16/9] rounded-lg border border-border bg-muted bg-cover bg-center"
          style={parsed.success ? { backgroundImage: `url(${JSON.stringify(parsed.data.url)})` } : undefined}
        >
          {!parsed.success ? <span className="grid h-full place-items-center text-muted-foreground"><ImageIcon className="size-5" /></span> : null}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="sm:col-span-2">Image URL<input value={hero.url} onChange={(event) => setHero((current) => ({ ...current, url: event.target.value }))} placeholder="https://…" className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3" /></label>
          <label className="sm:col-span-2">Alternative text<input value={hero.alt} maxLength={300} onChange={(event) => setHero((current) => ({ ...current, alt: event.target.value }))} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3" /></label>
          <label>Caption<input value={hero.caption ?? ""} maxLength={500} onChange={(event) => setHero((current) => ({ ...current, caption: event.target.value }))} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3" /></label>
          <label>Credit<input value={hero.credit ?? ""} maxLength={300} onChange={(event) => setHero((current) => ({ ...current, credit: event.target.value }))} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3" /></label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button size="sm" type="button" disabled={!canSave || busy || !dirty || !parsed.success} onClick={() => parsed.success && void persist(parsed.data)}>Save hero image</Button>
            {savedHero ? <Button size="sm" variant="ghost" type="button" disabled={!canSave || busy} onClick={() => void persist(null)}><Trash2 />Remove</Button> : null}
            <label className="inline-flex h-8 cursor-pointer items-center rounded-md border border-border bg-background px-3 font-medium hover:bg-muted">
              Upload with Cloudinary
              <input
                type="file"
                accept="image/avif,image/gif,image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={!canSave || busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void upload(file);
                  event.target.value = "";
                }}
              />
            </label>
          </div>
          {message ? <p aria-live="polite" className="sm:col-span-2 text-muted-foreground">{message}</p> : null}
        </div>
      </div>
    </details>
  );
}
