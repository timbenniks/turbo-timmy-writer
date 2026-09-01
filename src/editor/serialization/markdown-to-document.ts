import { fromMarkdown } from "mdast-util-from-markdown";

import {
  normalizeArticleDocument,
  type ArticleDocument,
  type ArticleMark,
  type ArticleNode,
} from "@/editor/document";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function childNodes(node: Record<string, unknown>) {
  return Array.isArray(node.children) ? node.children.filter(isRecord) : [];
}

function sourceSlice(source: string, node: Record<string, unknown>) {
  const position = isRecord(node.position) ? node.position : undefined;
  const start = position && isRecord(position.start) ? position.start.offset : undefined;
  const end = position && isRecord(position.end) ? position.end.offset : undefined;
  return typeof start === "number" && typeof end === "number"
    ? source.slice(start, end)
    : "";
}

function textNode(text: string, marks: ArticleMark[] = []): ArticleNode {
  return marks.length ? { type: "text", text, marks } : { type: "text", text };
}

function safeHref(value: unknown) {
  if (typeof value !== "string") return null;
  if (value.startsWith("/") || value.startsWith("#")) return value;
  try {
    return ["http:", "https:", "mailto:"].includes(new URL(value).protocol)
      ? value
      : null;
  } catch {
    return null;
  }
}

function inlineNodes(
  node: Record<string, unknown>,
  source: string,
  marks: ArticleMark[] = [],
): ArticleNode[] {
  switch (node.type) {
    case "text":
      return typeof node.value === "string" && node.value
        ? [textNode(node.value, marks)]
        : [];
    case "inlineCode":
      return typeof node.value === "string" && node.value
        ? [textNode(node.value, [...marks, { type: "code" }])]
        : [];
    case "strong":
      return childNodes(node).flatMap((child) =>
        inlineNodes(child, source, [...marks, { type: "bold" }]),
      );
    case "emphasis":
      return childNodes(node).flatMap((child) =>
        inlineNodes(child, source, [...marks, { type: "italic" }]),
      );
    case "link": {
      const href = safeHref(node.url);
      if (!href) return childNodes(node).flatMap((child) => inlineNodes(child, source, marks));
      return childNodes(node).flatMap((child) =>
        inlineNodes(child, source, [
          ...marks,
          {
            type: "link",
            attrs: { href, target: null, rel: null, class: null },
          },
        ]),
      );
    }
    case "break":
      return [textNode("\n", marks)];
    default: {
      const children = childNodes(node);
      if (children.length) {
        return children.flatMap((child) => inlineNodes(child, source, marks));
      }
      const fallback = sourceSlice(source, node);
      return fallback ? [textNode(fallback, marks)] : [];
    }
  }
}

function listNode(node: Record<string, unknown>, source: string): ArticleNode {
  return {
    type: node.ordered === true ? "orderedList" : "bulletList",
    ...(node.ordered === true
      ? { attrs: { start: typeof node.start === "number" ? node.start : 1 } }
      : {}),
    content: childNodes(node).map((item) => {
      const content: ArticleNode[] = [];
      for (const child of childNodes(item)) {
        if (child.type === "list") {
          content.push(listNode(child, source));
        } else if (child.type === "paragraph") {
          content.push({
            type: "paragraph",
            content: childNodes(child).flatMap((inline) => inlineNodes(inline, source)),
          });
        }
      }
      return {
        type: "listItem",
        content: content.length ? content : [{ type: "paragraph" }],
      };
    }),
  };
}

function blockNodes(node: Record<string, unknown>, source: string): ArticleNode[] {
  switch (node.type) {
    case "paragraph":
      return [{
        type: "paragraph",
        content: childNodes(node).flatMap((child) => inlineNodes(child, source)),
      }];
    case "heading":
      return [{
        type: "heading",
        attrs: { level: node.depth === 3 ? 3 : 2 },
        content: childNodes(node).flatMap((child) => inlineNodes(child, source)),
      }];
    case "blockquote": {
      const content = childNodes(node).flatMap((child) => blockNodes(child, source));
      return content.length ? [{ type: "blockquote", content }] : [];
    }
    case "list":
      return [listNode(node, source)];
    case "code": {
      const language =
        typeof node.lang === "string" && /^[A-Za-z0-9_+#.-]{1,40}$/.test(node.lang)
          ? node.lang
          : null;
      return [{
        type: "codeBlock",
        attrs: { language },
        content: typeof node.value === "string" && node.value
          ? [textNode(node.value)]
          : [],
      }];
    }
    case "thematicBreak":
      return [{ type: "horizontalRule" }];
    default: {
      const fallback = sourceSlice(source, node);
      return fallback ? [{ type: "paragraph", content: [textNode(fallback)] }] : [];
    }
  }
}

function nodeText(node: Record<string, unknown>): string {
  if (typeof node.value === "string") return node.value;
  return childNodes(node).map(nodeText).join("");
}

export function generatedMarkdownToArticle(markdown: string): {
  title: string;
  document: ArticleDocument;
} {
  const tree = fromMarkdown(markdown);
  const root = tree as unknown as Record<string, unknown>;
  const blocks = childNodes(root);
  const first = blocks[0];
  if (!first || first.type !== "heading" || first.depth !== 1) {
    throw new Error("The generated draft must begin with one H1 title.");
  }
  const title = nodeText(first).trim();
  if (!title || title.length > 300) {
    throw new Error("The generated draft title is invalid.");
  }

  const content = blocks.slice(1).flatMap((block) => blockNodes(block, markdown));
  const normalized = normalizeArticleDocument({
    type: "doc",
    content: content.length ? content : [{ type: "paragraph" }],
  });
  if (!normalized.success) throw new Error("The generated draft contains unsupported content.");
  return { title, document: normalized.data };
}
