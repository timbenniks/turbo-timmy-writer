import { describe, expect, it } from "vitest";

import { articleDocumentToPlainText } from "./plain-text";
import { generatedMarkdownToArticle } from "./markdown-to-document";

describe("generated Markdown conversion", () => {
  it("extracts the title and preserves supported semantic content", () => {
    const result = generatedMarkdownToArticle(`# A useful title

Opening with **specific evidence**.

## What changed

- One example
- Another *uncertainty*

> Keep the tension.`);

    expect(result.title).toBe("A useful title");
    expect(result.document.content[1]).toMatchObject({
      type: "heading",
      attrs: { level: 2 },
    });
    expect(articleDocumentToPlainText(result.document)).toContain(
      "Another uncertainty",
    );
  });

  it("requires one explicit title", () => {
    expect(() => generatedMarkdownToArticle("A titleless paragraph.")).toThrow(
      "must begin with one H1 title",
    );
  });
});
