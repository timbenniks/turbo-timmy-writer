"use client";

import { Check, Clipboard, ExternalLink, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { savePublicationVariantAction } from "@/app/actions/publication-variants";
import { Button } from "@/components/ui/button";
import {
  variantPayloadSchema,
  type VariantContent,
  type VariantDestination,
  type VariantMetadata,
  type VariantStatus,
} from "@/variants/model";

const destinationLabels: Record<VariantDestination, string> = {
  website: "Website",
  "linkedin-post": "LinkedIn post",
  "linkedin-article": "LinkedIn article",
  newsletter: "Newsletter",
};

const destinations = Object.keys(destinationLabels) as VariantDestination[];

export type VariantWorkspaceSnapshot = {
  id: string;
  destination: VariantDestination;
  contentJson: VariantContent;
  metadataJson: VariantMetadata;
  sourceArticleRevision: number;
  revision: number;
  hasManualEdits: boolean;
  status: VariantStatus;
  publishedAt: string | null;
  updatedAt: string;
  freshness: {
    stale: boolean;
    revisionChanged: boolean;
    contentChanged: boolean;
  };
};

type VariantForm = {
  bodyMarkdown: string;
  title: string;
  slug: string;
  description: string;
  canonicalUrl: string;
  publicationUrl: string;
  subject: string;
  previewText: string;
  intro: string;
  callToAction: string;
  status: VariantStatus;
};

function formFromVariant(variant: VariantWorkspaceSnapshot): VariantForm {
  const content = variant.contentJson;
  const metadata = variant.metadataJson;
  return {
    bodyMarkdown: content.bodyMarkdown,
    title: "title" in metadata ? metadata.title : "",
    slug: "slug" in metadata ? metadata.slug : "",
    description: "description" in metadata ? metadata.description : "",
    canonicalUrl: "canonicalUrl" in metadata ? metadata.canonicalUrl ?? "" : "",
    publicationUrl: "publicationUrl" in metadata ? metadata.publicationUrl ?? "" : "",
    subject: "subject" in metadata ? metadata.subject : "",
    previewText: "previewText" in metadata ? metadata.previewText : "",
    intro: "intro" in content ? content.intro ?? "" : "",
    callToAction: "callToAction" in content ? content.callToAction ?? "" : "",
    status: variant.status,
  };
}

function payloadFromForm(destination: VariantDestination, form: VariantForm) {
  const base = { version: 1 as const, destination, bodyMarkdown: form.bodyMarkdown };
  const payload = destination === "website"
    ? {
        content: base,
        metadata: {
          version: 1 as const,
          destination,
          title: form.title,
          slug: form.slug,
          description: form.description,
          canonicalUrl: form.canonicalUrl || null,
        },
      }
    : destination === "linkedin-post"
      ? {
          content: base,
          metadata: {
            version: 1 as const,
            destination,
            publicationUrl: form.publicationUrl || null,
          },
        }
      : destination === "linkedin-article"
        ? {
            content: base,
            metadata: {
              version: 1 as const,
              destination,
              title: form.title,
              publicationUrl: form.publicationUrl || null,
            },
          }
        : {
            content: {
              ...base,
              intro: form.intro || null,
              callToAction: form.callToAction || null,
            },
            metadata: {
              version: 1 as const,
              destination,
              subject: form.subject,
              previewText: form.previewText,
            },
          };
  return variantPayloadSchema.parse(payload);
}

export function VariantsWorkspace({
  articleId,
  articleTitle,
  articleRevision,
  variants,
}: {
  articleId: string;
  articleTitle: string;
  articleRevision: number;
  variants: VariantWorkspaceSnapshot[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<VariantDestination>(variants[0]?.destination ?? "website");
  const [busy, setBusy] = useState<VariantDestination | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const current = useMemo(
    () => variants.find(({ destination }) => destination === selected) ?? null,
    [selected, variants],
  );

  async function generate(variant: VariantWorkspaceSnapshot | null) {
    let confirmed = false;
    if (variant?.hasManualEdits) {
      confirmed = window.confirm(
        "Regeneration will snapshot this edited variant, then replace the current copy. Continue?",
      );
      if (!confirmed) return;
    }
    setBusy(selected);
    setMessage(variant ? "Creating a protected snapshot and regenerating…" : "Creating variant…");
    try {
      const response = await fetch(`/api/articles/${articleId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: selected,
          expectedArticleRevision: articleRevision,
          variantId: variant?.id ?? null,
          expectedVariantRevision: variant?.revision ?? null,
          confirmManualEdits: confirmed,
        }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) {
        setMessage(payload.error ?? "The variant could not be generated.");
        return;
      }
      setMessage(variant ? "Variant regenerated. Its previous copy is in history." : "Variant created.");
      router.refresh();
    } catch {
      setMessage("The variant could not be generated. Nothing was replaced.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-border px-5 py-4 sm:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href={`/articles/${articleId}` as Route}>← Article</Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate font-serif text-xl">Variants for {articleTitle || "Untitled article"}</h1>
            <p className="text-xs text-muted-foreground">Canonical revision {articleRevision}. Variants never edit the article.</p>
          </div>
        </div>
      </header>

      <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-surface px-4 py-2 sm:px-8" aria-label="Variant destinations">
        {destinations.map((destination) => {
          const variant = variants.find((item) => item.destination === destination);
          return (
            <button
              key={destination}
              type="button"
              onClick={() => { setSelected(destination); setMessage(null); }}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm ${selected === destination ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted"}`}
            >
              {destinationLabels[destination]}
              {variant?.freshness.stale ? <span className="size-2 rounded-full bg-amber-500" aria-label="Stale" /> : null}
              {variant && !variant.freshness.stale ? <Check className="size-3 text-emerald-600" /> : null}
            </button>
          );
        })}
      </nav>

      {message ? <p aria-live="polite" className="shrink-0 border-b border-border bg-sidebar px-5 py-2 text-sm sm:px-8">{message}</p> : null}

      <main className="min-h-0 flex-1 overflow-y-auto px-5 py-7 sm:px-8">
        {current ? (
          <VariantEditor
            key={`${current.id}:${current.revision}`}
            articleId={articleId}
            variant={current}
            busy={busy === selected}
            onRegenerate={() => void generate(current)}
            onMessage={setMessage}
          />
        ) : (
          <section className="mx-auto max-w-2xl rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
            <Sparkles className="mx-auto size-6 text-accent" />
            <h2 className="mt-4 font-serif text-2xl">Create a {destinationLabels[selected]}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              AI will adapt the saved canonical article using only this destination&apos;s rules. You can edit the result independently.
            </p>
            <Button className="mt-6" disabled={busy === selected} onClick={() => void generate(null)}>
              {busy === selected ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
              {busy === selected ? "Creating…" : "Create variant"}
            </Button>
          </section>
        )}
      </main>
    </div>
  );
}

function VariantEditor({
  articleId,
  variant,
  busy,
  onRegenerate,
  onMessage,
}: {
  articleId: string;
  variant: VariantWorkspaceSnapshot;
  busy: boolean;
  onRegenerate: () => void;
  onMessage: (message: string) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState(() => formFromVariant(variant));
  const [saving, setSaving] = useState(false);
  const [kept, setKept] = useState(false);

  function update<K extends keyof VariantForm>(key: K, value: VariantForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const payload = payloadFromForm(variant.destination, form);
      const result = await savePublicationVariantAction({
        articleId,
        variantId: variant.id,
        expectedRevision: variant.revision,
        payload,
        status: form.status,
      });
      onMessage(result.ok ? "Variant saved without changing the canonical article." : result.message);
      if (result.ok) router.refresh();
    } catch {
      onMessage("Check the destination fields and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(form.bodyMarkdown);
      onMessage("Variant body copied to the clipboard.");
    } catch {
      onMessage("Clipboard access was unavailable. Select and copy the body manually.");
    }
  }

  return (
    <section className="mx-auto max-w-4xl space-y-5">
      {variant.freshness.stale && !kept ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-medium">The canonical article changed after this variant was created.</p>
          <p className="mt-1 text-xs leading-5">Your variant was not overwritten. Review the article, regenerate from revision {variant.sourceArticleRevision}, or keep this copy.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline"><Link href={`/articles/${articleId}` as Route}>Review article</Link></Button>
            <Button size="sm" onClick={onRegenerate} disabled={busy}><RefreshCw />Regenerate</Button>
            <Button size="sm" variant="ghost" onClick={() => setKept(true)}>Keep current</Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div>
          <h2 className="font-serif text-2xl">{destinationLabels[variant.destination]}</h2>
          <p className="text-xs text-muted-foreground">
            Variant revision {variant.revision} · source article revision {variant.sourceArticleRevision}
            {variant.hasManualEdits ? " · manually edited" : ""}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void copy()}><Clipboard />Copy body</Button>
          <Button variant="outline" size="sm" onClick={onRegenerate} disabled={busy || saving}>
            {busy ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
            Regenerate
          </Button>
          <Button size="sm" onClick={() => void save()} disabled={saving || busy}>
            {saving ? <LoaderCircle className="animate-spin" /> : null}
            {saving ? "Saving…" : "Save variant"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2">
        {variant.destination === "website" ? (
          <>
            <Field label="Title" value={form.title} maxLength={200} onChange={(value) => update("title", value)} />
            <Field label="Slug" value={form.slug} maxLength={200} onChange={(value) => update("slug", value)} />
            <Field label="Description" value={form.description} maxLength={320} onChange={(value) => update("description", value)} />
            <Field label="Canonical URL" value={form.canonicalUrl} inputMode="url" onChange={(value) => update("canonicalUrl", value)} />
          </>
        ) : null}
        {variant.destination === "linkedin-article" ? (
          <Field label="Title" value={form.title} maxLength={200} onChange={(value) => update("title", value)} />
        ) : null}
        {variant.destination === "newsletter" ? (
          <>
            <Field label="Subject" value={form.subject} maxLength={200} onChange={(value) => update("subject", value)} />
            <Field label="Preview text" value={form.previewText} maxLength={300} onChange={(value) => update("previewText", value)} />
            <Field label="Optional intro" value={form.intro} maxLength={2_000} onChange={(value) => update("intro", value)} />
            <Field label="Optional call to action" value={form.callToAction} maxLength={1_000} onChange={(value) => update("callToAction", value)} />
          </>
        ) : null}
        {(variant.destination === "linkedin-post" || variant.destination === "linkedin-article") ? (
          <Field label="Published URL (optional)" value={form.publicationUrl} inputMode="url" onChange={(value) => update("publicationUrl", value)} />
        ) : null}
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Publication state</span>
          <select className="h-10 rounded-lg border border-border bg-background px-3" value={form.status} onChange={(event) => update("status", event.target.value as VariantStatus)}>
            <option value="draft">Draft</option>
            <option value="ready">Ready</option>
            <option value="published">Published manually</option>
          </select>
        </label>
        {form.publicationUrl ? (
          <a href={form.publicationUrl} target="_blank" rel="noreferrer" className="self-end text-sm text-accent hover:underline">
            Open published variant <ExternalLink className="ml-1 inline size-3" />
          </a>
        ) : null}
      </div>

      <label className="grid gap-2 text-sm">
        <span className="font-medium">Editable Markdown body</span>
        <textarea
          value={form.bodyMarkdown}
          maxLength={variant.destination === "linkedin-post" ? 3_000 : 150_000}
          onChange={(event) => update("bodyMarkdown", event.target.value)}
          className="min-h-[420px] resize-y rounded-xl border border-border bg-surface p-5 font-mono text-sm leading-6 outline-none focus:border-foreground"
        />
        <span className="text-right text-xs tabular-nums text-muted-foreground">
          {form.bodyMarkdown.length.toLocaleString()} characters
        </span>
      </label>

      <section className="rounded-xl border border-border bg-background p-5" aria-label="Formatting preview">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Formatting preview</p>
        {variant.destination === "newsletter" ? (
          <div className="mt-4 border-b border-border pb-4">
            <p className="font-semibold">{form.subject || "Newsletter subject"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{form.previewText || "Preview text"}</p>
          </div>
        ) : null}
        {(variant.destination === "website" || variant.destination === "linkedin-article") ? (
          <h3 className="mt-4 font-serif text-2xl">{form.title || "Untitled variant"}</h3>
        ) : null}
        {form.intro ? <p className="mt-4 whitespace-pre-wrap text-sm italic leading-6">{form.intro}</p> : null}
        <div className="mt-4 whitespace-pre-wrap text-sm leading-7">{form.bodyMarkdown || "The variant body will appear here."}</div>
        {form.callToAction ? <p className="mt-5 font-medium">{form.callToAction}</p> : null}
      </section>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  maxLength,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  inputMode?: "url";
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        value={value}
        maxLength={maxLength}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-lg border border-border bg-background px-3 outline-none focus:border-foreground"
      />
    </label>
  );
}
