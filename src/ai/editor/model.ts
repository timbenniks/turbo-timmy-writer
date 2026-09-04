import { z } from "zod";

import { ARTICLE_DOCUMENT_VERSION } from "@/editor/document";
import { MAX_AI_SELECTION_CHARACTERS } from "@/editor/selection";

export const editorSuggestionStatuses = [
  "pending",
  "accepted",
  "rejected",
  "superseded",
] as const;

export const editorActionIds = [
  "tighten",
  "clarify",
  "sharpen",
  "rhythm",
  "alternative",
  "custom",
] as const;

export const editorSuggestionRequestSchema = z.object({
  actionId: z.enum(editorActionIds),
  instruction: z.string().trim().min(1).max(500).nullable(),
  selection: z.object({
    documentVersion: z.literal(ARTICLE_DOCUMENT_VERSION),
    sourceRevision: z.number().int().positive(),
    originalText: z.string().min(1).max(MAX_AI_SELECTION_CHARACTERS),
    bookmark: z.object({
      from: z.number().int().positive(),
      to: z.number().int().positive(),
      anchor: z.number().int().positive(),
      head: z.number().int().positive(),
    }),
  }),
}).superRefine((value, context) => {
  if (value.actionId === "custom" && !value.instruction) {
    context.addIssue({
      code: "custom",
      path: ["instruction"],
      message: "A custom instruction is required.",
    });
  }
  if (value.selection.bookmark.from >= value.selection.bookmark.to) {
    context.addIssue({
      code: "custom",
      path: ["selection", "bookmark"],
      message: "The selection range is invalid.",
    });
  }
});

export const editorSuggestionOutputSchema = z.object({
  suggestedText: z.string().trim().min(1).max(12_000),
});

export type EditorSuggestionRequest = z.infer<
  typeof editorSuggestionRequestSchema
>;
