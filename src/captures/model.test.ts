import { describe, expect, it } from "vitest";

import { entryKindLabels, quickCaptureDocument, quickCaptureInputSchema, quickCaptureTitle } from "./model";

describe("quick capture", () => {
  it("creates canonical paragraph nodes without a second prose format", () => {
    expect(quickCaptureDocument("First thought.\n\nSecond thought.")).toEqual({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "First thought." }] },
        { type: "paragraph", content: [{ type: "text", text: "Second thought." }] },
      ],
    });
  });

  it("uses an explicit title or a bounded first-line fallback", () => {
    const input = quickCaptureInputSchema.parse({ kind: "fragment", title: "", body: "A sharp opening\nthat continues" });
    expect(quickCaptureTitle(input)).toBe("A sharp opening");
    expect(quickCaptureTitle({ ...input, title: "Chosen title" })).toBe("Chosen title");
  });

  it("rejects empty and oversized captures", () => {
    expect(quickCaptureInputSchema.safeParse({ kind: "idea", body: "" }).success).toBe(false);
    expect(quickCaptureInputSchema.safeParse({ kind: "idea", body: "x".repeat(20_001) }).success).toBe(false);
  });

  it("keeps inbox labels explicit", () => {
    expect(entryKindLabels).toEqual({ idea: "Idea", fragment: "Fragment", "research-note": "Research note" });
  });
});
