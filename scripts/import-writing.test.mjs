import { describe, expect, it } from "vitest";

import { articleDocumentSchema } from "../src/editor/document";
import {
  documentToPlainText,
  heroImageFromSource,
  markdownToDocument,
  planWritingReconcile,
  sourceFileSlug,
} from "./import-writing.mjs";

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

  it("derives a kebab slug from the filename when frontmatter omits it", () => {
    expect(sourceFileSlug("skills-over-mcp-explained.md")).toBe("skills-over-mcp-explained");
    expect(sourceFileSlug("skills-over-mcp-explained.md", "custom-slug")).toBe("custom-slug");
    expect(() => sourceFileSlug("We Have Spaces.md")).toThrow(/invalid slug/);
  });

  it("keeps only HTTP(S) hero images and uses the title as alt text", () => {
    expect(heroImageFromSource("https://res.example.com/hero.png", "A useful title")).toEqual({
      url: "https://res.example.com/hero.png",
      alt: "A useful title",
    });
    expect(heroImageFromSource("/images/hero.png", "A useful title")).toBeNull();
  });

  it("reconciles source files by slug or unique title without deleting extras", () => {
    const sources = [
      {
        title: "Plot twist! AI made developers more valuable.",
        slug: "ai-is-not-replacing-developers-it-is-exposing-everyone-else",
        status: "published",
        plainText: "Same body.",
        tags: [{ normalizedName: "ai-engineering", label: "ai-engineering" }],
        publishedAt: "2026-01-01T00:00:00.000Z",
        heroImage: { url: "https://res.example.com/a.png", alt: "Plot twist! AI made developers more valuable." },
      },
      {
        title: "Skills over MCP explained",
        slug: "skills-over-mcp-explained",
        status: "published",
        plainText: "New article.",
        tags: [{ normalizedName: "ai-engineering", label: "ai-engineering" }],
        publishedAt: "2026-09-07T00:00:00.000Z",
        heroImage: { url: "https://res.example.com/b.png", alt: "Skills over MCP explained" },
      },
    ];
    const plan = planWritingReconcile(sources, [
      {
        id: "existing",
        title: "Plot twist! AI made developers more valuable.",
        slug: "plot-twist-ai-is-making-devs-more-valuable",
        status: "published",
        plainText: "Same body.",
        tags: [{ normalizedName: "ai", label: "ai" }],
        publishedAt: "2026-01-01T00:00:00.000Z",
        metadata: { version: 1 },
        revision: 1,
      },
      {
        id: "local-note",
        title: "A local note",
        slug: "untitled-note",
        status: "idea",
        plainText: "Keep me.",
        tags: [],
        publishedAt: null,
        metadata: { version: 1 },
        revision: 1,
      },
    ]);

    expect(plan.remaps).toEqual([{
      from: "plot-twist-ai-is-making-devs-more-valuable",
      to: "ai-is-not-replacing-developers-it-is-exposing-everyone-else",
    }]);
    expect(plan.inserts.map((article) => article.slug)).toEqual(["skills-over-mcp-explained"]);
    expect(plan.updates[0]?.changes).toEqual(["slug", "tags", "hero"]);
    expect(plan.extras).toEqual([expect.objectContaining({ slug: "untitled-note" })]);
  });
});
