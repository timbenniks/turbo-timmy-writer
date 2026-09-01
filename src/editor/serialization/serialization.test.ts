import { describe, expect, it } from "vitest";

import {
  articleDocumentSchema,
  normalizeArticleDocument,
  type ArticleDocument,
} from "@/editor/document";

import { articleDocumentToMarkdown } from "./markdown";
import { articleDocumentToPlainText } from "./plain-text";

const fixture: ArticleDocument = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "A useful heading" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Precise", marks: [{ type: "bold" }] },
        { type: "text", text: " writing with " },
        { type: "text", text: "code()", marks: [{ type: "code" }] },
        { type: "text", text: " and " },
        {
          type: "text",
          text: "a source",
          marks: [
            {
              type: "link",
              attrs: {
                href: "https://example.com/source",
                target: "_blank",
                rel: "noopener noreferrer nofollow",
                class: null,
              },
            },
          ],
        },
        { type: "text", text: "." },
      ],
    },
    {
      type: "blockquote",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Keep the evidence." }] }],
    },
    {
      type: "bulletList",
      content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "First point" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Second point" }] }] },
      ],
    },
    {
      type: "codeBlock",
      attrs: { language: "ts" },
      content: [{ type: "text", text: "const answer = `x*`;" }],
    },
    { type: "horizontalRule" },
    {
      type: "image",
      attrs: {
        src: "https://example.com/diagram.png",
        alt: "System diagram",
        title: "The system",
        width: null,
        height: null,
      },
    },
  ],
};

describe("article document boundary", () => {
  it("accepts the supported semantic document", () => {
    expect(articleDocumentSchema.safeParse(fixture).success).toBe(true);
  });

  it("rejects unsupported formatting and unsafe URLs", () => {
    expect(
      articleDocumentSchema.safeParse({
        type: "doc",
        content: [{ type: "heading", attrs: { level: 1 }, content: [] }],
      }).success,
    ).toBe(false);

    expect(
      articleDocumentSchema.safeParse({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "bad link",
                marks: [
                  {
                    type: "link",
                    attrs: { href: "javascript:alert(1)", target: null, rel: null, class: null },
                  },
                ],
              },
            ],
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("normalizes ProseMirror attribute maps to server-action-safe JSON", () => {
    const attrs = Object.assign(Object.create(null) as Record<string, unknown>, {
      level: 2,
    });
    const result = normalizeArticleDocument({
      type: "doc",
      content: [{ type: "heading", attrs, content: [{ type: "text", text: "Heading" }] }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.getPrototypeOf(result.data.content[0]?.attrs)).toBe(Object.prototype);
    }
  });
});

describe("article projections", () => {
  it("derives stable plain text", () => {
    expect(articleDocumentToPlainText(fixture)).toBe(
      [
        "A useful heading",
        "Precise writing with code() and a source.",
        "Keep the evidence.",
        "First point\nSecond point",
        "const answer = `x*`;",
        "System diagram",
      ].join("\n\n"),
    );
  });

  it("derives stable Markdown", () => {
    expect(articleDocumentToMarkdown(fixture)).toBe(
      [
        "## A useful heading",
        "**Precise** writing with `code()` and [a source](https://example.com/source).",
        "> Keep the evidence.",
        "- First point\n- Second point",
        "```ts\nconst answer = `x*`;\n```",
        "---",
        '![System diagram](https://example.com/diagram.png "The system")',
      ].join("\n\n"),
    );
  });
});
