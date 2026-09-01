import { describe, expect, it } from "vitest";

import { articleDocumentSchema } from "../src/editor/document";
import { documentToPlainText, markdownToDocument } from "./import-writing.mjs";

describe("published writing import", () => {
  it("converts supported Markdown into a valid canonical editor document", () => {
    const markdown = [
      "# Opening",
      "",
      "A **bold** and _careful_ [claim](https://example.com).",
      "",
      "> Evidence matters.",
      "",
      "- First point",
      "- Second point",
      "",
      "```js",
      "console.log('safe');",
      "```",
      "",
      "![Diagram](/images/diagram.png)",
    ].join("\n");

    const document = markdownToDocument(markdown);

    expect(articleDocumentSchema.safeParse(document).success).toBe(true);
    expect(document.content[0]).toMatchObject({
      type: "heading",
      attrs: { level: 2 },
    });
    expect(documentToPlainText(document)).toContain("A bold and careful claim.");
    expect(documentToPlainText(document)).toContain("console.log('safe');");
    expect(documentToPlainText(document)).toContain("Diagram");
  });

  it("drops unsafe link behavior while preserving the linked words", () => {
    const document = markdownToDocument("[Keep these words](javascript:alert(1))");

    expect(articleDocumentSchema.safeParse(document).success).toBe(true);
    expect(documentToPlainText(document)).toBe("Keep these words");
    expect(document.content[0]?.content?.[0]?.marks).toBeUndefined();
  });
});
