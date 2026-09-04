import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { TextSelection, type Selection } from "@tiptap/pm/state";

import { ARTICLE_DOCUMENT_VERSION } from "@/editor/document";

export const MAX_AI_SELECTION_CHARACTERS = 8_000;

export const editorSelectionActions = [
  { id: "tighten", label: "Tighten" },
  { id: "clarify", label: "Clarify" },
  { id: "sharpen", label: "Make sharper" },
  { id: "rhythm", label: "Fix rhythm" },
  { id: "alternative", label: "Alternative" },
] as const;

export type EditorSelectionActionId =
  (typeof editorSelectionActions)[number]["id"];

export type ArticleSelectionBookmark = {
  from: number;
  to: number;
  anchor: number;
  head: number;
};

export type ArticleSelectionSnapshot = {
  documentVersion: typeof ARTICLE_DOCUMENT_VERSION;
  sourceRevision: number;
  originalText: string;
  bookmark: ArticleSelectionBookmark;
};

export type ArticleSelectionResult =
  | { ok: true; selection: ArticleSelectionSnapshot }
  | {
      ok: false;
      reason: "empty" | "not-text" | "too-long";
    };

export function captureArticleSelection(
  document: ProseMirrorNode,
  selection: Selection,
  sourceRevision: number,
): ArticleSelectionResult {
  if (!(selection instanceof TextSelection)) {
    return { ok: false, reason: "not-text" };
  }

  if (selection.empty) {
    return { ok: false, reason: "empty" };
  }

  const originalText = document.textBetween(
    selection.from,
    selection.to,
    "\n",
    "\n",
  );
  if (!originalText.trim()) {
    return { ok: false, reason: "empty" };
  }

  if (originalText.length > MAX_AI_SELECTION_CHARACTERS) {
    return { ok: false, reason: "too-long" };
  }

  return {
    ok: true,
    selection: {
      documentVersion: ARTICLE_DOCUMENT_VERSION,
      sourceRevision,
      originalText,
      bookmark: {
        from: selection.from,
        to: selection.to,
        anchor: selection.anchor,
        head: selection.head,
      },
    },
  };
}
