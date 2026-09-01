import type { ArticleDocument, ArticleMark, ArticleNode } from "@/editor/document";

function escapeMarkdownText(value: string) {
  return value.replace(/([\\`*_[\]])/g, "\\$1");
}

function codeSpan(value: string) {
  const longestRun = Math.max(0, ...Array.from(value.matchAll(/`+/g), (match) => match[0].length));
  const fence = "`".repeat(longestRun + 1);
  return `${fence}${value}${fence}`;
}

function linkHref(mark: ArticleMark) {
  return typeof mark.attrs?.href === "string" ? mark.attrs.href : "";
}

function serializeText(node: ArticleNode) {
  const marks = node.marks ?? [];
  const hasCode = marks.some((mark) => mark.type === "code");
  let value = hasCode ? codeSpan(node.text ?? "") : escapeMarkdownText(node.text ?? "");

  if (marks.some((mark) => mark.type === "bold")) {
    value = `**${value}**`;
  }
  if (marks.some((mark) => mark.type === "italic")) {
    value = `_${value}_`;
  }

  const link = marks.find((mark) => mark.type === "link");
  if (link) {
    value = `[${value}](${linkHref(link)})`;
  }

  return value;
}

function inlineMarkdown(node: ArticleNode): string {
  if (node.type === "text") {
    return serializeText(node);
  }
  return (node.content ?? []).map(inlineMarkdown).join("");
}

function codeFence(value: string) {
  const longestRun = Math.max(0, ...Array.from(value.matchAll(/`+/g), (match) => match[0].length));
  return "`".repeat(Math.max(3, longestRun + 1));
}

function listItemMarkdown(node: ArticleNode, marker: string, depth: number) {
  const [first, ...rest] = node.content ?? [];
  const indent = "  ".repeat(depth);
  const firstLine = first ? blockMarkdown(first, depth + 1) : "";
  const nested = rest
    .map((child) => blockMarkdown(child, depth + 1))
    .filter(Boolean)
    .map((value) => `${indent}  ${value.replaceAll("\n", `\n${indent}  `)}`)
    .join("\n");

  return `${indent}${marker} ${firstLine}${nested ? `\n${nested}` : ""}`;
}

function blockMarkdown(node: ArticleNode, depth = 0): string {
  switch (node.type) {
    case "paragraph":
      return inlineMarkdown(node);
    case "heading":
      return `${"#".repeat(Number(node.attrs?.level ?? 2))} ${inlineMarkdown(node)}`;
    case "blockquote":
      return (node.content ?? [])
        .map((child) => blockMarkdown(child, depth))
        .join("\n\n")
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    case "bulletList":
      return (node.content ?? [])
        .map((item) => listItemMarkdown(item, "-", depth))
        .join("\n");
    case "orderedList": {
      const start = typeof node.attrs?.start === "number" ? node.attrs.start : 1;
      return (node.content ?? [])
        .map((item, index) => listItemMarkdown(item, `${start + index}.`, depth))
        .join("\n");
    }
    case "listItem":
      return listItemMarkdown(node, "-", depth);
    case "codeBlock": {
      const value = (node.content ?? [])
        .map((child) => (child.type === "text" ? child.text ?? "" : ""))
        .join("");
      const fence = codeFence(value);
      const language = typeof node.attrs?.language === "string" ? node.attrs.language : "";
      return `${fence}${language}\n${value}\n${fence}`;
    }
    case "horizontalRule":
      return "---";
    case "image": {
      const alt = typeof node.attrs?.alt === "string" ? escapeMarkdownText(node.attrs.alt) : "";
      const source = typeof node.attrs?.src === "string" ? node.attrs.src : "";
      const title = typeof node.attrs?.title === "string" ? ` \"${node.attrs.title.replaceAll('"', '\\"')}\"` : "";
      return `![${alt}](${source}${title})`;
    }
    default:
      return inlineMarkdown(node);
  }
}

export function articleDocumentToMarkdown(document: ArticleDocument) {
  return document.content.map((node) => blockMarkdown(node)).join("\n\n").trim();
}
