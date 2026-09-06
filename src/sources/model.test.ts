import { describe, expect, it } from "vitest";

import {
  articleSourceDetailsSchema,
  createArticleSourceInputSchema,
  formatSourceCitation,
  sourceInputSchema,
} from "./model";

describe("source input", () => {
  it("normalizes an attributed web source and its article context", () => {
    expect(createArticleSourceInputSchema.parse({
      articleId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      source: {
        type: "webpage",
        title: "  Primary documentation  ",
        url: "https://example.com/docs",
        notes: "  Verify the release date.  ",
      },
      link: { quote: "  Exact supporting passage.  ", context: "  Section two  " },
    })).toMatchObject({
      source: {
        title: "Primary documentation",
        url: "https://example.com/docs",
        notes: "Verify the release date.",
      },
      link: { quote: "Exact supporting passage.", context: "Section two", position: 0 },
    });
  });

  it("rejects unsafe URLs and unbounded evidence", () => {
    expect(sourceInputSchema.safeParse({
      type: "webpage",
      title: "Unsafe",
      url: "javascript:alert(1)",
    }).success).toBe(false);
    expect(articleSourceDetailsSchema.safeParse({
      quote: "x".repeat(5_001),
    }).success).toBe(false);
  });

  it("allows a title-only offline source", () => {
    expect(sourceInputSchema.parse({ type: "book", title: "The Design of Everyday Things" }))
      .toEqual({ type: "book", title: "The Design of Everyday Things" });
  });

  it("formats an explicit copyable citation without editing prose", () => {
    expect(formatSourceCitation({
      title: "Primary documentation",
      url: "https://example.com/docs",
      quote: "Exact evidence.",
    })).toBe("“Exact evidence.”\n— Primary documentation — https://example.com/docs");
  });
});
