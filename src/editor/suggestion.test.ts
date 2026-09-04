import { describe, expect, it } from "vitest";

import type { ArticleDocument } from "@/editor/document";
import { applyTextSuggestion, textAtBookmark } from "@/editor/suggestion";

const document: ArticleDocument = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "Alpha beta gamma." }] }],
};

describe("guarded suggestion application", () => {
  it("reads and replaces only the exact bookmarked passage", () => {
    expect(textAtBookmark(document, { from: 7, to: 11 })).toBe("beta");
    expect(applyTextSuggestion(document, { from: 7, to: 11 }, "beta", "clearer")).toEqual({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Alpha clearer gamma." }] }],
    });
  });

  it("refuses stale text and invalid positions", () => {
    expect(applyTextSuggestion(document, { from: 7, to: 11 }, "changed", "clearer")).toBeNull();
    expect(textAtBookmark(document, { from: 0, to: 100 })).toBeNull();
  });
});
