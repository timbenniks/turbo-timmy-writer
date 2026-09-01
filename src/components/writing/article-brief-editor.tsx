"use client";

import { useState, useTransition } from "react";

import type { ArticleBrief } from "@/ai/brief/model";
import { saveArticleBriefAction } from "@/app/actions/briefs";
import { Button } from "@/components/ui/button";

export type ArticleBriefSnapshot = {
  revision: number;
  brief: ArticleBrief;
  source: "user" | "ai" | "system";
  savedAt: string;
};

const listFields = [
  ["audience", "Audience"],
  ["supportingPoints", "Supporting points"],
  ["evidence", "Evidence"],
  ["examples", "Examples"],
  ["personalExperience", "Personal experience"],
  ["counterArguments", "Counterarguments"],
  ["uncertainties", "Uncertainties"],
  ["possibleAngles", "Possible angles"],
  ["thingsToAvoid", "Things to avoid"],
] as const;

function lines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ArticleBriefEditor({
  articleId,
  snapshot,
  onSaved,
}: {
  articleId: string;
  snapshot: ArticleBriefSnapshot;
  onSaved?(snapshot: ArticleBriefSnapshot): void;
}) {
  const [draft, setDraft] = useState(snapshot.brief);
  const [revision, setRevision] = useState(snapshot.revision);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();

  function update(next: ArticleBrief) {
    setDraft(next);
    setDirty(true);
    setMessage(undefined);
  }

  function save() {
    startTransition(async () => {
      const result = await saveArticleBriefAction({
        articleId,
        expectedRevision: revision,
        brief: draft,
      });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setRevision(result.revision);
      setDirty(false);
      setMessage("Manual revision saved.");
      onSaved?.({
        revision: result.revision,
        brief: draft,
        source: "user",
        savedAt: result.savedAt,
      });
    });
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Revision {revision} · {snapshot.source === "ai" ? "conversation" : snapshot.source}
        </p>
        <Button size="sm" onClick={save} disabled={!dirty || pending}>
          {pending ? "Saving…" : "Save brief"}
        </Button>
      </div>
      {message && (
        <p className="mt-3 text-xs leading-5 text-muted-foreground" role="status">
          {message}
        </p>
      )}

      <div className="mt-5 space-y-5">
        <BriefTextArea
          label="Premise"
          value={draft.premise}
          onChange={(value) => update({ ...draft, premise: value })}
          rows={4}
        />
        <BriefTextArea
          label="Thesis"
          value={draft.thesis ?? ""}
          onChange={(value) => update({ ...draft, thesis: value.trim() ? value : null })}
        />
        <BriefTextArea
          label="Desired takeaway"
          value={draft.desiredTakeaway ?? ""}
          onChange={(value) =>
            update({ ...draft, desiredTakeaway: value.trim() ? value : null })
          }
        />
        {listFields.map(([field, label]) => (
          <BriefTextArea
            key={field}
            label={label}
            hint="One item per line"
            value={draft[field].join("\n")}
            onChange={(value) => update({ ...draft, [field]: lines(value) })}
          />
        ))}
      </div>
    </div>
  );
}

function BriefTextArea({
  label,
  value,
  onChange,
  hint,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  hint?: string;
  rows?: number;
}) {
  return (
    <label className="block text-xs font-medium">
      <span>{label}</span>
      {hint && <span className="ml-2 font-normal text-muted-foreground">{hint}</span>}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        maxLength={6_000}
        className="mt-2 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm leading-5 outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}
