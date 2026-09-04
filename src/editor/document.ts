import { z } from "zod";

export const ARTICLE_DOCUMENT_VERSION = 1 as const;

export type ArticleMark = {
  type: "bold" | "italic" | "code" | "link";
  attrs?: Record<string, unknown>;
};

export type ArticleNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: ArticleNode[];
  marks?: ArticleMark[];
  text?: string;
};

export type ArticleDocument = ArticleNode & {
  type: "doc";
  content: ArticleNode[];
};

export const emptyArticleDocument: ArticleDocument = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

const MAX_DOCUMENT_DEPTH = 32;
const MAX_DOCUMENT_NODES = 10_000;
const MAX_TEXT_LENGTH = 1_000_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
) {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function isSafeLinkHref(value: unknown) {
  if (typeof value !== "string" || value.length > 2_048) {
    return false;
  }

  if (value.startsWith("/") || value.startsWith("#")) {
    return true;
  }

  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function isSafeImageSource(value: unknown) {
  if (typeof value !== "string" || value.length > 2_048) {
    return false;
  }

  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function isNullableString(value: unknown) {
  return value === null || typeof value === "string";
}

function isNullableDimension(value: unknown) {
  return (
    value === null ||
    (typeof value === "number" && Number.isFinite(value) && value > 0) ||
    (typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value))
  );
}

function isValidMark(value: unknown): value is ArticleMark {
  if (!isRecord(value) || typeof value.type !== "string") {
    return false;
  }

  if (value.type === "bold" || value.type === "italic" || value.type === "code") {
    return hasOnlyKeys(value, ["type"]);
  }

  if (value.type !== "link" || !hasOnlyKeys(value, ["type", "attrs"])) {
    return false;
  }

  if (!isRecord(value.attrs) || !hasOnlyKeys(value.attrs, ["href", "target", "rel", "class"])) {
    return false;
  }

  return (
    isSafeLinkHref(value.attrs.href) &&
    isNullableString(value.attrs.target) &&
    isNullableString(value.attrs.rel) &&
    isNullableString(value.attrs.class)
  );
}

function isValidTextNode(value: Record<string, unknown>) {
  return (
    hasOnlyKeys(value, ["type", "text", "marks"]) &&
    typeof value.text === "string" &&
    value.text.length <= MAX_TEXT_LENGTH &&
    (value.marks === undefined ||
      (Array.isArray(value.marks) && value.marks.every(isValidMark)))
  );
}

function isValidNode(
  value: unknown,
  depth: number,
  counter: { count: number },
): value is ArticleNode {
  if (!isRecord(value) || typeof value.type !== "string" || depth > MAX_DOCUMENT_DEPTH) {
    return false;
  }

  counter.count += 1;
  if (counter.count > MAX_DOCUMENT_NODES) {
    return false;
  }

  if (value.type === "text") {
    return isValidTextNode(value);
  }

  if (value.type === "horizontalRule") {
    return hasOnlyKeys(value, ["type"]);
  }

  if (value.type === "image") {
    if (!hasOnlyKeys(value, ["type", "attrs"]) || !isRecord(value.attrs)) {
      return false;
    }

    return (
      hasOnlyKeys(value.attrs, ["src", "alt", "title", "width", "height"]) &&
      isSafeImageSource(value.attrs.src) &&
      isNullableString(value.attrs.alt) &&
      isNullableString(value.attrs.title) &&
      isNullableDimension(value.attrs.width) &&
      isNullableDimension(value.attrs.height)
    );
  }

  if (!hasOnlyKeys(value, ["type", "attrs", "content"])) {
    return false;
  }

  const content = value.content;
  if (content !== undefined && !Array.isArray(content)) {
    return false;
  }

  const children = content ?? [];
  const validateChildren = (allowedTypes: readonly string[]) =>
    children.every(
      (child) =>
        isRecord(child) &&
        typeof child.type === "string" &&
        allowedTypes.includes(child.type) &&
        isValidNode(child, depth + 1, counter),
    );

  switch (value.type) {
    case "doc":
      return (
        value.attrs === undefined &&
        children.length > 0 &&
        validateChildren([
          "paragraph",
          "heading",
          "blockquote",
          "bulletList",
          "orderedList",
          "codeBlock",
          "horizontalRule",
          "image",
        ])
      );
    case "paragraph":
      return value.attrs === undefined && validateChildren(["text"]);
    case "heading":
      return (
        isRecord(value.attrs) &&
        hasOnlyKeys(value.attrs, ["level"]) &&
        (value.attrs.level === 2 || value.attrs.level === 3) &&
        validateChildren(["text"])
      );
    case "blockquote":
      return (
        value.attrs === undefined &&
        children.length > 0 &&
        validateChildren([
          "paragraph",
          "heading",
          "blockquote",
          "bulletList",
          "orderedList",
          "codeBlock",
          "horizontalRule",
          "image",
        ])
      );
    case "bulletList":
      return value.attrs === undefined && children.length > 0 && validateChildren(["listItem"]);
    case "orderedList":
      return (
        (value.attrs === undefined ||
          (isRecord(value.attrs) &&
            hasOnlyKeys(value.attrs, ["start"]) &&
            Number.isInteger(value.attrs.start) &&
            Number(value.attrs.start) > 0)) &&
        children.length > 0 &&
        validateChildren(["listItem"])
      );
    case "listItem":
      return (
        value.attrs === undefined &&
        children.length > 0 &&
        children[0] !== undefined &&
        isRecord(children[0]) &&
        children[0].type === "paragraph" &&
        validateChildren(["paragraph", "bulletList", "orderedList"])
      );
    case "codeBlock":
      return (
        (value.attrs === undefined ||
          (isRecord(value.attrs) &&
            hasOnlyKeys(value.attrs, ["language"]) &&
            (value.attrs.language === null ||
              (typeof value.attrs.language === "string" &&
                /^[A-Za-z0-9_+#.-]{0,40}$/.test(value.attrs.language))))) &&
        validateChildren(["text"])
      );
    default:
      return false;
  }
}

function isArticleDocument(value: unknown): value is ArticleDocument {
  const counter = { count: 0 };
  return isValidNode(value, 0, counter) && value.type === "doc";
}

export const articleDocumentSchema = z.custom<ArticleDocument>(isArticleDocument, {
  message: "The document contains unsupported or invalid editor content.",
});

export function normalizeArticleDocument(value: unknown) {
  try {
    return articleDocumentSchema.safeParse(JSON.parse(JSON.stringify(value)));
  } catch {
    return articleDocumentSchema.safeParse(null);
  }
}
