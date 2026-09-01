import type { ArticleDocument, ArticleNode } from "@/editor/document";

function inlineText(node: ArticleNode): string {
  if (node.type === "text") {
    return node.text ?? "";
  }

  return (node.content ?? []).map(inlineText).join("");
}

function blockText(node: ArticleNode): string {
  switch (node.type) {
    case "paragraph":
    case "heading":
    case "codeBlock":
      return inlineText(node);
    case "image":
      return typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
    case "horizontalRule":
      return "";
    case "bulletList":
    case "orderedList":
      return (node.content ?? [])
        .map((item) => blockText(item))
        .filter(Boolean)
        .join("\n");
    case "listItem":
      return (node.content ?? []).map(blockText).filter(Boolean).join("\n");
    case "blockquote":
      return (node.content ?? []).map(blockText).filter(Boolean).join("\n\n");
    default:
      return inlineText(node);
  }
}

export function articleDocumentToPlainText(document: ArticleDocument) {
  return document.content.map(blockText).filter(Boolean).join("\n\n").trim();
}
