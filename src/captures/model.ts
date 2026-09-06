import { z } from "zod";

import type { ArticleDocument } from "@/editor/document";

export const entryKinds = ["idea", "fragment", "research-note"] as const;
export const entryKindSchema = z.enum(entryKinds);

export const quickCaptureInputSchema = z.object({
  kind: entryKindSchema,
  title: z.string().trim().max(200).default(""),
  body: z.string().trim().min(1).max(20_000),
});

export type EntryKind = z.infer<typeof entryKindSchema>;
export type QuickCaptureInput = z.infer<typeof quickCaptureInputSchema>;

export const entryKindLabels: Record<EntryKind, string> = {
  idea: "Idea",
  fragment: "Fragment",
  "research-note": "Research note",
};

export function quickCaptureDocument(body: string): ArticleDocument {
  const paragraphs = body.trim().split(/\n\s*\n/u).map((paragraph) => paragraph.trim());
  return {
    type: "doc",
    content: paragraphs.map((paragraph) => ({
      type: "paragraph",
      content: [{ type: "text", text: paragraph }],
    })),
  };
}

export function quickCaptureTitle(input: QuickCaptureInput) {
  if (input.title) return input.title;
  const firstLine = input.body.split("\n", 1)[0]?.trim() ?? "";
  return firstLine.slice(0, 80) || `Untitled ${input.kind}`;
}
