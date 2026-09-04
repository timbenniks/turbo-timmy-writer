import Image from "@tiptap/extension-image";
import { getSchema } from "@tiptap/core";
import { EditorState } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";

import {
  normalizeArticleDocument,
  type ArticleDocument,
} from "@/editor/document";
import type { ArticleSelectionBookmark } from "@/editor/selection";

const articleSchema = getSchema([
  StarterKit.configure({
    heading: { levels: [2, 3] },
    strike: false,
    underline: false,
    hardBreak: false,
  }),
  Image.configure({ inline: false, allowBase64: false }),
]);

function parseDocument(document: ArticleDocument) {
  return articleSchema.nodeFromJSON(document);
}

export function textAtBookmark(
  document: ArticleDocument,
  bookmark: Pick<ArticleSelectionBookmark, "from" | "to">,
) {
  try {
    const node = parseDocument(document);
    if (bookmark.from < 1 || bookmark.to > node.content.size || bookmark.from >= bookmark.to) {
      return null;
    }
    return node.textBetween(bookmark.from, bookmark.to, "\n", "\n");
  } catch {
    return null;
  }
}
export function applyTextSuggestion(
  document: ArticleDocument,
  bookmark: Pick<ArticleSelectionBookmark, "from" | "to">,
  originalText: string,
  suggestedText: string,
) {
  try {
    const node = parseDocument(document);
    if (
      node.textBetween(bookmark.from, bookmark.to, "\n", "\n") !== originalText
    ) {
      return null;
    }
    const state = EditorState.create({ schema: articleSchema, doc: node });
    const next = state.tr.insertText(
      suggestedText,
      bookmark.from,
      bookmark.to,
    ).doc.toJSON();
    const normalized = normalizeArticleDocument(next);
    return normalized.success ? normalized.data : null;
  } catch {
    return null;
  }
}
